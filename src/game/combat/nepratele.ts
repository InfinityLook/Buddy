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
// lokace, jen tři pole na existujícím záznamu. Dungeon jich zatím má
// jednoho, na konci (Strážce jeskyně) — pojmenovaní bossové ze Season 1
// (Forest Guardian, Rootmother, …) přibydou stejným vzorem, až přibydou
// i jejich lokace.
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
}
