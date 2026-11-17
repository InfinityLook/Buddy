// Ověření osobní police Library načtené z úložiště: platné jsou jen
// neprázdná textová id rozumné délky, bez duplicit, nejvýš MAX_POLICE kusů.
// Poškozená položka se tiše vyřadí, ne celá police (stejný vzor jako
// ostatní persistované store).
export const MAX_POLICE = 500
export const MAX_DELKA_ID = 100

export const ocistiPolici = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return []
  const videno = new Set<string>()
  for (const id of raw) {
    if (typeof id !== 'string' || id.length === 0 || id.length > MAX_DELKA_ID) continue
    videno.add(id)
    if (videno.size >= MAX_POLICE) break
  }
  return [...videno]
}

export const validateLibraryShelfData = (raw: unknown): { ids: string[] } => ({
  ids: ocistiPolici(raw && typeof raw === 'object' ? (raw as { ids?: unknown }).ids : undefined),
})
