import { Nepritel } from './types'

// ==========================================
// Nepřátelé klíčovaní podle id místa na mapě (lokace.ts), které boj
// spouští. Zatím jen aréna má obsah — dungeony čekají na svůj krok,
// stejným vzorem: přidat sem záznam, ne měnit MapaSveta.tsx.
// ==========================================

export const NEPRATELE_PODLE_LOKACE: Record<string, Nepritel> = {
  'arena-krvavy-kruh': {
    id: 'arena-mistr',
    jmeno: 'Aréna mistr',
    ikona: '🗡️',
    zivoty: 80,
    poskozeniOd: 6,
    poskozeniDo: 12,
    odmenaXp: 40,
    odmenaKredity: 25,
  },
}
