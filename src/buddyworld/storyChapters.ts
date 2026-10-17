import { UKOLY, type QuestId } from './quests'

export const STAVY_KAPITOL = [
  { id: 1, nazev: 'Kapitola I · Nový domov', popis: 'Příchod do údolí, obrana a první rozšíření osady.', od: 0, do: 4 },
  { id: 2, nazev: 'Kapitola II · Rostoucí město', popis: 'Stavby, bezpečné cesty a nový domov pro obyvatele.', od: 4, do: 8 },
  { id: 3, nazev: 'Kapitola III · Nový úsvit', popis: 'Poslední hrozby a budoucnost údolí.', od: 8, do: UKOLY.length },
] as const

export function kapitolaUkolu(id: QuestId): number | null {
  const index = UKOLY.findIndex(ukol => ukol.id === id)
  return STAVY_KAPITOL.find(k => index >= k.od && index < k.do)?.id ?? null
}
