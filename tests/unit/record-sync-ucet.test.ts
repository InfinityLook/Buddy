import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccount } from '@/core/supabase/auth'
import { vytvorZaznamovySync, type SoftDeletable, type TabulkaSync } from '@/core/supabase/recordSync'

// ==========================================
// Regresní test na opravu "únik dat mezi účty při přepnutí účtu na
// jednom zařízení" (audit #2+#3) — jiný problém než #1
// (record-sync.test.ts): tam appka ztrácela ČERSTVOU úpravu uvnitř
// jednoho průchodu, tady appka slučovala/odesílala zbylá lokální data
// PŘEDCHOZÍHO účtu pod NOVĚ přihlášeným účtem, protože se při
// odhlášení schválně nemažou (auth.ts).
//
// Scénář: sdílené zařízení (rodinný tablet), dva skutečné účty se na
// něm vystřídají. Bez opravy appka pokaždé sloučí/odešle zbylá
// lokální data účtu A pod user_id účtu B — reálný únik dat, ne jen
// teoretický risk.
// ==========================================

interface TestRecord extends SoftDeletable {
  nazev: string
}

const upsertVolani = vi.hoisted(() => ({ radky: [] as Record<string, unknown>[] }))
const stazenaData = vi.hoisted(() => ({ radky: [] as Record<string, unknown>[] }))

vi.mock('@/core/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (_table: string) => ({
      upsert: async (rows: Record<string, unknown>[], _opts: unknown) => {
        upsertVolani.radky.push(...rows)
        return { error: null }
      },
      select: () => ({
        eq: () => ({
          gt: async () => ({ data: stazenaData.radky, error: null }),
        }),
      }),
    }),
  },
}))

