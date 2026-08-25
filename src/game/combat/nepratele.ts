import { Nepritel } from './types'

// ==========================================
// Nepřátelé klíčovaní podle id místa na mapě (lokace.ts), které boj
// spouští. Každé místo dostává pole nepřátel, ne jednoho — u arény jde
// o jediného soupeře jako dřív, u dungeonu o víc soupeřů za sebou
// (viz useSouboj.ts): hráčova výdrž se mezi nimi neobnovuje, takže
// dungeon je skutečně náročnější zkouška, ne aréna s jiným jménem.
// Odměna se sčítá za každého poraženého — dokončit celý dungeon proto
// vyplatí o dost víc než jeden soubojek v aréně.
//
// Další bojová lokace je stejným vzorem jeden záznam navíc tady, žádná
// změna v MapaSveta.tsx/Souboj.tsx.
//
// Boss (Fáze 8) je jen Nepritel s jeBoss/zuriPodHp/zuriNasobicPoskozeni
// navíc (viz types.ts) — žádný nový záznam v týhle mapě, žádná nová
// lokace, jen tři pole na existujícím záznamu. Dungeon má jednoho, na
// konci (Strážce jeskyně); Greenhaven, Voidspire a Frostheim (Fáze 10,
// Season 1) mají každý svého, rovnou jako své jediné setkání (stejný
// tvar jako Emberfall — jeden Nepritel v poli, ne dungeonová série).
// Poslední pojmenovaný boss ze Season 1 (The First Guardian, Solace)
// přibyde stejným vzorem, až přibyde i jeho lokace.
// ==========================================

export const NEPRATELE_PODLE_LOKACE: Record<string, Nepritel[]> = {
  'arena-krvavy-kruh': [
    {
      id: 'arena-mistr',
      jmeno: 'Aréna mistr',
      ikona: '🗡️',
      zivoty: 80,
      poskozeniOd: 6,
      poskozeniDo: 12,
      odmenaXp: 40,
      odmenaKredity: 25,
      lupId: 'lecivy-lektvar',
      sanceNaLup: 0.4,
    },
  ],

  // Setkání se spouští v 3D průzkumu (Explorace3D.tsx), ne klepnutím na
  // pin — hráč k němu musí dojít world.ts SVETY_PODLE_LOKACE.emberfall
  // pozici. Souboj samotný pak běží beze změny ve 2D (Souboj.tsx).
  emberfall: [
    {
      id: 'stinovy-vlcak',
      jmeno: 'Stínovlčák',
      ikona: '🐺',
      zivoty: 45,
      poskozeniOd: 4,
      poskozeniDo: 9,
      odmenaXp: 20,
      odmenaKredity: 12,
      lupId: 'lecivy-lektvar',
      sanceNaLup: 0.5,
    },
  ],

  'dungeon-stinne-jeskyne': [
    {
      id: 'jeskynni-krysak',
      jmeno: 'Jeskynní krysák',
      ikona: '🐀',
      zivoty: 50,
      poskozeniOd: 4,
      poskozeniDo: 8,
      odmenaXp: 15,
      odmenaKredity: 10,
    },
    {
      id: 'stinovy-plazivec',
      jmeno: 'Stínový plazivec',
      ikona: '🕷️',
      zivoty: 70,
      poskozeniOd: 6,
      poskozeniDo: 11,
      odmenaXp: 25,
      odmenaKredity: 15,
    },
    {
      // První boss (Fáze 8) — už dřív byl posledním a nejsilnějším ze
      // tří soupeřů dungeonu, teď k tomu dostal i skutečnou zuřivou
      // fázi: pod 40 % životů násobí protiútok 1,6× (viz combat/
      // useSouboj.ts vyhodnotAkci) a poražení odemyká odznak "Přemožitel
      // strážce" (viz useGamificationStore.ts, ActivityKind 'boss').
      id: 'strazce-jeskyne',
      jmeno: 'Strážce jeskyně',
      ikona: '👹',
      zivoty: 100,
      poskozeniOd: 8,
      poskozeniDo: 14,
      odmenaXp: 60,
      odmenaKredity: 40,
      lupId: 'lecivy-lektvar',
      sanceNaLup: 0.6,
      jeBoss: true,
      zuriPodHp: 0.4,
      zuriNasobicPoskozeni: 1.6,
      vybaveniId: 'amulet-strazce',
    },
  ],

  // Druhá lokace Season 1 (Fáze 10) — stejný tvar jako Emberfall
  // (jedno 'explorace' setkání, jeden Nepritel), tady rovnou boss.
  greenhaven: [
    {
      id: 'strazce-lesa',
      jmeno: 'Strážce lesa',
      ikona: '🌳',
      zivoty: 90,
      poskozeniOd: 7,
      poskozeniDo: 13,
      odmenaXp: 45,
      odmenaKredity: 30,
      lupId: 'lecivy-lektvar',
      sanceNaLup: 0.5,
      jeBoss: true,
      zuriPodHp: 0.4,
      zuriNasobicPoskozeni: 1.5,
      vybaveniId: 'trnova-koruna',
    },
  ],

  // Třetí lokace Season 1 (Fáze 10) — Stínová královna, "Shadow Queen"
  // ze zadání. Stejný tvar jako Greenhaven: jedno 'explorace' setkání,
  // rovnou boss.
  voidspire: [
    {
      id: 'stinova-kralovna',
      jmeno: 'Stínová královna',
      ikona: '🌑',
      zivoty: 95,
      poskozeniOd: 8,
      poskozeniDo: 15,
      odmenaXp: 50,
      odmenaKredity: 35,
      lupId: 'lecivy-lektvar',
      sanceNaLup: 0.5,
      jeBoss: true,
      zuriPodHp: 0.4,
      zuriNasobicPoskozeni: 1.55,
      vybaveniId: 'stinovy-plast',
    },
  ],

  // Čtvrtá lokace Season 1 (Fáze 10) — Zamrzlý strážce, "Frozen
  // Guardian" ze zadání. Stejný tvar jako Greenhaven/Voidspire.
  frostheim: [
    {
      id: 'zamrzly-strazce',
      jmeno: 'Zamrzlý strážce',
      ikona: '🧊',
      zivoty: 100,
      poskozeniOd: 9,
      poskozeniDo: 16,
      odmenaXp: 55,
      odmenaKredity: 38,
      lupId: 'lecivy-lektvar',
      sanceNaLup: 0.5,
      jeBoss: true,
      zuriPodHp: 0.4,
      zuriNasobicPoskozeni: 1.6,
      vybaveniId: 'ledovy-stit',
    },
  ],
}
