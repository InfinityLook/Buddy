import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'

// Osobní nastavení čtečky (jen v zařízení, nesynchronizuje se).
export type TemaCtecky = 'papir' | 'svetle' | 'sepie' | 'tmave'
export const TEMATA_CTECKY: readonly { id: TemaCtecky; nazev: string }[] = [
  { id: 'papir', nazev: 'Papír' },
  { id: 'svetle', nazev: 'Světlé' },
  { id: 'sepie', nazev: 'Sépie' },
  { id: 'tmave', nazev: 'Tmavé' },
]
/** Velikosti písma v rem; `velikost` je index do téhle řady. */
export const VELIKOSTI_PISMA = [0.9, 1, 1.12, 1.28, 1.48] as const

interface CteckaState {
  velikost: number
  tema: TemaCtecky
  zmenVelikost: (delta: number) => void
  nastavTema: (tema: TemaCtecky) => void
}

const orizniVelikost = (x: unknown): number =>
  typeof x === 'number' && Number.isFinite(x) ? Math.min(VELIKOSTI_PISMA.length - 1, Math.max(0, Math.round(x))) : 1
const platneTema = (x: unknown): TemaCtecky => (TEMATA_CTECKY.some((t) => t.id === x) ? (x as TemaCtecky) : 'papir')

export const useLibraryCtecka = create<CteckaState>()(
  persist(
    (set, get) => ({
      velikost: 1,
      tema: 'papir',
      zmenVelikost: (delta) => set({ velikost: orizniVelikost(get().velikost + delta) }),
      nastavTema: (tema) => set({ tema: platneTema(tema) }),
    }),
    {
      name: 'schoolbuddy-library-ctecka-storage',
      storage: createJSONStorage(() => secureStorage),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { velikost?: unknown; tema?: unknown }
        return { ...current, velikost: orizniVelikost(p.velikost ?? current.velikost), tema: platneTema(p.tema) }
      },
    },
  ),
)
