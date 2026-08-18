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

// Pomocná funkce pro bezpečné ověření gamifikačních dat načtených ze storage
export const validateGamificationData = (data: unknown) => {
  const result = v.safeParse(GamificationSchema, data)
  if (result.success) {
    return { success: true, data: result.output }
  } else {
    console.warn('Gamifikační data neodpovídají schématu (byla poškozena nebo změněna):', result.issues)
    return { success: false, issues: result.issues }
  }
}
