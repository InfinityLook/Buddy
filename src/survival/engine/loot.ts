import { MonstrumDef } from '../types'

// ==========================================
// Loot systém (bod 13 zadání) — čistá funkce, žádný stav. XP/Gold jsou
// z definice monstra jisté, Crystal a "vzácný drop" jsou hozené kostkou
// (injectovatelné `nahodne`, stejná zásada testovatelnosti jako
// combat/ai.ts u Souboje — appka nikdy nevolá Math.random napevno).
// ==========================================

export interface VysledekZabiti {
  xp: number
  gold: number
  krystal: number
  vzacnyDrop: boolean
}

export const vyhodnotZabiti = (monstrum: MonstrumDef, nahodne: () => number = Math.random): VysledekZabiti => {
  const krystal = nahodne() < monstrum.sanceKrystal ? 1 : 0
  // "✨ RARE DROP!" je jen zlomek běžné šance na loot, ne stejná
  // hodnota — jinak by to bod 13 zadání ("občas") vůbec neodpovídalo.
  const vzacnyDrop = nahodne() < monstrum.sanceLoot * 0.25

  return {
    xp: monstrum.xp,
    gold: monstrum.gold,
    krystal,
    vzacnyDrop,
  }
}
