export interface Goal {
  id: string
  title: string
  current: number
  target: number
  unit: string
  category: 'Studium' | 'Návyky' | 'Osobní'
}

export const INITIAL_GOALS: Goal[] = [
  { id: '1', title: 'Přečíst knihu', current: 120, target: 300, unit: 'stran', category: 'Studium' },
  { id: '2', title: 'Ranní cvičení', current: 4, target: 7, unit: 'dní/týden', category: 'Návyky' },
  { id: '3', title: 'Učení angličtiny', current: 15, target: 20, unit: 'lekcí', category: 'Osobní' },
]
