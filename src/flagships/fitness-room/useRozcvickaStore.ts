import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateRozcvickaData } from '@/core/utils/rozcvickaValidation'
import { mistniDatum } from '@/core/utils/date'

// XP za dokončení kteréhokoli programu (rozcvička/strečink/jóga) —
// stejná částka bez ohledu na to, který program to byl, protože appka
// je bere jako jednu kategorii "hlasem vedené cvičení", ne tři.
const XP_ZA_DOKONCENI = 15

// ==========================================
// Nejvýš jednou denně, ne za každé dokončení — bez tohohle hlídání by
// "Přeskočit krok" pětkrát rychle za sebou plus "Zpět na výběr" udělalo
// z XP nekonečně opakovatelnou akci s nulovou skutečnou námahou, přesně
// ta farmařská díra, co appka jinde (Growth Roomovo odškrtávání návyku,
// jídelníček/pitný režim s NULOVÝM XP z identického důvodu) už jednou
// řešila. pocetDokoncenychCelkem se naproti tomu připočítává pokaždé —
// je to jen informativní celoživotní počítadlo na obrazovce výběru,
// nikdy vstup do recordAction.
// ==========================================
interface RozcvickaState {
  posledniOdmenenyDen: string | null
  pocetDokoncenychCelkem: number
  /** Vrátí true, pokud se dnešní odměna doopravdy připsala (nový den). */
  oznacDokonceni: () => boolean
}

export const useRozcvickaStore = create<RozcvickaState>()(
  persist(
    (set, get) => ({
      posledniOdmenenyDen: null,
      pocetDokoncenychCelkem: 0,

      oznacDokonceni: () => {
        const dnes = mistniDatum()
        const jeNovyDen = get().posledniOdmenenyDen !== dnes

        set((state) => ({
          pocetDokoncenychCelkem: state.pocetDokoncenychCelkem + 1,
          posledniOdmenenyDen: jeNovyDen ? dnes : state.posledniOdmenenyDen,
        }))

        if (jeNovyDen) {
          useGamificationStore.getState().recordAction('mobilita', XP_ZA_DOKONCENI)
        }

        return jeNovyDen
      },
    }),
    {
      name: 'schoolbuddy-rozcvicka-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateRozcvickaData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)
