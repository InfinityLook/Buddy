import type { KatalogDilo } from './libraryTypes'

// ==========================================
// Ukázkové tituly zabudované v appce. Zobrazí se jen dokud katalog v
// databázi neobsahuje žádné zveřejněné dílo (nebo když je appka bez
// cloudu), ať police není prázdná. Jsou to krátké původní texty, ne cizí
// díla; v detailu jsou označené jako ukázky.
// ==========================================

export const UKAZKOVA_DILA: readonly KatalogDilo[] = [
  {
    id: 'ukazka-valley',
    zdroj: 'ukazka',
    druh: 'kniha',
    title: 'Světla v údolí',
    summary: 'Když v údolí zhasnou všechna světla, jedno se rozsvítí právě pro tebe.',
    autor: 'Buddy',
    coverUrl: '/book-menu/covers/zlaty-soumrak.png',
    foil: '#FFD5A0',
    vek: 'vsichni',
    licence: 'vlastni',
    zanry: ['dobrodružství'],
    ukazka: [
      'V údolí se rozsvěcelo od kraje ke kraji. Nejdřív mlýn, potom dům u mostu a nakonec malá lampa pod oknem, které už roky nikdo neotevřel.',
      'Dnes večer ale všechno zhaslo najednou. Jen lampa pod oknem zůstala svítit. Když Ela vyšla před dům, pochopila proč. V jejím světle ležela čerstvá stopa, která vedla do kopce.',
    ],
  },
  {
    id: 'ukazka-aurora',
    zdroj: 'ukazka',
    druh: 'kniha',
    title: 'Za polární září',
    summary: 'Výprava přes zamrzlé jezero za světlem, které se objeví jen jednou za zimu.',
    autor: 'Buddy',
    coverUrl: '/book-menu/covers/polarni-zare.png',
    foil: '#B4F6DF',
    vek: 'vsichni',
    licence: 'vlastni',
    zanry: ['dobrodružství'],
    ukazka: [
      'Led u břehu byl tak průzračný, že pod ním šlo spočítat kameny. Mira přitáhla šálu k bradě. Za horou se v tu chvíli objevila první zelená stuha.',
      'Na mapě vedla cesta rovně přes jezero. Na skutečném jezeře jí ale cestu křížily drobné modré odlesky. Mira zhasla baterku. Bez ní najednou uviděla, že každý odlesk ukazuje dál k protějšímu břehu.',
    ],
  },
  {
    id: 'ukazka-forest',
    zdroj: 'ukazka',
    druh: 'kniha',
    title: 'Les za mapou',
    summary: 'Na poslední stránce staré mapy je místo, které nenajdeš v žádném atlasu.',
    autor: 'Buddy',
    coverUrl: '/book-menu/covers/lesni-klid.png',
    foil: '#D9E8AA',
    vek: 'vsichni',
    licence: 'vlastni',
    zanry: ['fantasy'],
    ukazka: [
      'Na vybledlé mapě končil les u řeky. Tonička však viděla, že na druhém břehu rostou stejné kapradiny. Odhodlala se přejít první kámen.',
      'Na zadní straně mapy se objevil nový tah tužkou. „Teď už můžeš kreslit sama,“ stálo u něj. A za smrkem se ozval zvuk, který se nejvíc podobal škrtání o papír.',
    ],
  },
  {
    id: 'ukazka-neon',
    zdroj: 'ukazka',
    druh: 'komiks',
    title: 'Neon po půlnoci',
    summary: 'Poslední tramvaj v neonovém městě míří na zastávku, kterou nikdo nezná.',
    autor: 'Buddy',
    coverUrl: '/book-menu/covers/neonova-noc.png',
    foil: '#F4B7FF',
    vek: 'vsichni',
    licence: 'vlastni',
    zanry: ['sci-fi'],
    ukazka: [
      'Déšť kreslí do výlohy modré čáry. Na zastávce stojí Leo s pomačkanou jízdenkou. Zpoza rohu se vynoří tramvaj s prázdnou cedulí.',
      'Řidička ukáže na sedadlo u okna. „Jestli jedeš na konečnou, drž se té jízdenky.“ Leo ji obrátí. Na rubu je vytištěný jeho vlastní podpis.',
    ],
  },
  {
    id: 'ukazka-mist',
    zdroj: 'ukazka',
    druh: 'komiks',
    title: 'Údolí beze stínu',
    summary: 'V bílém údolí zmizí stíny. Kromě jednoho, který se vydá vlastní cestou.',
    autor: 'Buddy',
    coverUrl: '/book-menu/covers/cisty-den.png',
    foil: '#D9D8FF',
    vek: 'vsichni',
    licence: 'vlastni',
    zanry: ['fantasy'],
    ukazka: [
      'Po ránu je celé údolí bílé. Kamila zvedne ruku a všimne si, že její stín zůstává stát u dveří.',
      'Stín ukáže na hřeben. Pod první modrou špičkou se v dálce otevře úzká mezera. Kamila vezme kabát a nechá dveře pootevřené.',
    ],
  },
]
