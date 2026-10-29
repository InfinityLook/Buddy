import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateKalendarData } from '@/core/utils/kalendarValidation'
import {
  BarvaDne,
  BarvaDneZaznam,
  IcsNavrh,
  Udalost,
  UdajeUdalosti,
  barvyDniJakoRecord,
  posunDatumStr,
  udalostSeVyskytujeVDen,
} from './types'

const XP_ZA_UDALOST = 5

interface KalendarState {
  udalosti: Udalost[]
  // Pole záznamů barvy dne, ne Record — viz types.ts's vlastní komentář
  // u BarvaDneZaznam, proč je to vlastní pole se soft-delete, ne mapa.
  barvyDniZaznamy: BarvaDneZaznam[]
  pridatUdalost: (datum: string, udaje: UdajeUdalosti) => void
  /** Loose merge-by-id, stejný tvar jako updateKapitola/updatePanel
   *  jinde v appce — volající posílá jen pole, co se doopravdy
   *  mění. */
  upravitUdalost: (id: string, udaje: Partial<UdajeUdalosti>) => void
  smazatUdalost: (id: string) => void
  /** Přidá jedno konkrétní datum do vyjimky opakující se události —
   *  appka ho ukládá jako START toho jednoho přeskočeného výskytu, ne
   *  jako každý den jeho případného rozpětí (viz types.ts). Idempotentní
   *  — druhé zavolání na stejné datum nic nezmění. */
  vynechatVyskyt: (id: string, datumVyskytu: string) => void
  /** Hromadně založí nové události z .ics náhledu (NastaveniHry-styl
   *  "jeden set(), víc položek najednou", appka ale přesto odmění
   *  XP za každou zvlášť — stejná úvaha jako appčin šablonový
   *  pridatSablonu jinde v appce: import je reálný krok vpřed, ne
   *  způsob, jak získat víc nebo míň odměny za tu samou práci). */
  importovatUdalosti: (navrhy: IcsNavrh[]) => void
  /** null smaže barvu dne (návrat na "bez barvy"). */
  nastavBarvuDne: (datum: string, barva: BarvaDne | null) => void
}

/** Vrátí 'YYYY-MM-DD' z místního data (ne UTC — Date.toISOString() by
 *  po půlnoci ve špatném časovém pásmu posunulo den o jeden zpátky). */
export const naFormatDatumu = (rok: number, mesic: number, den: number): string =>
  `${rok}-${String(mesic + 1).padStart(2, '0')}-${String(den).padStart(2, '0')}`

const dnesniDatum = (): string => {
  const d = new Date()
  return naFormatDatumu(d.getFullYear(), d.getMonth(), d.getDate())
}

const novaUdalost = (datum: string, udaje: UdajeUdalosti, ted: number): Udalost => ({
  id: `${ted}-${Math.random().toString(36).slice(2, 7)}`,
  datum,
  nazev: udaje.nazev.trim(),
  popis: udaje.popis.trim(),
  createdAt: ted,
  opakovani: udaje.opakovani,
  celodenni: udaje.celodenni,
  casOd: udaje.celodenni ? undefined : udaje.casOd,
  casDo: udaje.celodenni ? undefined : udaje.casDo,
  datumDo: udaje.datumDo,
  vyjimky: [],
  pripominkaMinut: udaje.pripominkaMinut,
  updatedAt: ted,
  deletedAt: null,
})

