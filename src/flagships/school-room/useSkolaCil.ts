import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateSkolaCilData } from '@/core/utils/skolaCilValidation'

// ==========================================
// School Roomův studijní cíl (denní/týdenní minuty studia) — malý,
// samostatný store stejného tvaru jako Writer's Roomův
// useWriterRoomCil.ts, exportovaný přímo jako Zustand hook (žádný
// odvozený stav, žádný důvod pro druhou obalovou funkci). Cíl je
// measured v minutách z Pomodorovy skutečné historie soustředění
// (usePomodoro's sessionLog), ne vymyšlené číslo — viz skolaCilStats.ts.
// ==========================================

interface SkolaCilState {
  cilDenniMinut: number | null
  cilTydenniMinut: number | null
  setCilDenniMinut: (minut: number | null) => void
  setCilTydenniMinut: (minut: number | null) => void
}

export const useSkolaCil = create<SkolaCilState>()(
  persist(
    (set) => ({
      cilDenniMinut: null,
      cilTydenniMinut: null,
      setCilDenniMinut: (minut) => set({ cilDenniMinut: minut !== null && minut > 0 ? minut : null }),
      setCilTydenniMinut: (minut) => set({ cilTydenniMinut: minut !== null && minut > 0 ? minut : null }),
    }),
    {
      name: 'schoolbuddy-skola-cil-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateSkolaCilData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)
