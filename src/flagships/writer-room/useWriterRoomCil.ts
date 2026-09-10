import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateWriterRoomCilData } from '@/core/utils/writerRoomCilValidation'

// ==========================================
// Denní/týdenní psací cíl — jeden malý sdílený store pro celý Writer's
// Room, ne tři samostatné appce vlastní. Cíl je záměrně "kolik kapitol/
// scén/panelů dohromady", ne "kolik slov" — appka totiž tuhle přesně
// tuhle kombinovanou hodnotu už počítá pro dashboardův 14denní graf
// (writerRoomStats.ts's spocitejDnesniTvorbu/spocitejTvorbuPodleDne),
// takže se dá poctivě porovnat se stejným číslem, ne s odhadem počtu
// slov, který by u Scénáře/Komiksu vůbec nedával smysl (scéna/panel
// nemá "cílový počet slov", kapitola má).
//
// null = žádný cíl nenastaven, appka jen ukazuje skutečnou tvorbu bez
// srovnání — stejná "null znamená nic nenastaveno" konvence jako
// Kniha.cilSlov/Scenar.cilScen/Komiks.cilStran.
// ==========================================

interface WriterRoomCilState {
  cilDenne: number | null
  cilTydenne: number | null
  setCilDenne: (cil: number | null) => void
  setCilTydenne: (cil: number | null) => void
}

export const useWriterRoomCil = create<WriterRoomCilState>()(
  persist(
    (set) => ({
      cilDenne: null,
      cilTydenne: null,
      setCilDenne: (cil) => set({ cilDenne: cil }),
      setCilTydenne: (cil) => set({ cilTydenne: cil }),
    }),
    {
      name: 'schoolbuddy-writer-room-cil-storage',
      storage: createJSONStorage(() => secureStorage),
      merge: (persisted, current) => {
        const validation = validateWriterRoomCilData(persisted)
        if (!validation.success) {
          console.error('Data psacího cíle Writer\'s Roomu byla poškozena. Obnovuji výchozí stav.')
          return current
        }
        return { ...current, ...validation.data }
      },
    }
  )
)
