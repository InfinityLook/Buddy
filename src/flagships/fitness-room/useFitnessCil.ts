import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateFitnessCilData } from '@/core/utils/fitnessCilValidation'

// ==========================================
// Fitness Roomův vlastní cíl — denní kalorie/tréninkové minuty a
// týdenní počet tréninků, malý samostatný store stejného tvaru jako
// School Roomův useSkolaCil.ts, exportovaný přímo jako Zustand hook
// (žádný odvozený stav, žádný důvod pro druhou obalovou funkci).
//
// cilKcal/cilTreninkMin nahrazují dřívější natvrdo dané CIL_KCAL=300/
// CIL_TRENINK_MIN=20 v FitnessRoomModule.tsx — appka nikdy neznala
// uživatelovu skutečnou hmotnost/kondici, takže to byly jen skromné
// výchozí hodnoty, ne vyladěný plán (viz FitnessRoomModule.tsx's vlastní
// komentář). Zůstávají null, dokud si je uživatel sám nenastaví —
// FitnessRoomModule.tsx si na null místo pak dosadí ty stejné historické
// výchozí hodnoty, takže se pro nikoho, kdo nastavení nikdy neotevře,
// nic nezmění. cilTreninkuTydne je nová hodnota bez historické výchozí
// — dokud je null, panel s ní se v dashboardu vůbec nezobrazí (stejná
// "žádný progres bar, dokud cíl doopravdy není nastavený" konvence jako
// u Book's cilSlov/School Roomova cilTydenniMinut).
// ==========================================

interface FitnessCilState {
  cilKcal: number | null
  cilTreninkMin: number | null
  cilTreninkuTydne: number | null
  setCilKcal: (kcal: number | null) => void
  setCilTreninkMin: (minut: number | null) => void
  setCilTreninkuTydne: (pocet: number | null) => void
}

export const useFitnessCil = create<FitnessCilState>()(
  persist(
    (set) => ({
      cilKcal: null,
      cilTreninkMin: null,
      cilTreninkuTydne: null,
      setCilKcal: (kcal) => set({ cilKcal: kcal !== null && kcal > 0 ? kcal : null }),
      setCilTreninkMin: (minut) => set({ cilTreninkMin: minut !== null && minut > 0 ? minut : null }),
      setCilTreninkuTydne: (pocet) => set({ cilTreninkuTydne: pocet !== null && pocet > 0 ? pocet : null }),
    }),
    {
      name: 'schoolbuddy-fitness-cil-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateFitnessCilData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)
