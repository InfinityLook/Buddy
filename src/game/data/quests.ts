// ==========================================
// Questy — data-driven, ne zadrátované v JSX. Quest engine (Fáze 2)
// zobecňuje vertikální řez z Fáze 1: quest teď má výslovný životní
// cyklus (nedostupný -> aktivní -> splněný, viz useQuestStore.ts) a
// pole `cile` místo jednoho plochého textu, protože ne každý
// budoucí quest ze Season 1 se splní jedním soubojem — "Sedm symbolů"
// nebo "Hlas ve zdi" budou potřebovat víc kroků, možná i jiných typů
// (dialog, návštěva místa, sebraný předmět), ne jen `typ: 'boj'`.
//
// BOJOVY_CIL_PODLE_LOKACE zůstává výslovná tabulka (stejný vzor jako
// NEPRATELE_PODLE_LOKACE / SVETY_PODLE_LOKACE) místo odvozování
// "vyhraj na lokaci questu = spinil jsi jeho první cíl" — quest, který
// se plní soubojem na víc než jedné lokaci, by odvozený vztah nešel
// vůbec zapsat.
//
// Tři questy zatím — Ztracené štěně (Emberfall, vertikální řez z Fáze
// 1), Probuzený les (Greenhaven) a Probuzená královna (Voidspire),
// obě z Fáze 10. Zbylých 27 questů ze Season 1 se přidává stejným
// vzorem — nová položka sem + odpovídající nepřítel v nepratele.ts +
// vlastní SvetKonfigurace ve world.ts. Lokace samotná (lokace.ts)
// nemusí být nová ani měnit typ — viz Greenhaven/Voidspire, oba pořád
// 'mesto', 3D svět jen zpřístupní přítomnost ve SVETY_PODLE_LOKACE
// (Fáze 7).
// ==========================================

export type TypCile = 'boj'

export interface QuestCil {
  id: string
  /** Text checklistu — co má hráč konkrétně udělat, viz Questy.tsx a list místa v MapaSveta.tsx. */
  popis: string
  typ: TypCile
}

export interface Quest {
  id: string
  nazev: string
  /** Lokace na mapě, kde se quest přijímá a kde má svůj 3D svět. */
  lokaceId: string
  /** Úvodní text — proč quest vůbec existuje, ukazuje se před přijetím. */
  popis: string
  cile: QuestCil[]
  /** Krátký popisek odměny pro list místa — skutečná čísla dává
   *  nepřítel v combat/nepratele.ts, tohle je jen text k přečtení. */
  odmenaPopis: string
  /** Id sekvence v data/story.ts, přehraje se hned po přijetí questu
   *  (MapaSveta.tsx). Volitelné — quest bez příběhu prostě žádný
   *  dialog nespustí. */
  dialogPriPrijeti?: string
  /** Id sekvence v data/story.ts, přehraje se po výhře v souboji, co
   *  quest doopravdy dokončil (GameModule.tsx, mezi soubojem a
   *  návratem na mapu — přesně "Story" krok herní smyčky). */
  dialogPriDokonceni?: string
}

export const QUESTS: Quest[] = [
  {
    id: 'ztracene-stene',
    nazev: 'Ztracené štěně',
    lokaceId: 'emberfall',
    popis:
      'Stará vdova z Emberfallu shání svého psa — zaběhl do polí za městem právě ve chvíli, kdy se odtamtud přivalila podivná stínová mlha.',
    cile: [{ id: 'porazit-vlcaka', popis: 'Poraz Stínovlčáka, který štěněti stojí v cestě.', typ: 'boj' }],
    odmenaPopis: 'XP, kredity z boje a vděčnost celého Emberfallu.',
    dialogPriPrijeti: 'ztracene-stene-prijeti',
    dialogPriDokonceni: 'ztracene-stene-dokonceni',
  },
  {
    id: 'probuzeny-les',
    nazev: 'Probuzený les',
    lokaceId: 'greenhaven',
    popis:
      'Trní a zkažená zvěř se v noci plíží až k hradbám Greenhavenu — hlídka tvrdí, že to všechno vychází ze srdce Věčného lesa, kde odjakživa panoval klid.',
    cile: [{ id: 'porazit-strazce-lesa', popis: 'Vydej se do Věčného lesa a poraz to, co v něm probudilo trní.', typ: 'boj' }],
    odmenaPopis: 'XP, kredity z boje a garantovaná relikvie Strážce lesa.',
    dialogPriPrijeti: 'probuzeny-les-prijeti',
    dialogPriDokonceni: 'probuzeny-les-dokonceni',
  },
  {
    id: 'probuzena-kralovna',
    nazev: 'Probuzená královna',
    lokaceId: 'voidspire',
    popis:
      'Z Voidspire hlásí strážní věže podivné siluety mezi kopci Shadowveilu — a každou noc se přibližují o kus blíž k hradbám.',
    cile: [{ id: 'porazit-stinovou-kralovnu', popis: 'Vydej se do Shadowveilu a poraz Stínovou královnu.', typ: 'boj' }],
    odmenaPopis: 'XP, kredity z boje a garantovaná relikvie Stínové královny.',
    dialogPriPrijeti: 'probuzena-kralovna-prijeti',
    dialogPriDokonceni: 'probuzena-kralovna-dokonceni',
  },
]

/** Lokace -> (quest, cíl), který se plní výhrou v souboji na téhle
 *  lokaci. GameModule.tsx po výhře zavolá `splnitCil(questId, cilId)`
 *  — souboj samotný o questech neví nic (viz Souboj.tsx `onVyhra`). */
export const BOJOVY_CIL_PODLE_LOKACE: Record<string, { questId: string; cilId: string }> = {
  emberfall: { questId: 'ztracene-stene', cilId: 'porazit-vlcaka' },
  greenhaven: { questId: 'probuzeny-les', cilId: 'porazit-strazce-lesa' },
  voidspire: { questId: 'probuzena-kralovna', cilId: 'porazit-stinovou-kralovnu' },
}
