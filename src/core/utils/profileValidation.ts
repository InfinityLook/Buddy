import * as v from 'valibot'

export const ProfileSecuritySchema = v.object({
  biometrics: v.boolean(),
  loginAlerts: v.boolean(),
  // Volitelné — chybí ve starších uložených profilech i dokud uživatel
  // biometrii poprvé nezapne. Povinné pole by starší data zahodilo.
  biometricCredentialId: v.optional(v.string()),
})

export const ProfileSchema = v.object({
  name: v.string(),
  email: v.string(),
  motto: v.string(),
  // Optional s výchozí hodnotou (ne jen v.optional bez ní) — ProfileData
  // má tahle pole povinná, takže výstup validace musí vždycky nést
  // skutečnou hodnotu, i pro starší uložený profil, který je ještě nemá.
  bio: v.optional(v.string(), ''),
  avatar: v.string(),
  bannerUrl: v.optional(v.nullable(v.string()), null),
  frameId: v.optional(v.nullable(v.string()), null),
  pinnedBadges: v.optional(v.array(v.string()), []),
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
