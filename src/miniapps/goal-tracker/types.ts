export interface Goal {
  id: string
  title: string
  current: number
  target: number
  unit: string
  category: 'Studium' | 'Návyky' | 'Osobní'
}

// Ukázkové cíle tu schválně nejsou — každý si zakládá svoje.
// Původní trojice ("Přečíst knihu", "Ranní cvičení", "Učení angličtiny")
// vypadala jako data uživatele, přitom mu nepatřila.
export const DEMO_GOAL_IDS = ['1', '2', '3']
export const DEMO_GOAL_TITLES = ['Přečíst knihu', 'Ranní cvičení', 'Učení angličtiny']
