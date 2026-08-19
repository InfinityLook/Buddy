export type GoalCategory = 'Studium' | 'Návyky' | 'Osobní'

export const GOAL_CATEGORIES: GoalCategory[] = ['Studium', 'Návyky', 'Osobní']

export const ALL_GOALS = 'Vše'

export interface Goal {
  id: string
  title: string
  current: number
  target: number
  unit: string
  category: GoalCategory
  // Nastaví se, když cíl poprvé dosáhne cílové hodnoty, a už se nemaže.
  // Kdyby se dal vynulovat, šlo by XP donekonečna sbírat tím, že si
  // uživatel cíl znovu sníží a zase dotáhne.
  completedAt?: string | null
}

// Ukázkové cíle tu schválně nejsou — každý si zakládá svoje.
// Původní trojice ("Přečíst knihu", "Ranní cvičení", "Učení angličtiny")
// vypadala jako data uživatele, přitom mu nepatřila.
export const DEMO_GOAL_IDS = ['1', '2', '3']
export const DEMO_GOAL_TITLES = ['Přečíst knihu', 'Ranní cvičení', 'Učení angličtiny']
