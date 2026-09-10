import type { Goal, GoalCategory } from '@/miniapps/goal-tracker/types'
import { GOAL_CATEGORIES } from '@/miniapps/goal-tracker/types'
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

/** Nedokončené číselné cíle seřazené od nejblíž svému splnění, oříznuté
 *  na `max` — appka chce ukázat jen pár nejaktuálnějších, celý seznam má
 *  Goal Tracker sám, tohle je jen náhled. Návykové cíle sem záměrně
 *  nepatří — "current" u nich neznamená totéž (viz
 *  spocitejTydenniPokrokNavyku) a nemá smysl je řadit podle blízkosti
 *  ke splnění, protože se nikdy "nesplní" natrvalo. */
export const nejblizsiCile = (goals: Goal[], max: number): AktivniCil[] =>
  goals
    .filter((g) => (g.typ ?? 'cil') === 'cil' && g.current < g.target)
    .map((g) => ({ goal: g, percent: Math.min(100, Math.round((g.current / g.target) * 100)) }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, max)

/** Kolik odznaků je skutečně odemčeno — `unlockedAt` je jediný zdroj
 *  pravdy (viz useGamificationStore.ts), ne samostatný počítadlo, co
 *  by mohlo časem rozejít od skutečného seznamu. */
export const pocetOdemcenych = (badges: Badge[]): number => badges.filter((b) => !!b.unlockedAt).length

export interface KategorieCilu {
  category: GoalCategory
  count: number
}

/** Kolik aktivních (nesplněných/probíhajících) cílů je v každé
 *  kategorii — habit cíle se počítají taky, "aktivní" pro ně znamená
 *  prostě "ne archivovaný", protože se nikdy natrvalo nesplní. Prázdná
 *  kategorie se nevrací vůbec, ať appka nekreslí mrtvý sloupec s nulou —
 *  stejná zásada jako Economy Roomovy prstence kategorií. */
export const spocitejPodleKategorie = (goals: Goal[]): KategorieCilu[] =>
  GOAL_CATEGORIES.map((category) => ({
    category,
    count: goals.filter((g) => g.category === category && !((g.typ ?? 'cil') === 'cil' && g.current >= g.target))
      .length,
  })).filter((k) => k.count > 0)
