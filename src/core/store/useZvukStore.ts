import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateZvukData } from '@/core/utils/zvukValidation'

// ==========================================
// Nastavení — Zvuk. Čtyři nezávislé posuvníky (Master, Buddy, Hra,
// Music), uložené jako celá procenta 0-100, ne 0-1 — appka je takhle
// rovnou zobrazuje na posuvníku i v popisku, žádný přepočet navíc na
// vykreslovací straně.
//
// `ziskejHlasitost(kategorie)` je jediné místo, odkud kterýkoli
// zvukový zdroj (fighting/sound.ts, music-studio/audioEngine.ts,
// buddy/useBuddyVoice.ts) čte VÝSLEDNOU hlasitost — Master vždycky
// násobí, appka nechce, aby si každý zdroj tuhle násobičku počítal
// zvlášť a jednou to udělal jinak. Volá se přes `.getState()`, ne přes
// React hook — žádný z těch tří zdrojů není komponenta, jsou to
// obyčejné moduly volané zvenčí (viz jejich vlastní "žádný React"
// disciplína).
// ==========================================

export type ZvukKategorie = 'buddy' | 'hra' | 'music'

interface ZvukState {
  master: number
  buddy: number
  hra: number
  music: number
  setHlasitost: (kategorie: 'master' | ZvukKategorie, procent: number) => void
}

const orizni = (procent: number) => Math.max(0, Math.min(100, Math.round(procent)))

export const useZvukStore = create<ZvukState>()(
  persist(
    (set) => ({
      master: 100,
      buddy: 100,
      hra: 100,
      music: 100,

      setHlasitost: (kategorie, procent) => set({ [kategorie]: orizni(procent) }),
    }),
    {
      name: 'schoolbuddy-zvuk-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateZvukData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)

/** Výsledná hlasitost 0..1 pro danou kategorii = Master × kategorie.
 *  Cokoli mimo Buddyho/Hru/Music (např. Pomodoro gong) poslouchá jen
 *  appčinu globální `master`, samostatnou kategorii nemá. */
export const ziskejHlasitost = (kategorie: ZvukKategorie): number => {
  const s = useZvukStore.getState()
  return (s.master / 100) * (s[kategorie] / 100)
}
