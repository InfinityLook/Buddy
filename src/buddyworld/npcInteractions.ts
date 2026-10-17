import { VEDLEJSI_UKOLY, lzePrevzitVedlejsiOdmenu } from './sideQuests'
import type { VillageProgress } from './villageProgress'

export type ObyvatelId = 'elara' | 'kael' | 'mira'
const ZADAVATELE: Record<ObyvatelId, string> = {
  elara: 'Starostka Elara', kael: 'Strážce Kael', mira: 'Stavitelka Mira',
}
const UVODY: Record<ObyvatelId, string> = {
  elara: 'Údolí znovu ožívá. Každý dobrý skutek nám pomáhá obnovit domov.',
  kael: 'Za hranicemi osady se stále pohybují stíny. Zvládneš další hlídku?',
  mira: 'Město nepostavíme za den. Důležité jsou i drobné opravy a zásoby.',
}
const ZAVERY: Record<ObyvatelId, string> = {
  elara: 'Díky tobě mají lidé zase naději. Brzy přijdou další rodiny.',
  kael: 'Naše cesty jsou bezpečnější. Dobrá práce, strážce!',
  mira: 'Teď už máme materiál na všechny plánované opravy. Děkuji!',
}
export function jeObyvatelId(id: string): id is ObyvatelId {
  return Object.prototype.hasOwnProperty.call(ZADAVATELE, id)
}
export function vedlejsiUkolyObyvatele(id: string) {
  if (!jeObyvatelId(id)) return []
  return VEDLEJSI_UKOLY.filter(ukol => ukol.zadavatel === ZADAVATELE[id])
}
export function rozhovorObyvatele(id: string, splnene: readonly string[]): string {
  if (!jeObyvatelId(id)) return ''
  const ukoly = vedlejsiUkolyObyvatele(id)
  return ukoly.every(ukol => splnene.includes(ukol.id)) ? ZAVERY[id] : UVODY[id]
}
export function stavVedlejsihoUkolu(id: string, splnene: readonly string[], stav: VillageProgress) {
  if (splnene.includes(id)) return 'splneno' as const
  return lzePrevzitVedlejsiOdmenu(id, splnene, stav) ? 'pripraveno' as const : 'aktivni' as const
}
