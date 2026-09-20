export interface KrokProgramu {
  nazev: string
  sekund: number
  // Krátký hlasový pokyn navíc k názvu kroku — appka ho přečte hned za
  // jménem pozice ("Pes hlavou dolů. Zvedni boky vzhůru..."). Jen jógové
  // a mobilitní programy ho mají; rozcvička/strečink zůstávají u pouhého
  // jména kroku, stejné hlasové chování jako předtím, než tenhle soubor
  // vznikl.
  popis?: string
}

export type KategorieProgramu = 'rozcvicka' | 'strecink' | 'joga'

export interface ProgramRozcvicky {
  id: string
  nazev: string
  ikona: string
  kategorie: KategorieProgramu
  popis: string
  kroky: KrokProgramu[]
}

export const NAZEV_KATEGORIE: Record<KategorieProgramu, string> = {
  rozcvicka: 'Rozcvička',
  strecink: 'Strečink',
  joga: 'Jóga',
}

// ==========================================
// Pevná sada programů pro RozcvickaCasovac.tsx — appka záměrně nenabízí
// vlastní sestavování sledu kroků, jen výběr z hotových programů. Stejná
// "pevná sada, ne libovolný vstup" zásada jako appčiny barevné palety/
// ikonové sady jinde (Kalendářovy BARVY_DNE, Socialovy IKONY_SKUPIN,
// Rutiny's RUTINY vedle).
//
// Fáze 3 Fitness Roomova rozšiřování — appka dřív měla jen dva pevné
// režimy (rozcvička/strečink, oba bez popis) přímo jako konstanty uvnitř
// RozcvickaCasovac.tsx. Přesunuto sem a rozšířeno o čtyři jógové/
// mobilitní programy, aby "hlasový průvodce" znamenal doopravdy něco
// navíc, ne jen jméno pozice — jóga potřebuje krátký pokyn, jak přesně
// pozici udělat, na rozdíl od rozcvičkových kroků, co jsou samovysvětlující
// (Dřepy naprázdno, Rotace trupu).
// ==========================================
export const PROGRAMY_ROZCVICKY: ProgramRozcvicky[] = [
  {
    id: 'rozcvicka-pred-treninkem',
    nazev: 'Rozcvička před tréninkem',
    ikona: '🔥',
    kategorie: 'rozcvicka',
    popis: 'Rychlé rozproudění před cvičením',
    kroky: [
      { nazev: 'Kroužení pažemi', sekund: 20 },
      { nazev: 'Rotace trupu', sekund: 20 },
      { nazev: 'Vysoké kroky na místě', sekund: 30 },
      { nazev: 'Dřepy naprázdno', sekund: 20 },
      { nazev: 'Protažení lýtek v předklonu', sekund: 20 },
    ],
  },
  {
    id: 'strecink-po-treninku',
    nazev: 'Strečink po tréninku',
    ikona: '🧘',
    kategorie: 'strecink',
    popis: 'Protažení hlavních svalových skupin',
    kroky: [
      { nazev: 'Protažení čtyřhlavého svalu', sekund: 30 },
      { nazev: 'Protažení hamstringů', sekund: 30 },
      { nazev: 'Protažení lýtek', sekund: 30 },
      { nazev: 'Protažení zad (kočka)', sekund: 30 },
      { nazev: 'Protažení ramen', sekund: 30 },
    ],
  },
  {
    id: 'ranni-joga',
    nazev: 'Ranní jóga',
    ikona: '🌅',
    kategorie: 'joga',
    popis: 'Krátký sled pozic na nastartování dne',
    kroky: [
      { nazev: 'Hora', sekund: 20, popis: 'Postav se zpříma, dlaně u těla, zhluboka dýchej.' },
      { nazev: 'Předklon', sekund: 25, popis: 'Ohni se v pase, uvolni šíji a ramena.' },
      { nazev: 'Pes hlavou dolů', sekund: 30, popis: 'Zvedni boky vzhůru, natáhni paty k zemi.' },
      { nazev: 'Prkno', sekund: 20, popis: 'Zpevni celé tělo do jedné rovné linky.' },
      { nazev: 'Dítě', sekund: 30, popis: 'Sedni si na paty, ruce natáhni dopředu, uvolni se.' },
    ],
  },
  {
    id: 'joga-na-zada',
    nazev: 'Jóga na záda',
    ikona: '🐈',
    kategorie: 'joga',
    popis: 'Uvolnění páteře a zad',
    kroky: [
      { nazev: 'Kočka a kráva', sekund: 30, popis: 'Střídej prohnutí a kulacení zad s dechem.' },
      { nazev: 'Dítě', sekund: 30, popis: 'Sedni si na paty, ruce natáhni dopředu.' },
      { nazev: 'Otočení trupu vsedě', sekund: 25, popis: 'Sedni si a otoč trup nejdřív na jednu, pak na druhou stranu.' },
      { nazev: 'Sfinga', sekund: 25, popis: 'Lehni na břicho, podepři se na předloktí, zvedni hrudník.' },
      { nazev: 'Ležící zkroucení', sekund: 30, popis: 'Lehni na záda, kolena polož na jednu stranu, hlavu na druhou.' },
    ],
  },
  {
    id: 'mobilita-kycli',
    nazev: 'Mobilita kyčlí a kolen',
    ikona: '🦵',
    kategorie: 'joga',
    popis: 'Uvolnění kyčlí po sezení nebo před tréninkem nohou',
    kroky: [
      { nazev: 'Hluboký dřep', sekund: 30, popis: 'Dřepni si co nejníž, lokty tlač proti kolenům.' },
      { nazev: 'Motýlek', sekund: 30, popis: 'Sedni si, spoj chodidla a jemně tlač kolena k zemi.' },
      { nazev: 'Nízký výpad s rotací', sekund: 25, popis: 'Udělej výpad a otoč trup k přední noze.' },
      { nazev: 'Holubí pozice', sekund: 30, popis: 'Přední nohu skrč před sebou, zadní natáhni dozadu.' },
      { nazev: 'Protažení tříselní', sekund: 25, popis: 'Klekni na jedno koleno a tlač boky dopředu.' },
    ],
  },
  {
    id: 'joga-na-uvolneni',
    nazev: 'Jóga na uvolnění',
    ikona: '🌙',
    kategorie: 'joga',
    popis: 'Klidný sled na konec dne',
    kroky: [
      { nazev: 'Ležící motýlek', sekund: 40, popis: 'Lehni na záda, spoj chodidla a nech kolena klesnout do stran.' },
      { nazev: 'Nohy na zdi', sekund: 40, popis: 'Lehni si a opři nohy o zeď nebo je jen zvedni nahoru.' },
      { nazev: 'Dítě s prodlouženými pažemi', sekund: 30, popis: 'Sedni si na paty a natáhni paže co nejdál dopředu.' },
      { nazev: 'Ležící zkroucení', sekund: 30, popis: 'Lehni na záda, kolena polož nejdřív na jednu, pak druhou stranu.' },
      { nazev: 'Šávásana', sekund: 40, popis: 'Lehni si na záda, uvolni celé tělo a zavři oči.' },
    ],
  },
]