describe('recordSync — reset místních dat při přepnutí na jiný účet', () => {
  let mistniZaznamy: TestRecord[]
  let posluchaci: Array<() => void>
  const CURSOR_KEY = 'test-ucet-sync-cursor'
  const UCET_KLIC = `${CURSOR_KEY}-ucet`

  beforeEach(() => {
    mistniZaznamy = []
    posluchaci = []
    upsertVolani.radky = []
    stazenaData.radky = []
    localStorage.removeItem(CURSOR_KEY)
    localStorage.removeItem(UCET_KLIC)
    useAccount.setState({ status: 'signed-in', userId: 'ucet-a', email: null })
  })

  afterEach(() => {
    useAccount.setState({ status: 'anonymous', userId: null, email: null })
    localStorage.removeItem(CURSOR_KEY)
    localStorage.removeItem(UCET_KLIC)
  })

  const vytvorController = () => {
    const cfg: TabulkaSync<TestRecord> = {
      table: 'test_zaznamy',
      getLocal: () => mistniZaznamy,
      setLocal: (items) => {
        mistniZaznamy = items
      },
      toRow: (userId, item) => ({ id: item.id, user_id: userId, nazev: item.nazev }),
      fromRow: (r) => ({ id: r.id, nazev: r.nazev, updatedAt: 0, deletedAt: null }),
    }
    return vytvorZaznamovySync(CURSOR_KEY, () => [cfg], (posluchac) => posluchaci.push(posluchac))
  }

  it('na čerstvém zařízení (žádný zaznamenaný vlastník) se místní data NEzahodí', async () => {
    mistniZaznamy = [
      { id: 'offline-pred-prihlasenim', updatedAt: 1000, deletedAt: null, nazev: 'Offline záznam' },
    ]
    const controller = vytvorController()
    await controller.syncNow()

    // Appka tohle sloučila s cloudem (první sync na zařízení), ne
    // zahodila jako cizí — žádný dřívější vlastník nebyl zaznamenaný.
    expect(mistniZaznamy.some((z) => z.id === 'offline-pred-prihlasenim')).toBe(true)
    expect(upsertVolani.radky.some((r) => r.id === 'offline-pred-prihlasenim')).toBe(true)
    expect(localStorage.getItem(UCET_KLIC)).toBe('ucet-a')
  })

  it('přepnutí na jiný skutečný účet vyprázdní místní tabulku PŘED synchronizací', async () => {
    const controller = vytvorController()

    // Účet A: normální sync, data skutečně patří A.
    mistniZaznamy = [{ id: 'ucet-a-zaznam', updatedAt: 1000, deletedAt: null, nazev: 'Áčkův záznam' }]
    await controller.syncNow()
    expect(localStorage.getItem(UCET_KLIC)).toBe('ucet-a')
    upsertVolani.radky = [] // vyčistit, ať druhý průchod sleduje jen sám sebe

    // Na tom samém zařízení se teď přihlásí JINÝ skutečný účet — appka
    // v produkci tenhle přechod pozná přes useAccount.subscribe
    // (recordSync.ts's vlastní start()), tady to simulujeme přímo
    // zavoláním syncNow() se změněnou identitou.
    useAccount.setState({ status: 'signed-in', userId: 'ucet-b', email: null })
    stazenaData.radky = [{ id: 'ucet-b-cloud', user_id: 'ucet-b', nazev: 'Bčkův cloudový záznam' }]

    await controller.syncNow()

    // Áčkova lokální data se NESMĚLA odeslat pod B's user_id.
    expect(upsertVolani.radky.some((r) => r.id === 'ucet-a-zaznam')).toBe(false)
    // A nesmí zůstat ani ve výsledném sloučeném místním stavu.
    expect(mistniZaznamy.some((z) => z.id === 'ucet-a-zaznam')).toBe(false)
    // Bčkovo reálné cloudové záznam se správně stáhlo.
    expect(mistniZaznamy.some((z) => z.id === 'ucet-b-cloud')).toBe(true)
    expect(localStorage.getItem(UCET_KLIC)).toBe('ucet-b')
  })

  it('čerstvá, ještě neodeslaná úprava účtu A se NEODEŠLE pod user_id účtu B', async () => {
    // Tohle je ostřejší verze předchozího testu: `ucet-a-zaznam` tam má
    // updatedAt daleko v minulosti, takže by appka i BEZ opravy
    // nepropustila kolem `syncOneTable`'s filtru (`updatedAt > kurzor`,
    // kurzor je čerstvý Date.now() z vlastního posledního syncu A) — ten
    // test tedy dokazuje jen slabší symptom (zbylá stará data VIDITELNÁ
    // v mergnutém stavu B), ne tu skutečně nebezpečnou cestu.
    //
    // Tady appka simuluje přesně tu cestu: A si stihne upravit záznam
    // (nebo založit nový) PO svém posledním úspěšném syncu a TĚSNĚ PŘED
    // přepnutím účtu — accountu B's debounced push (schedulePush, 3s)
    // appku ještě nestihl odeslat. Tahle úprava má updatedAt NOVĚJŠÍ než
    // A's vlastní kurzor, takže by bez opravy prošla syncOneTable's
    // filtrem a odeslala se na server s B's user_id (toRow) — reálné
    // odcizení dat jednoho účtu druhému, ne jen jejich viditelnost.
    const controller = vytvorController()

    mistniZaznamy = [{ id: 'puvodni-a', updatedAt: 1000, deletedAt: null, nazev: 'Starý Áčkův záznam' }]
    await controller.syncNow()
    upsertVolani.radky = []
    const kurzorPoPrvnimSyncu = Number(localStorage.getItem(CURSOR_KEY) ?? 0)

    // A ještě těsně před přepnutím přidá/upraví záznam — updatedAt je o
    // pár vteřin NOVĚJŠÍ než kurzor zapsaný výše (modeluje reálnou
    // "appka ještě nestihla doběhnout 3s debounced push" situaci, ne
    // spoléhání na skutečný běh hodin v rychlé testovací smyčce, kde by
    // dvě Date.now() volání mohla padnout do stejné milisekundy a tenhle
    // test by pak nic neprokázal).
    mistniZaznamy = [
      ...mistniZaznamy,
      {
        id: 'cerstva-neodeslana-uprava-a',
        updatedAt: kurzorPoPrvnimSyncu + 5000,
        deletedAt: null,
        nazev: 'Nová rozepsaná věc',
      },
    ]

    useAccount.setState({ status: 'signed-in', userId: 'ucet-b', email: null })
    stazenaData.radky = []

    await controller.syncNow()

    expect(upsertVolani.radky.some((r) => r.id === 'cerstva-neodeslana-uprava-a')).toBe(false)
    expect(mistniZaznamy.some((z) => z.id === 'cerstva-neodeslana-uprava-a')).toBe(false)
  })

  it('opětovné přihlášení TOHO SAMÉHO účtu žádný reset nespustí', async () => {
    const controller = vytvorController()
    mistniZaznamy = [{ id: 'trvaly-zaznam', updatedAt: 1000, deletedAt: null, nazev: 'Trvalý záznam' }]
    await controller.syncNow()

    // "Odhlášení" a opětovné přihlášení toho samého účtu (žádná reálná
    // změna identity) nesmí nic vyprázdnit.
    useAccount.setState({ status: 'signed-in', userId: 'ucet-a', email: null })
    await controller.syncNow()

    expect(mistniZaznamy.some((z) => z.id === 'trvaly-zaznam')).toBe(true)
  })
})