// Exportovaný přímo — skolaSync.ts (cloudová synchronizace) potřebuje
// .getState()/.setState()/.subscribe() mimo React, stejný důvod jako
// Rozvrhovo useRozvrhStore.
export const useKalendarStore = create<KalendarState>()(
  persist(
    (set) => ({
      udalosti: [],
      barvyDniZaznamy: [],

      nastavBarvuDne: (datum, barva) =>
        set((state) => {
          const ted = Date.now()
          const existujici = state.barvyDniZaznamy.find((z) => z.id === datum)

          if (barva === null) {
            // Zpět na "bez barvy" — měkké smazání, ne fyzické odstranění,
            // ať appka umí zrcadlit i tohle "✕ bez barvy" na druhé zařízení.
            if (!existujici || existujici.deletedAt) return {}
            return {
              barvyDniZaznamy: state.barvyDniZaznamy.map((z) =>
                z.id === datum ? { ...z, deletedAt: ted, updatedAt: ted } : z
              ),
            }
          }

          if (existujici) {
            return {
              barvyDniZaznamy: state.barvyDniZaznamy.map((z) =>
                z.id === datum ? { ...z, barva, deletedAt: null, updatedAt: ted } : z
              ),
            }
          }

          const novy: BarvaDneZaznam = { id: datum, datum, barva, updatedAt: ted, deletedAt: null }
          return { barvyDniZaznamy: [...state.barvyDniZaznamy, novy] }
        }),

      pridatUdalost: (datum, udaje) => {
        if (!udaje.nazev.trim()) return

        const ted = Date.now()
        const nova = novaUdalost(datum, udaje, ted)

        set((state) => ({ udalosti: [...state.udalosti, nova] }))
        useGamificationStore.getState().recordAction('kalendar', XP_ZA_UDALOST)
      },

      upravitUdalost: (id, udaje) =>
        set((state) => {
          const ted = Date.now()
          return {
            udalosti: state.udalosti.map((u) => {
              if (u.id !== id) return u
              const scelene = { ...u, ...udaje, updatedAt: ted }
              // Vypnutí celodenní-ho necháváme casOd/casDo, zapnutí je
              // naopak vyprázdní — appka u celodenní události tahle
              // pole nikdy nečte, uložená by jen matla při pozdějším
              // exportu/kontrole.
              if (scelene.celodenni) {
                scelene.casOd = undefined
                scelene.casDo = undefined
              }
              return scelene
            }),
          }
        }),

      // Měkké smazání — appka událost nikdy fyzicky neodstraní z pole,
      // jen ji označí deletedAt (viz Udalost.deletedAt v types.ts).
      smazatUdalost: (id) =>
        set((state) => {
          const ted = Date.now()
          return { udalosti: state.udalosti.map((u) => (u.id === id ? { ...u, deletedAt: ted, updatedAt: ted } : u)) }
        }),

      vynechatVyskyt: (id, datumVyskytu) =>
        set((state) => {
          const ted = Date.now()
          return {
            udalosti: state.udalosti.map((u) => {
              if (u.id !== id || u.vyjimky.includes(datumVyskytu)) return u
              return { ...u, vyjimky: [...u.vyjimky, datumVyskytu], updatedAt: ted }
            }),
          }
        }),

      importovatUdalosti: (navrhy) => {
        if (navrhy.length === 0) return
        const ted = Date.now()
        const nove = navrhy.map((navrh, i) =>
          novaUdalost(
            navrh.datum,
            {
              nazev: navrh.nazev,
              popis: navrh.popis,
              opakovani: navrh.opakovani,
              celodenni: navrh.celodenni,
              casOd: navrh.casOd,
              casDo: navrh.casDo,
              datumDo: navrh.datumDo,
              pripominkaMinut: null,
            },
            ted + i
          )
        )
        // Výjimky z importovaného .ics appka přenese 1:1 — novaUdalost
        // výš je vždycky zakládá prázdné, protože ten samý "data bag"
        // appka používá i pro ruční "+ Přidat" formulář, co vyjimky
        // vůbec nenabízí.
        const noveSVyjimkami = nove.map((u, i) => ({ ...u, vyjimky: navrhy[i].vyjimky }))

        set((state) => ({ udalosti: [...state.udalosti, ...noveSVyjimkami] }))
        for (let i = 0; i < navrhy.length; i++) {
          useGamificationStore.getState().recordAction('kalendar', XP_ZA_UDALOST)
        }
      },
    }),
    {
      name: 'schoolbuddy-kalendar-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateKalendarData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)

/** Čistá pomocná funkce (žádný store, žádné React state) — kolik dní má
 *  daný měsíc a na jaký den v týdnu (0 = pondělí) padne jeho první den.
 *  Vytažené mimo hook, ať jde otestovat bez komponenty, stejný důvod
 *  jako combat/leveling.ts. */
export const rozlozeniMesice = (rok: number, mesic: number) => {
  const prvniDen = new Date(rok, mesic, 1).getDay()
  // JS getDay() vrací 0 = neděle — appka počítá týden od pondělí, proto
  // posun o jedno místo doleva s obtočením neděle na konec.
  const posunOdPondeli = prvniDen === 0 ? 6 : prvniDen - 1
  const pocetDni = new Date(rok, mesic + 1, 0).getDate()
  return { posunOdPondeli, pocetDni }
}

/** 7 datumových řetězců (Po–Ne) týdne, co obsahuje dané datum — stejný
 *  pondělí-first pořádek jako appčina Rozvrhova DNY_V_TYDNU a appčina
 *  vlastní rozlozeniMesice tady vedle. Čistá funkce, testovaná
 *  samostatně bez komponenty. */
export const tydenOd = (datumStr: string): string[] => {
  const [rok, mesic, den] = datumStr.split('-').map(Number)
  const d = new Date(rok, mesic - 1, den)
  const jsDen = d.getDay()
  const posunOdPondeli = jsDen === 0 ? 6 : jsDen - 1
  d.setDate(d.getDate() - posunOdPondeli)
  const vysledek: string[] = []
  for (let i = 0; i < 7; i++) {
    vysledek.push(naFormatDatumu(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setDate(d.getDate() + 1)
  }
  return vysledek
}

export const NAZVY_MESICU = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
]

/** Měsíc/Týden/Den — appka vždycky vedle sebe drží grid, co výchozí
 *  stránku kreslí, a stejný spodní "detail dne" panel (přidat/upravit/
 *  barva/rozvrh/Planer), co se jen přepne na aktuálně vybraný den.
 *  Žádná appka to nepersistuje — je to jen přechodná volba pohledu,
 *  ne data, stejně jako appčin vybraný rok/měsíc tady v hooku. */
export const POHLEDY_KALENDARE = ['mesic', 'tyden', 'den'] as const
export type PohledKalendare = (typeof POHLEDY_KALENDARE)[number]

export const NAZEV_POHLEDU: Record<PohledKalendare, string> = {
  mesic: 'Měsíc',
  tyden: 'Týden',
  den: 'Den',
}

export const useKalendar = () => {
  const {
    udalosti: vsechnyUdalosti,
    barvyDniZaznamy,
    pridatUdalost,
    upravitUdalost,
    smazatUdalost,
    vynechatVyskyt,
    importovatUdalosti,
    nastavBarvuDne,
  } = useKalendarStore()
  const dnes = useMemo(() => new Date(), [])
  const [rok, setRok] = useState(dnes.getFullYear())
  const [mesic, setMesic] = useState(dnes.getMonth())
  const [vybranyDen, setVybranyDen] = useState<string | null>(dnesniDatum())
  const [pohled, setPohled] = useState<PohledKalendare>('mesic')

  // Smazané události/barvy dní appka drží v úložišti dál (viz
  // Udalost.deletedAt/BarvaDneZaznam.deletedAt) jen kvůli synchronizaci
  // mezi zařízeními — kdokoli appku volá jako dřív je nikdy nesmí vidět.
  const udalosti = useMemo(() => vsechnyUdalosti.filter((u) => !u.deletedAt), [vsechnyUdalosti])
  const barvyDni = useMemo(() => barvyDniJakoRecord(barvyDniZaznamy), [barvyDniZaznamy])

  const jitMesicem = (smer: -1 | 1) => {
    setVybranyDen(null)
    const novy = new Date(rok, mesic + smer, 1)
    setRok(novy.getFullYear())
    setMesic(novy.getMonth())
  }

  // Den/Týden pohled potřebuje vždycky NĘJAKÝ konkrétní vybraný den,
  // na rozdíl od Měsíce (ten po přepnutí měsíce schválně žádný
  // nevybírá) — appka proto padá zpátky na dnešek, ne že by UI musela
  // řešit null zvlášť v obou pohledech.
  const efektivniDen = vybranyDen ?? dnesniDatum()

  const jitTydnem = (smer: -1 | 1) => setVybranyDen(posunDatumStr(efektivniDen, smer * 7))
  const jitDnem = (smer: -1 | 1) => setVybranyDen(posunDatumStr(efektivniDen, smer))

  const tydenAktualni = useMemo(() => tydenOd(efektivniDen), [efektivniDen])

  // Množina dní ZOBRAZOVANÉHO měsíce s alespoň jedním výskytem události
  // (jednorázové i opakující se) — appka ji počítá jen pro dny, co grid
  // vůbec vykresluje (rok/mesic), ne pro celou historii/budoucnost, což
  // by u opakující se události ani nešlo (nekonečně mnoho výskytů).
  const dnySUdalosti = useMemo(() => {
    const mnozina = new Set<string>()
    const { pocetDni } = rozlozeniMesice(rok, mesic)
    for (let den = 1; den <= pocetDni; den++) {
      const datumStr = naFormatDatumu(rok, mesic, den)
      if (udalosti.some((u) => udalostSeVyskytujeVDen(u, datumStr))) mnozina.add(datumStr)
    }
    return mnozina
  }, [udalosti, rok, mesic])

  // Stejná množina, ale jen pro dny ZOBRAZOVANÉHO týdne — appčin Týden
  // pohled potřebuje vědět, které z jeho sedmi dní mají co ukázat, bez
  // ohledu na to, jaký měsíc/měsíce se k sobě ten týden kolem přelomu
  // měsíce zrovna sčítají.
  const dnySUdalostiTyden = useMemo(() => {
    const mnozina = new Set<string>()
    for (const datumStr of tydenAktualni) {
      if (udalosti.some((u) => udalostSeVyskytujeVDen(u, datumStr))) mnozina.add(datumStr)
    }
    return mnozina
  }, [udalosti, tydenAktualni])

  const udalostiDne = useMemo(
    () =>
      vybranyDen
        ? udalosti.filter((u) => udalostSeVyskytujeVDen(u, vybranyDen)).sort((a, b) => a.createdAt - b.createdAt)
        : [],
    [udalosti, vybranyDen]
  )

  return {
    rok,
    mesic,
    dnes,
    vybranyDen,
    setVybranyDen,
    jitMesicem,
    pohled,
    setPohled,
    jitTydnem,
    jitDnem,
    tydenAktualni,
    dnySUdalosti,
    dnySUdalostiTyden,
    udalostiDne,
    // Syrové pole — School Roomovo "Moje přehled" z něj počítá
    // nadcházející události vlastním, pravidelně obnovovaným "teď"
    // (viz CLAUDE.md), ne appčiným dnes tady, co se počítá jen jednou
    // při prvním vykreslení a School Room se dlouho neodmountuje.
    udalosti,
    barvyDni,
    nastavBarvuDne,
    pocetUdalostiCelkem: udalosti.length,
    pridatUdalost,
    upravitUdalost,
    smazatUdalost,
    vynechatVyskyt,
    importovatUdalosti,
  }
}
