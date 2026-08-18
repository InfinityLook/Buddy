import * as v from 'valibot'

export const ProfileSecuritySchema = v.object({
  biometrics: v.boolean(),
  loginAlerts: v.boolean(),
})

export const ProfileSchema = v.object({
  name: v.string(),
  email: v.string(),
  motto: v.string(),
  avatar: v.string(),
  security: ProfileSecuritySchema,
  readNotifications: v.array(v.string()),
})

// Pomocná funkce pro bezpečné ověření profilu načteného ze storage
export const validateProfileData = (data: unknown) => {
  const result = v.safeParse(ProfileSchema, data)
  if (result.success) {
    return { success: true as const, data: result.output }
  }
  console.warn('Data profilu neodpovídají schématu (byla poškozena nebo změněna):', result.issues)
  return { success: false as const, issues: result.issues }
}
