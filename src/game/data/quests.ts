// ==========================================
// Questy — data-driven, ne zadrátované v JSX. Tenhle soubor drží jen
// TEXT a VAZBU na lokaci; skutečná odměna (XP, kredity) žije tam, kde
// vždycky žila — u nepřítele v combat/nepratele.ts — aby nikdy
// nevznikly dvě čísla pro tutéž věc. Splnění questu se řeší přes
// QUEST_PODLE_LOKACE: GameModule.tsx po výhře v souboji na dané
// lokaci zjistí odsud, který quest se má označit za splněný (viz
// Souboj.tsx `onVyhra`) — samotný souboj o questech neví nic.
//
// Zatím je tu jeden quest (Ztracené štěně, Emberfall) jako vertikální
// řez celým herním smyčkem: MAPA → LOKACE → 3D SVĚT → PRŮZKUM →
// SETKÁNÍ → SOUBOJ → ODMĚNA → QUEST SPLNĚN → XP → ZPĚT NA MAPU.
// Zbylých 29 questů ze Season 1 se přidává stejným vzorem — nová
// položka sem + nová lokace v lokace.ts + nový nepřítel v
// nepratele.ts + případně vlastní SvetKonfigurace ve world.ts.
// ==========================================

export interface Quest {
  id: string
  nazev: string
  /** Lokace na mapě, ke které je quest vázaný — MapaSveta podle ní
   *  ukazuje detail questu v listu místa. */
  lokaceId: string
  /** Úvodní text — proč quest vůbec existuje. */
  popis: string
  /** Co má hráč konkrétně udělat. */
  cil: string
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
    cil: 'Projdi pole za Emberfallem a poraz Stínovlčáka, který štěněti stojí v cestě.',
    odmenaPopis: 'XP, kredity z boje a vděčnost celého Emberfallu.',
  },
]

/** Lokace -> quest, který se touto lokací plní. Jedna lokace = jeden
 *  aktivní quest (žádná lokace jich zatím nemá víc), proto obyčejný
 *  slovník místo pole. */
export const QUEST_PODLE_LOKACE: Record<string, string> = {
  emberfall: 'ztracene-stene',
}
