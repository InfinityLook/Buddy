import * as v from 'valibot'

// Definice schématu pro jednu miniaplikaci (AppItem)
export const AppItemSchema = v.object({
  id: v.string(),
  title: v.string(),
  category: v.string(),
  icon: v.string(),
  // Výčet musí odpovídat AppColor v useAppStore — jinak by import zálohy
  // propustil barvu, pro kterou neexistuje styl.
  color: v.picklist(['purple', 'cyan', 'orange', 'green', 'pink']),
  active: v.boolean(),
  favorite: v.boolean(),
})

// Schéma pro pole aplikací
export const AppsListSchema = v.array(AppItemSchema)

// Pomocná funkce pro bezpečné ověření dat
export const validateAppsData = (data: unknown) => {
  const result = v.safeParse(AppsListSchema, data)
  if (result.success) {
    return { success: true, data: result.output }
  } else {
    console.warn('Načtená data neodpovídají schématu (byla poškozena nebo změněna):', result.issues)
    return { success: false, issues: result.issues }
  }
}
