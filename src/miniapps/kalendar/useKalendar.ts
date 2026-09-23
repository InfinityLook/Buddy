import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateKalendarData } from '@/core/utils/kalendarValidation'
import { BarvaDne, Opakovani, Udalost, udalostSeVyskytujeVDen } from './types'

const XP_ZA_UDALOST = 5

interface KalendarState {
  udalosti: Udalost[]
  // Datum -> barva, nezávisle na tom, jestli má den událost — viz
  // types.ts's vlastní komentář u BARVY_DNE, proč je to vlastní mapa,
  // ne pole na Udalost.
  barvyDni: Record<string, BarvaDne>
  pridatUdalost: (datum: string, nazev: string, popis: string, opakovani: Opakovani) => void
  smazatUdalost: (id: string) => void
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

const useKalendarStore = create<KalendarState>()(
  persist(
    (set) => ({
      udalosti: [],
      barvyDni: {},

      nastavBarvuDne: (datum, barva) =>
        set((state) => {
          const barvyDni = { ...state.barvyDni }
          if (barva === null) delete barvyDni[datum]
          else barvyDni[datum] = barva
          return { barvyDni }
        }),

      pridatUdalost: (datum, nazev, popis, opakovani) => {
        if (!nazev.trim()) return

        const nova: Udalost = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          datum,
          nazev: nazev.trim(),
          popis: popis.trim(),
          createdAt: Date.now(),
          opakovani,
        }

        set((state) => ({ udalosti: [...state.udalosti, nova] }))
        useGamificationStore.getState().recordAction('kalendar', XP_ZA_UDALOST)
      },

      smazatUdalost: (id) =>
        set((state) => ({ udalosti: state.udalosti.filter((u) => u.id !== id) })),
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

export const NAZVY_MESICU = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
]

export const useKalendar = () => {
  const { udalosti, barvyDni, pridatUdalost, smazatUdalost, nastavBarvuDne } = useKalendarStore()
  const dnes = useMemo(() => new Date(), [])
  const [rok, setRok] = useState(dnes.getFullYear())
  const [mesic, setMesic] = useState(dnes.getMonth())
  const [vybranyDen, setVybranyDen] = useState<string | null>(dnesniDatum())

  const jitMesicem = (smer: -1 | 1) => {
    setVybranyDen(null)
    const novy = new Date(rok, mesic + smer, 1)
    setRok(novy.getFullYear())
    setMesic(novy.getMonth())
  }

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
    dnySUdalosti,
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
    smazatUdalost,
  }
}
