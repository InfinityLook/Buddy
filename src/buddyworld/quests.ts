import type { VillageProgress } from './villageProgress'

export type QuestId = 'prvni_kroky' | 'obrana_osady' | 'nova_vesnice' | 'zkouska_odvahy' | 'cesta_k_mestu' | 'strazci_udoli' | 'novy_domov' | 'stiny_se_vraceji' | 'srdce_udoli' | 'hranice_temnoty' | 'posledni_straz' | 'novy_usvit'
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
  { id: 'cesta_k_mestu', nazev: 'Cesta k městu', zadavatel: 'Stavitelka Mira',
    dialog: 'Naše vesnice potřebuje kovárnu a obchod. Rozšiř osadu a přivedeme nové řemeslníky.',
    cil: 'Dosáhni úrovně osady 3.', hotovo: s => s.uroven >= 3,
    odmena: { drevo: 6, kamen: 6, krystaly: 2 } },
  { id: 'strazci_udoli', nazev: 'Strážci údolí', zadavatel: 'Strážce Kael',
    dialog: 'Nepřátelé se nevzdali. Potřebujeme, abys znovu pročistil okolní stezky.',
    cil: 'Poraz celkem 10 běžných nepřátel.', hotovo: s => s.porazeniNepratele >= 10,
    odmena: { drevo: 8, kamen: 8, krystaly: 3 } },
  { id: 'novy_domov', nazev: 'Nový domov', zadavatel: 'Starostka Elara',
    dialog: 'Z osady se stává městečko. Dokonči další rozšíření, aby se k nám mohli nastěhovat noví obyvatelé.',
    cil: 'Dosáhni úrovně osady 4.', hotovo: s => s.uroven >= 4,
    odmena: { drevo: 10, kamen: 10, krystaly: 4 } },
  { id: 'stiny_se_vraceji', nazev: 'Stíny se vracejí', zadavatel: 'Strážce Kael',
    dialog: 'Na hranicích údolí se znovu probouzí temná síla. Postav se druhému bossovi.',
    cil: 'Poraz celkem 2 bossy.', hotovo: s => s.porazeniBossove >= 2,
    odmena: { drevo: 12, kamen: 12, krystaly: 5 } },


  { id: 'srdce_udoli', nazev: 'Srdce údolí', zadavatel: 'Stavitelka Mira',
    dialog: 'Naše město je připravené růst. Dostaň osadu na nejvyšší úroveň a rozžehni naději.',
    cil: 'Dosáhni úrovně osady 5.', hotovo: s => s.uroven >= 5,
    odmena: { drevo: 15, kamen: 15, krystaly: 5 } },
  { id: 'hranice_temnoty', nazev: 'Hranice temnoty', zadavatel: 'Strážce Kael',
    dialog: 'Naše cesty jsou stále nebezpečné. Vyčisti okolí města, ať mohou obchodníci bezpečně projít.',
    cil: 'Poraz celkem 20 běžných nepřátel.', hotovo: s => s.porazeniNepratele >= 20,
    odmena: { drevo: 15, kamen: 15, krystaly: 6 } },
  { id: 'posledni_straz', nazev: 'Poslední stráž', zadavatel: 'Strážce Kael',
    dialog: 'V lesích se znovu objevila stará hrozba. Ukaž, že naše město dokáže odolat.',
    cil: 'Poraz celkem 3 bossy.', hotovo: s => s.porazeniBossove >= 3,
    odmena: { drevo: 18, kamen: 18, krystaly: 8 } },
  { id: 'novy_usvit', nazev: 'Nový úsvit', zadavatel: 'Starostka Elara',
    dialog: 'Údolí je zachráněné. Náš domov je připraven na další kapitolu dobrodružství!',
    cil: 'Měj alespoň 20 dřeva a 20 kamenů.', hotovo: s => s.drevo >= 20 && s.kamen >= 20,
    odmena: { drevo: 20, kamen: 20, krystaly: 10 } },
]

export const overSplneneUkoly = (v: unknown): QuestId[] =>
  Array.isArray(v) ? [...new Set(v.filter((id): id is QuestId =>
    typeof id === 'string' && UKOLY.some(q => q.id === id)))] : []
