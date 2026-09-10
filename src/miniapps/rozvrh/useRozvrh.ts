import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateRozvrhData } from '@/core/utils/rozvrhValidation'
import { DenVTydnu, HodinaRozvrhu, klicDochazky, serazenoPodleCasu } from './types'

const XP_ZA_HODINU = 5

interface RozvrhState {
  hodiny: HodinaRozvrhu[]
  dochazka: Record<string, boolean>
  pridatHodinu: (
    den: DenVTydnu,
    casOd: string,
    casDo: string,
    predmet: string,
    mistnost: string,
    vyucujici: string
  ) => void
  updateHodinu: (id: string, patch: Partial<Omit<HodinaRozvrhu, 'id'>>) => void
  smazatHodinu: (id: string) => void
  /** null smaže záznam docházky (návrat na "nezaznamenáno"). */
  oznacitDochazku: (hodinaId: string, datum: string, byl: boolean | null) => void
}

const useRozvrhStore = create<RozvrhState>()(
  persist(
    (set) => ({
      hodiny: [],
      dochazka: {},

      pridatHodinu: (den, casOd, casDo, predmet, mistnost, vyucujici) => {
        if (!predmet.trim()) return

        const nova: HodinaRozvrhu = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          den,
          casOd,
          casDo,
          predmet: predmet.trim(),
          mistnost: mistnost.trim(),
          vyucujici: vyucujici.trim(),
        }

        set((state) => ({ hodiny: [...state.hodiny, nova] }))
        useGamificationStore.getState().recordAction('rozvrh', XP_ZA_HODINU)
      },

      updateHodinu: (id, patch) =>
        set((state) => ({
          hodiny: state.hodiny.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        })),

      smazatHodinu: (id) =>
        set((state) => {
          // Smazaná hodina strhne s sebou i svoje záznamy docházky —
          // klíč (klicDochazky) na neexistující hodinu už nikdy nesedí.
          const dochazka = Object.fromEntries(
            Object.entries(state.dochazka).filter(([klic]) => !klic.startsWith(`${id}::`))
          )
          return { hodiny: state.hodiny.filter((h) => h.id !== id), dochazka }
        }),

      oznacitDochazku: (hodinaId, datum, byl) =>
        set((state) => {
          const klic = klicDochazky(hodinaId, datum)
          const dochazka = { ...state.dochazka }
          if (byl === null) delete dochazka[klic]
          else dochazka[klic] = byl
          return { dochazka }
        }),
    }),
    {
      name: 'schoolbuddy-rozvrh-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateRozvrhData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)

export const useRozvrh = () => {
  const { hodiny, dochazka, pridatHodinu, updateHodinu, smazatHodinu, oznacitDochazku } =
    useRozvrhStore()

  return {
    hodiny: serazenoPodleCasu(hodiny),
    dochazka,
    pridatHodinu,
    updateHodinu,
    smazatHodinu,
    oznacitDochazku,
  }
}
