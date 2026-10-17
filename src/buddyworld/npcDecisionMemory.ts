/** Bezpečné uložení posledního rozhodnutí v rozhovoru (bez odměn a změn questů). */
import { odpovedNpc, volbyProNpc } from './npcDialogChoices'
export type NpcDecisionState = Record<string, string>
const KEY = 'buddyworld:npc-decisions:v1'
export function nactiRozhodnuti(storage?: Pick<Storage, 'getItem'>): NpcDecisionState {
  try {
    const raw = (storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined))?.getItem(KEY)
    if (!raw) return {}
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
    const result: NpcDecisionState = Object.create(null)
    for (const [npc, choice] of Object.entries(data)) {
      if (typeof choice === 'string' && odpovedNpc(npc, choice) !== null) result[npc] = choice
    }
    return result
  } catch { return {} }
}
export function ulozRozhodnuti(npc: string, volba: string, storage?: Pick<Storage, 'getItem' | 'setItem'>): NpcDecisionState | null {
  if (!volbyProNpc(npc).some(v => v.id === volba)) return null
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined)
    if (!store) return null
    const next = { ...nactiRozhodnuti(store), [npc]: volba }
    store.setItem(KEY, JSON.stringify(next))
    return next
  } catch { return null }
}
export function reakceNaRozhodnuti(npc: string, volba: string): string | null {
  const responses: Record<string, Record<string, string>> = {
    elara: { vesnice: 'Elara si pamatuje, že chceš pomoci osadě.', historie: 'Elara ví, že tě zajímá minulost krystalů.' },
    kael: { bezpeci: 'Kael si pamatuje, že dáváš přednost opatrnému průzkumu.', vycvik: 'Kael si pamatuje tvůj zájem o bojový výcvik.' },
    mira: { stavba: 'Mira si pamatuje, že sháníš stavební suroviny.', plany: 'Mira si pamatuje tvůj zájem o rozvoj vesnice.' },
  }
  return Object.prototype.hasOwnProperty.call(responses, npc) ? responses[npc][volba] ?? null : null
}
