import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateKalendarData } from '@/core/utils/kalendarValidation'
import { Udalost } from './types'

const XP_ZA_UDALOST = 5

interface KalendarState {
  udalosti: Udalost[]
  pridatUdalost: (datum: string, nazev: string, popis: string) => void
  smazatUdalost: (id: string) => void
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

      pridatUdalost: (datum, nazev, popis) => {
        if (!nazev.trim()) return

        const nova: Udalost = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          datum,
          nazev: nazev.trim(),
          popis: popis.trim(),
          createdAt: Date.now(),
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
  const { udalosti, pridatUdalost, smazatUdalost } = useKalendarStore()
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

  // Množina dní s alespoň jednou událostí — konstantní vyhledání ve
  // vykreslování mřížky místo .some() přes celé pole na každou buňku.
  const dnySUdalosti = useMemo(() => new Set(udalosti.map((u) => u.datum)), [udalosti])

  const udalostiDne = useMemo(
    () => (vybranyDen ? udalosti.filter((u) => u.datum === vybranyDen).sort((a, b) => a.createdAt - b.createdAt) : []),
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
    pocetUdalostiCelkem: udalosti.length,
    pridatUdalost,
    smazatUdalost,
  }
}
