import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { Sezeni } from './types'

// ==========================================
// Historie odcvičených sezení. Samotný běžící přenos z kamery je
// perzistovat zbytečné (a nechtěné) — ukládá se jen výsledek: kolik
// opakování a kdy, stejně jako Pomodoro ukládá dokončené bloky,
// ne rozeběhnutý časovač.
// ==========================================

// XP roste s počtem opakování, ale s víčkem — jinak by šlo body sbírat
// donekonečna tím, že se cvičící postaví před kameru a nechá si počítat
// falešná opakování hodinu v kuse.
const XP_ZA_OPAKOVANI = 1
const XP_STROP = 30

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

interface FormCheckState {
  sezeni: Sezeni[]
  ulozitSezeni: (pocetOpakovani: number, trvaniSekund: number) => void
}

const useFormCheckStore = create<FormCheckState>()(
  persist(
    (set) => ({
      sezeni: [],

      ulozitSezeni: (pocetOpakovani, trvaniSekund) => {
        if (pocetOpakovani <= 0) return

        set((state) => ({
          sezeni: [
            ...state.sezeni,
            { id: noveId(), cvik: 'dřep', pocetOpakovani, trvaniSekund, createdAt: new Date().toISOString() },
          ],
        }))

        // recordAction, ne bare addXp — počítadlo dokončených sezení
        // a XP se tak nemůžou rozejít, stejně jako u ostatních miniapek.
        useGamificationStore
          .getState()
          .recordAction('workout', Math.min(XP_STROP, pocetOpakovani * XP_ZA_OPAKOVANI))
      },
    }),
    {
      name: 'schoolbuddy-form-check-storage',
      storage: createJSONStorage(() => secureStorage),
      merge: (persisted, current) => {
        const saved = persisted as Partial<FormCheckState> | undefined
        const sezeni = Array.isArray(saved?.sezeni)
          ? saved.sezeni.filter(
              (s): s is Sezeni =>
                !!s && typeof s.id === 'string' && typeof s.pocetOpakovani === 'number'
            )
          : []
        return { ...current, ...saved, sezeni }
      },
    }
  )
)

export const useFormCheck = () => {
  const { sezeni, ulozitSezeni } = useFormCheckStore()

  const celkemOpakovani = sezeni.reduce((s, z) => s + z.pocetOpakovani, 0)
  const nejlepsiSezeni = sezeni.reduce((max, z) => Math.max(max, z.pocetOpakovani), 0)

  return {
    sezeni: [...sezeni].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    pocetSezeni: sezeni.length,
    celkemOpakovani,
    nejlepsiSezeni,
    ulozitSezeni,
  }
}
