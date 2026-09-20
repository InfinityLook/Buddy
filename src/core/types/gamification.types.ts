export interface Badge {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt: string | null // ISO date or null
}

export interface UserStats {
  xp: number
  level: number
  streakDays: number
  lastActiveDate: string | null // ISO date YYYY-MM-DD
  badges: Badge[]
  // Součet XP jen z fitness ActivityKindů (workout/behani/posilovna/
  // mobilita) — samostatný běžící součet vedle celkového xp výš, viz
  // useGamificationStore.ts's FITNESS_KINDY. Existuje jen kvůli
  // Fitness Roomovu žebříčku (Fáze 4) — appka bez toho nemá jak
  // spočítat "kolik XP je jen z fitness", protože Form Checkovo
  // 'workout' dává proměnlivou částku podle počtu opakování, ne
  // pevnou.
  fitnessXp: number
}
