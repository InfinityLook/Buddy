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
// Zatím je tu jeden quest (Ztracené štěně, Emberfall) jako vertikální
// řez celým herním smyčkem. Zbylých 29 questů ze Season 1 se přidává
// stejným vzorem — nová položka sem + nová lokace v lokace.ts + nový
// nepřítel v nepratele.ts + případně vlastní SvetKonfigurace ve
// world.ts.
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
  },
]

/** Lokace -> (quest, cíl), který se plní výhrou v souboji na téhle
 *  lokaci. GameModule.tsx po výhře zavolá `splnitCil(questId, cilId)`
 *  — souboj samotný o questech neví nic (viz Souboj.tsx `onVyhra`). */
export const BOJOVY_CIL_PODLE_LOKACE: Record<string, { questId: string; cilId: string }> = {
  emberfall: { questId: 'ztracene-stene', cilId: 'porazit-vlcaka' },
}
