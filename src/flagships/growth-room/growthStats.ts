import type { Goal } from '@/miniapps/goal-tracker/types'
import type { Badge } from '@/core/types/gamification.types'

// ==========================================
// Odvozené statistiky Growth Roomu ze skutečných dat Goal Trackeru a
// gamifikačního store'u — čisté funkce, stejný důvod jako
// fitnessStats.ts/economyStats.ts vedle: testovatelné bez komponenty,
// jedno místo, které nemůže rozjet zobrazenou hodnotu od skutečných dat.
// ==========================================

export interface AktivniCil {
  goal: Goal
  percent: number
}

/** Nedokončené cíle seřazené od nejblíž svému splnění, oříznuté na
 *  `max` — appka chce ukázat jen pár nejaktuálnějších, celý seznam má
 *  Goal Tracker sám, tohle je jen náhled. */
export const nejblizsiCile = (goals: Goal[], max: number): AktivniCil[] =>
  goals
    .filter((g) => g.current < g.target)
    .map((g) => ({ goal: g, percent: Math.min(100, Math.round((g.current / g.target) * 100)) }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, max)

/** Kolik odznaků je skutečně odemčeno — `unlockedAt` je jediný zdroj
 *  pravdy (viz useGamificationStore.ts), ne samostatný počítadlo, co
 *  by mohlo časem rozejít od skutečného seznamu. */
export const pocetOdemcenych = (badges: Badge[]): number => badges.filter((b) => !!b.unlockedAt).length
