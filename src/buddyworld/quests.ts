import type { VillageProgress } from './villageProgress'

export type QuestId = 'prvni_kroky' | 'obrana_osady' | 'nova_vesnice' | 'zkouska_odvahy'
export interface QuestDefinition {
  id: QuestId
  nazev: string
  zadavatel: string
  dialog: string
  cil: string
  hotovo: (s: VillageProgress) => boolean
  odmena: { drevo: number; kamen: number; krystaly: number }
}

export const UKOLY: QuestDefinition[] = [
  { id: 'prvni_kroky', nazev: 'První kroky', zadavatel: 'Starostka Elara',
    dialog: 'Vítej v našem údolí! Nasbírej dřevo a kámen. Společně tu postavíme nový domov.',
    cil: 'Měj alespoň 3 dřeva a 2 kameny.', hotovo: s => s.drevo >= 3 && s.kamen >= 2,
    odmena: { drevo: 2, kamen: 2, krystaly: 1 } },
  { id: 'obrana_osady', nazev: 'Ochránce údolí', zadavatel: 'Strážce Kael',
    dialog: 'V okolních lesích se objevili nepřátelé. Ukaž, že se umíš postarat o bezpečí osady.',
    cil: 'Poraz alespoň 3 nepřátele.', hotovo: s => s.porazeniNepratele >= 3,
    odmena: { drevo: 4, kamen: 3, krystaly: 1 } },
  { id: 'nova_vesnice', nazev: 'Nový začátek', zadavatel: 'Stavitelka Mira',
    dialog: 'Osada roste! Rozšiř ji na druhou úroveň a otevřeme cestu k dalším stavbám.',
    cil: 'Dosáhni úrovně osady 2.', hotovo: s => s.uroven >= 2,
    odmena: { drevo: 5, kamen: 4, krystaly: 2 } },
  { id: 'zkouska_odvahy', nazev: 'Stín za hranicí', zadavatel: 'Strážce Kael',
    dialog: 'Za lesem čeká nebezpečný protivník. Připrav se a poraz prvního bosse.',
    cil: 'Poraz alespoň 1 bosse.', hotovo: s => s.porazeniBossove >= 1,
    odmena: { drevo: 8, kamen: 6, krystaly: 3 } },
]

export const overSplneneUkoly = (v: unknown): QuestId[] =>
  Array.isArray(v) ? [...new Set(v.filter((id): id is QuestId =>
    typeof id === 'string' && UKOLY.some(q => q.id === id)))] : []
