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
}
