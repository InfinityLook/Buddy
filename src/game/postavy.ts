import { Postava } from './types'

// ==========================================
// Pět postav na výběr při vstupu do hry — druhá generace, nahrazuje
// dřívější Angel/Aryn/Gron/Mya/Loxen podle referenčního obrázku
// "Buddy Realm — Heroes". Portréty (public/postavy/*.jpg) jsou
// oříznuté karty přímo z té reference (280×764 px, ořezáno Pillow
// stejným postupem jako mapa v public/backgrounds/) — obrázek už
// sám nese jméno/titul/živel/roli jako součást ilustrace, proto ho
// PostavaKarta.tsx zobrazuje celý, ne jen tvář.
//
// Bojové vlastnosti (bojZivel, bojKriticka, bojKritickyNasobic,
// bojVydrz) skutečně krmí souboj v combat/useSouboj.ts, stejně jako
// u předchozí generace — bojNasobicPoskozeni zůstává jednotných 1.3
// u všech, rozdíl mezi postavami dělá výdrž a kritický zásah podle
// role z reference: Kael (Tank/Balanced) má nejvyšší výdrž, Rayen
// (DPS/Assassin) nejvyšší kritiku, Elara (Healer/Support) solidní
// výdrž bez výrazné kritiky, Drakon (DPS/Bruiser) kombinuje obojí,
// Lyra (Mage/Support) má naopak nevýhodu dražšího obchodu — převzala
// tak roli, kterou dřív měl Angel. obchodNasobicCeny čte Obchod.tsx.
//
// Zeme jako živel zůstala (viz karty.ts), jen přeznačená na Přírodu —
// Elařin živel z reference je Nature, ne kámen.
//
// specialniSchopnost (Fáze 4, combat system) dává každé postavě jednu
// signální schopnost mimo karetní balíček, použitelnou jednou za
// souboj — reálná taktická volba navíc k "kterou ze tří karet zahrát".
// Typ schopnosti odpovídá roli z reference: Kael (Tank) blokuje,
// Elara (Healer) léčí, Lyra/Rayen (Mage/Assassin) mají jistý silný
// zásah, Drakon (Bruiser) nejvyšší poškození za cenu vlastní výdrže.
// ==========================================

export const POSTAVY: Postava[] = [
  {
    id: 'kael',
    jmeno: 'Kael',
    popis: 'Voda a neochvějná výdrž',
    ikona: '🗡️',
    portret: '/postavy/kael.jpg',
    barva: '#3b82f6',
    bonusy: ['Bonus na vodní kartičky', 'Největší výdrž ze všech postav'],
    nevyhoda: null,
    bojZivel: 'voda',
    bojNasobicPoskozeni: 1.3,
    bojKriticka: 0.12,
    bojKritickyNasobic: 1.5,
    bojVydrz: 150,
    obchodNasobicCeny: 1,
    specialniSchopnost: {
      nazev: 'Vodní štít',
      popis: 'Vytvoří vodní štít, který úplně pohltí příští útok nepřítele.',
      ikona: '🛡️',
      typ: 'stit',
      hodnotaOd: 0,
      hodnotaDo: 0,
      vlastniNaklad: 0,
    },
  },
  {
    id: 'lyra',
    jmeno: 'Lyra',
    popis: 'Arkána a moudrost, za cenu plného měšce',
    ikona: '🔮',
    portret: '/postavy/lyra.jpg',
    barva: '#a78bfa',
    bonusy: ['Bonus na arkánní kartičky', 'Solidní kritický zásah'],
    nevyhoda: 'Všechno v obchodě je o 20 % dražší',
    bojZivel: 'arkana',
    bojNasobicPoskozeni: 1.3,
    bojKriticka: 0.15,
    bojKritickyNasobic: 1.75,
    bojVydrz: 100,
    obchodNasobicCeny: 1.2,
    specialniSchopnost: {
      nazev: 'Arkánní příval',
      popis: 'Vypustí čistou arkánní energii — jistý zásah bez ohledu na kartu v ruce.',
      ikona: '💥',
      typ: 'poskozeni',
      hodnotaOd: 20,
      hodnotaDo: 28,
      vlastniNaklad: 0,
    },
  },
  {
    id: 'rayen',
    jmeno: 'Rayen',
    popis: 'Plamen a nejostřejší kritický zásah',
    ikona: '🥷',
    portret: '/postavy/rayen.jpg',
    barva: '#ef4444',
    bonusy: ['Bonus na ohnivé kartičky', 'Největší kritický bonus ze všech postav'],
    nevyhoda: null,
    bojZivel: 'ohen',
    bojNasobicPoskozeni: 1.3,
    bojKriticka: 0.3,
    bojKritickyNasobic: 2,
    bojVydrz: 100,
    obchodNasobicCeny: 1,
    specialniSchopnost: {
      nazev: 'Zákeřný úder',
      popis: 'Jediný přesný zásah do slabiny — nejvyšší jistá rána ze všech postav.',
      ikona: '🗡️',
      typ: 'poskozeni',
      hodnotaOd: 26,
      hodnotaDo: 36,
      vlastniNaklad: 0,
    },
  },
  {
    id: 'elara',
    jmeno: 'Elara',
    popis: 'Příroda a pevné zdraví',
    ikona: '🌿',
    portret: '/postavy/elara.jpg',
    barva: '#22c55e',
    bonusy: ['Bonus na přírodní kartičky', 'Dobrá výdrž'],
    nevyhoda: null,
    bojZivel: 'zeme',
    bojNasobicPoskozeni: 1.3,
    bojKriticka: 0.1,
    bojKritickyNasobic: 1.5,
    bojVydrz: 130,
    obchodNasobicCeny: 1,
    specialniSchopnost: {
      nazev: 'Přírodní obnova',
      popis: 'Přivolá sílu přírody a doplní si výdrž.',
      ikona: '💚',
      typ: 'leceni',
      hodnotaOd: 22,
      hodnotaDo: 30,
      vlastniNaklad: 0,
    },
  },
  {
    id: 'drakon',
    jmeno: 'Drakon',
    popis: 'Temnota, ze které není úniku',
    ikona: '🐉',
    portret: '/postavy/drakon.jpg',
    barva: '#7e22ce',
    bonusy: ['Bonus na temné kartičky', 'Vysoká výdrž i útočnost'],
    nevyhoda: null,
    bojZivel: 'tma',
    bojNasobicPoskozeni: 1.3,
    bojKriticka: 0.2,
    bojKritickyNasobic: 1.75,
    bojVydrz: 140,
    obchodNasobicCeny: 1,
    specialniSchopnost: {
      nazev: 'Dračí zuřivost',
      popis: 'Vrhne se do útoku bez ohledu na vlastní bezpečí — nejvyšší poškození ze všech, ale i sám sebe zraní.',
      ikona: '🔥',
      typ: 'poskozeni',
      hodnotaOd: 30,
      hodnotaDo: 42,
      vlastniNaklad: 12,
    },
  },
]
