import type { QuestId } from './quests'

/** Krátké příběhové scény Season 1. Neovlivňují odměny ani uložený postup. */
export interface StoryScene {
  id: QuestId
  misto: string
  pred: readonly string[]
  po: readonly string[]
}

export const PRIBEHOVE_SCENY: Record<QuestId, StoryScene> = {
  prvni_kroky: { id: 'prvni_kroky', misto: 'Buddyho vesnice', pred: [
    'Elara: Přišel jsi právě včas. Údolí bývalo domovem mnoha rodin, dnes tu zůstala jen hrstka z nás.',
    'Buddy se zastaví u starého ohniště. Pod popelem slabě září podivný symbol.',
    'Elara: Nejdřív potřebujeme dřevo a kámen. Až bude osada v bezpečí, povím ti o světle pod horami.'
  ], po: ['Elara: První zásoby jsou doma. Zkusíme znovu rozsvítit světla v ulicích.', 'Buddy spokojeně zavrtí ocasem. Na obzoru se však mihne stín.'] },
  obrana_osady: { id: 'obrana_osady', misto: 'Stíny lesa', pred: [
    'Kael: Zvířata se lesa bojí. To není přirozené. Něco je žene směrem k vesnici.',
    'Kael: Zastav několik příšer a vrať se. Chci vědět, zda nosí stejné temné znamení.'
  ], po: ['Kael: Našel jsem na jejich stopách černý prach. Přichází od starého háje.', 'Elara: Obyvatelé dnes poprvé po dlouhé době klidně usnou.'] },
  nova_vesnice: { id: 'nova_vesnice', misto: 'Buddyho vesnice', pred: [
    'Mira: Naši předkové stavěli domy kolem světelného krystalu. Když zhasl, začalo údolí chřadnout.',
    'Mira: Rozšiř osadu. Potřebujeme místo pro dílnu a bezpečné skladiště.'
  ], po: ['Mira: Pod novými základy jsme našli mapu. Ukazuje cestu do Háje strážce.', 'Buddy se k mapě přiblíží a jeho znak na okamžik zazáří.'] },
  zkouska_odvahy: { id: 'zkouska_odvahy', misto: 'Háj strážce', pred: [
    'Kael: Háj hlídá bytost, která kdysi chránila celé údolí. Temnota ji ale změnila.',
    'Kael: Nezapomeň: tvůj Buddy není jen pomocník. Je spojený se srdcem tohoto místa.'
  ], po: ['Hlas strážce: Světlo... ještě nezmizelo. Hledejte jeho úlomky.', 'Na zemi zůstane slabá záře a les na chvíli utichne.'] },
  cesta_k_mestu: { id: 'cesta_k_mestu', misto: 'Buddyho vesnice', pred: [
    'Mira: Z vesnice může vyrůst město. Kováři a obchodníci ale potřebují pevné cesty.',
    'Mira: Pomoz osadě vyrůst a otevřeme brány dalším obyvatelům.'
  ], po: ['Do osady přichází první karavana. Jeden z vozů veze starou knihu se znakem krystalu.'] },
  strazci_udoli: { id: 'strazci_udoli', misto: 'Stíny lesa', pred: [
    'Kael: Karavany mizí v mlze. Zajisti stezky, aby zásoby dorazily do města.',
    'Buddy tiše zavrčí. Ve tmě odpoví několik vzdálených hlasů.'
  ], po: ['Kael: Stezky jsou průchodné. Všichni ale mluví o stínu, který se pohybuje proti větru.'] },
  novy_domov: { id: 'novy_domov', misto: 'Buddyho vesnice', pred: [
    'Elara: Každý nový dům znamená, že se někdo odvážil vrátit.',
    'Elara: Vybuduj větší osadu. Potřebujeme lidi, kteří si pamatují dávné příběhy.'
  ], po: ['Stařenka z karavany vypráví o čtyřech strážcích živlů a světle ukrytém pod údolím.'] },
  stiny_se_vraceji: { id: 'stiny_se_vraceji', misto: 'Háj strážce', pred: [
    'Kael: Temnota se vrací, tentokrát silnější. Někdo zkouší prolomit starou pečeť.',
    'Elara: Ať najdeš v háji cokoli, vrať se. Údolí tě potřebuje.'
  ], po: ['Z poraženého stínu se uvolní paprsek světla. Buddyho znak odpoví stejnou barvou.'] },
  srdce_udoli: { id: 'srdce_udoli', misto: 'Buddyho vesnice', pred: [
    'Mira: Obnovíme-li město, můžeme znovu zapálit maják nad údolím.',
    'Mira: Dokonči poslední rozšíření. Dáme obyvatelům důvod zůstat.'
  ], po: ['Nad střechami se rozzáří první maják. Z dálky mu odpoví drobná světla.'] },
  hranice_temnoty: { id: 'hranice_temnoty', misto: 'Stíny lesa', pred: [
    'Kael: Stíny ustupují, ale jejich poslední tlupy ohrožují obchodní cesty.',
    'Kael: Vyčisti okolí města. Pak budeme mít sílu čelit poslední hrozbě.'
  ], po: ['Kael: Les je znovu tichý. Zbývá jediná cesta: do srdce starého háje.'] },
  posledni_straz: { id: 'posledni_straz', misto: 'Háj strážce', pred: [
    'Elara: Před lety jsme odtud utíkali. Dnes tu stojíme společně.',
    'Kael: Postav se poslednímu strážci temnoty. My ochráníme vesnici.'
  ], po: ['Háj se rozjasní. Staré stromy poprvé po letech rozkvetou.', 'Buddy se otočí k vesnici. Dobrodružství ale ještě nekončí.'] },
  novy_usvit: { id: 'novy_usvit', misto: 'Buddyho vesnice', pred: [
    'Elara: Město přežilo. Připrav zásoby na slavnost, která spojí celé údolí.',
    'Mira: Po tolika zimách si zasloužíme nový začátek.'
  ], po: ['Obyvatelé zapalují lucerny a hudba se rozléhá ulicemi.', 'Elara: Toto je náš nový úsvit. Za horami však čekají další příběhy.', 'KONEC PRVNÍ SEZÓNY — Kronika údolí.'] },
}

export function scenaUkolu(id: QuestId): StoryScene { return PRIBEHOVE_SCENY[id] }
