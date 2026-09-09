// ==========================================
// Malý sdílený úryvek pro Osnovu/vyhledávání ve Writer's Roomu — najde
// dotaz v delším textu a vrátí kousek okolí místo celého odstavce,
// stejná "krátký náhled, ne plný text" zdrženlivost jako
// reply_to_id/Uloženo jinde v appce. Sdílené, protože KnihaOsnova/
// ScenarOsnova/KomiksOsnova všechny potřebují přesně tohle a nic víc.
// ==========================================

export const najdiUryvek = (text: string, dotaz: string, kontext = 24): string | null => {
  const cistyDotaz = dotaz.trim()
  if (!cistyDotaz) return null
  const index = text.toLowerCase().indexOf(cistyDotaz.toLowerCase())
  if (index < 0) return null

  const start = Math.max(0, index - kontext)
  const end = Math.min(text.length, index + cistyDotaz.length + kontext * 2)
  const useknuto = text.slice(start, end).trim()
  return `${start > 0 ? '…' : ''}${useknuto}${end < text.length ? '…' : ''}`
}

export const obsahujeDotaz = (text: string, dotaz: string): boolean =>
  dotaz.trim() === '' || text.toLowerCase().includes(dotaz.trim().toLowerCase())
