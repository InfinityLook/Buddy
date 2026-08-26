import * as v from 'valibot'
import { DEFAULT_THEME_ID, isKnownThemeId } from './themes'

// ==========================================
// Ověření uloženého vzhledu — stejný vzor jako roleValidation.ts:
// neznámé/neplatné id tiše spadne na výchozí, žádná chyba uživateli.
// Nemusí tu být kontrola oprávnění (to řeší až resolveActiveThemeId
// při použití, ne při čtení uloženého stavu) — poškozená/upravená
// záloha si tak nejvýš "pamatuje" VIP vzhled, který se ale nepoužije,
// dokud pro něj účet opravdu nemá cosmetics.premium.
// ==========================================

export const ThemeSchema = v.object({
  themeId: v.optional(v.unknown(), DEFAULT_THEME_ID),
})

export const validateThemeData = (data: unknown) => {
  const result = v.safeParse(ThemeSchema, data)
  if (!result.success) {
    console.warn('Data vzhledu neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const themeId = isKnownThemeId(result.output.themeId) ? result.output.themeId : DEFAULT_THEME_ID
  return { success: true as const, data: { themeId } }
}
