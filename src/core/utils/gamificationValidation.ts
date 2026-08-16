import * as v from 'valibot'

export const BadgeSchema = v.object({
  id: v.string(),
  title: v.string(),
  description: v.string(),
  icon: v.string(),
  unlockedAt: v.nullable(v.string()),
})

export const GamificationSchema = v.object({
  xp: v.number(),
  level: v.number(),
  streakDays: v.number(),
  lastActiveDate: v.nullable(v.string()),
  badges: v.array(BadgeSchema),
})
