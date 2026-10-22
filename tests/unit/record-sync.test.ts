import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccount } from '@/core/supabase/auth'
import { vytvorZaznamovySync, type SoftDeletable, type TabulkaSync } from '@/core/supabase/recordSync'

// ==========================================
// Regresní test na opravu "ztráta změn při synchronizaci" (audit bod #1).
//
// `syncOneTable` kdysi zachytilo místní seznam záznamů JEDNOU, na
// začátku funkce, před dvěma awaity (odeslání, pak stažení) — a tu
// samou zmrazenou kopii pak použilo i v závěrečném mergi. Jakákoli
// místní úprava, co se stihla mezi začátkem funkce a mergem (přidání
// úkolu, smazání cíle...), v mergi zmizela, protože o ní nevěděl.
//
// Tenhle test simuluje přesně tenhle běh: zablokuje odpověď na druhé
// (stahovací) síťové volání, mezitím — zatím co appka "čeká na síť" —
// přidá nový místní záznam, a teprve pak odpověď pustí. Čerstvě opravený
// kód musí ten nový záznam po dokončení synchronizace vidět; starý kód
// (zmrazená kopie) by ho ztratil.
// ==========================================

interface TestRecord extends SoftDeletable {
  nazev: string
}

const synchronizacniBrana = vi.hoisted(() => {
  let uvolnit: (() => void) | null = null
  let cekani: Promise<void> = Promise.resolve()
  return {
    pripravCekani() {
      cekani = new Promise<void>((resolve) => {
        uvolnit = resolve
      })
    },
    pockejNaUvolneni() {
      return cekani
    },
    uvolni() {
      uvolnit?.()
    },
  }
})

const upsertVolani = vi.hoisted(() => ({ pocet: 0 }))
// Nastaví se SYNCHRONNĚ v okamžiku, kdy `gt()` skutečně začne čekat na
// bránu — test na tohle čeká, místo aby hádal, kolik mikroúkolů (ticků)
// uplyne mezi zavoláním `syncNow()` a chvílí, kdy se kód uvnitř
// `syncOneTable` skutečně dostane až k zablokovanému stahovacímu dotazu.
const gtZavolano = vi.hoisted(() => ({ pocet: 0 }))

vi.mock('@/core/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (_table: string) => ({
      upsert: async (_rows: unknown[], _opts: unknown) => {
        upsertVolani.pocet += 1
        return { error: null }
      },
      select: () => ({
        eq: () => ({
          gt: async () => {
            // Tohle je ten "čeká se na síť" okamžik, co appka v produkci
            // zažívá při reálném stahovacím dotazu — test ho zablokuje,
            // ať může mezitím proběhnout místní úprava.
            gtZavolano.pocet += 1
            await synchronizacniBrana.pockejNaUvolneni()
            // Musí vrátit NEPRÁZDNÁ data — jinak `stazene.length > 0`
            // nikdy neplatí a merge větev (ta jediná, kde se bug vůbec
            // projevuje) se nikdy nespustí, takže by test "prošel" i nad
            // nefixnutým kódem.
            return { data: [{ id: 'z-cloudu', user_id: 'tester', nazev: 'Stažený záznam' }], error: null }
          },
        }),
      }),
    }),
  },
}))

describe('recordSync — oprava ztráty změn při synchronizaci', () => {
  let mistniZaznamy: TestRecord[]
  let posluchaci: Array<() => void>

  beforeEach(() => {
    mistniZaznamy = [{ id: 'puvodni', updatedAt: 1000, deletedAt: null, nazev: 'Původní záznam' }]
    posluchaci = []
    upsertVolani.pocet = 0
    gtZavolano.pocet = 0
    synchronizacniBrana.pripravCekani()
    localStorage.removeItem('test-record-sync-cursor')
    useAccount.setState({ status: 'signed-in', userId: 'tester', email: null })
  })

  afterEach(() => {
    useAccount.setState({ status: 'anonymous', userId: null, email: null })
    localStorage.removeItem('test-record-sync-cursor')
  })

  const vytvorControlller = () => {
    const cfg: TabulkaSync<TestRecord> = {
      table: 'test_zaznamy',
      getLocal: () => mistniZaznamy,
      setLocal: (items) => {
        mistniZaznamy = items
      },
      toRow: (userId, item) => ({ id: item.id, user_id: userId, nazev: item.nazev }),
      fromRow: (r) => ({ id: r.id, nazev: r.nazev, updatedAt: 0, deletedAt: null }),
    }
    return vytvorZaznamovySync(
      'test-record-sync-cursor',
      () => [cfg],
      (posluchac) => posluchaci.push(posluchac)
    )
  }

  it('zachová místní úpravu, co proběhne BĚHEM průchodu, ne jen před ním', async () => {
    const controller = vytvorControlller()

    const hotovo = controller.syncNow()

    // Appka je teď "v letu" — čeká na zablokovaný stahovací dotaz. Místo
    // odhadu, kolik mikroúkolů (ticků) k tomu stačí, test čeká přímo na
    // signál, že `gt()` byl skutečně zavolán (a je uvnitř zablokovaný).
    while (gtZavolano.pocet === 0) await Promise.resolve()

    // Přesně v téhle chvíli appka v produkci udělá místní úpravu
    // (uživatel přidá úkol, smaže cíl...), zatímco se ještě čeká na síť.
    //
    // Záměrně NOVÉ pole přes spread, ne `.push()` — appčiny Zustand
    // storu samy takhle (immutable) zapisují (`set({ tasks: [...state.
    // tasks, novy] })`), takže `getLocal()` po téhle úpravě vrátí jinou
    // referenci pole, ne ten samý, mutovaný objekt. `.push()` by mutoval
    // pole NA MÍSTĚ — a protože `cfg.getLocal` v tomhle testu vrací
    // přímo referenci na `mistniZaznamy`, i zmrazená kopie zachycená
    // před awaity by na stejný mutovaný objekt ukazovala, a bug by se
    // vůbec neprojevil.
    mistniZaznamy = [
      ...mistniZaznamy,
      { id: 'behem-synchronizace', updatedAt: 2000, deletedAt: null, nazev: 'Přidáno během syncu' },
    ]

    synchronizacniBrana.uvolni()
    await hotovo

    expect(mistniZaznamy.some((z) => z.id === 'behem-synchronizace')).toBe(true)
    expect(mistniZaznamy.some((z) => z.id === 'puvodni')).toBe(true)
  })

  it('pošle i záznam vzniklý PŘED spuštěním synchronizace', async () => {
    const controller = vytvorControlller()
    // Tenhle test neřeší časování stahování, jen že se odeslání vůbec
    // stalo — brána se proto pustí hned, ať na ni `gt()` nečeká zbytečně.
    synchronizacniBrana.uvolni()
    await controller.syncNow()

    expect(upsertVolani.pocet).toBe(1)
  })
})
