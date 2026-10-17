import type { VillageProgress } from './villageProgress'

/** Volitelné úkoly jsou nezávislé na pořadí hlavního příběhu. */
export const VEDLEJSI_UKOLY = [
  { id: 'pomoc_stavitelce', nazev: 'Dřevo pro Miru', zadavatel: 'Stavitelka Mira', popis: 'Mira potřebuje zásoby na opravu domů.', cil: 'Nasbírej alespoň 10 dřeva.', hotovo: (s: VillageProgress) => s.drevo >= 10, odmena: { drevo: 0, kamen: 6, krystaly: 1 } },
  { id: 'kamenny_most', nazev: 'Oprava mostu', zadavatel: 'Stavitelka Mira', popis: 'Starý most potřebuje nové kameny.', cil: 'Měj alespoň 12 kamenů.', hotovo: (s: VillageProgress) => s.kamen >= 12, odmena: { drevo: 8, kamen: 0, krystaly: 2 } },
  { id: 'lesni_hlidka', nazev: 'Lesní hlídka', zadavatel: 'Strážce Kael', popis: 'Cesty musí být bezpečné pro obchodníky.', cil: 'Poraz celkem 6 běžných nepřátel.', hotovo: (s: VillageProgress) => s.porazeniNepratele >= 6, odmena: { drevo: 5, kamen: 5, krystaly: 2 } },
  { id: 'nocni_straz', nazev: 'Noční stráž', zadavatel: 'Strážce Kael', popis: 'Temnota se vrací. Prokaž odvahu.', cil: 'Poraz celkem 15 běžných nepřátel.', hotovo: (s: VillageProgress) => s.porazeniNepratele >= 15, odmena: { drevo: 10, kamen: 8, krystaly: 4 } },
  { id: 'krystalovy_dar', nazev: 'Dar světelného krystalu', zadavatel: 'Starostka Elara', popis: 'Krystaly pomohou obnovit starou svatyni.', cil: 'Měj alespoň 5 krystalů.', hotovo: (s: VillageProgress) => s.krystaly >= 5, odmena: { drevo: 12, kamen: 12, krystaly: 0 } },
  { id: 'prvni_vitezstvi', nazev: 'Ochránce obyvatel', zadavatel: 'Strážce Kael', popis: 'Poraz nebezpečného strážce háje.', cil: 'Poraz alespoň 1 bosse.', hotovo: (s: VillageProgress) => s.porazeniBossove >= 1, odmena: { drevo: 8, kamen: 8, krystaly: 4 } },
  { id: 'rostouci_osada', nazev: 'Místo pro nové obyvatele', zadavatel: 'Starostka Elara', popis: 'Připrav osadu na další rodiny.', cil: 'Dosáhni úrovně osady 3.', hotovo: (s: VillageProgress) => s.uroven >= 3, odmena: { drevo: 10, kamen: 10, krystaly: 3 } },
  { id: 'mesto_budoucnosti', nazev: 'Město budoucnosti', zadavatel: 'Starostka Elara', popis: 'Pomoz městu vyrůst v bezpečné útočiště.', cil: 'Dosáhni úrovně osady 5.', hotovo: (s: VillageProgress) => s.uroven >= 5, odmena: { drevo: 20, kamen: 20, krystaly: 8 } },
] as const
export type VedlejsiUkolId = (typeof VEDLEJSI_UKOLY)[number]['id']
const PLATNE_ID = new Set<string>(VEDLEJSI_UKOLY.map(q => q.id))
export function overSplneneVedlejsiUkoly(v: unknown): VedlejsiUkolId[] {
  return Array.isArray(v) ? [...new Set(v.filter((id): id is VedlejsiUkolId => typeof id === 'string' && PLATNE_ID.has(id)))] : []
}
export function lzePrevzitVedlejsiOdmenu(id: string, splnene: readonly string[], stav: VillageProgress): boolean {
  const ukol = VEDLEJSI_UKOLY.find(q => q.id === id)
  return Boolean(ukol && !splnene.includes(id) && ukol.hotovo(stav))
}
