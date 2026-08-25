// ==========================================
// Vybavení (Fáze 9, character progression) — relikvie, co postava
// nosí, ne spotřebuje. Třetí odlišná mechanika vedle obchodu
// (obchod/predmety.ts, trvalé účtové vylepšení, žádná volba) a batohu
// (data/items.ts, spotřební, počítané kusy) — vybavení se VLASTNÍ
// jednou (jako obchod), ale na rozdíl od obchodu se dá kdykoli
// nasadit/sundat a je vázané na KONKRÉTNÍ postavu (jako její úroveň a
// dovednosti v leveling.ts), ne na účet jako celek. Sdílený typ by tyhle
// tři různé mechaniky jen tvářil jako jednu a pletl by je — proto
// vlastní typ, vlastní store (useVybaveniStore.ts).
//
// Získává se garantovaně, ne losem jako batohový loot (Nepritel.lupId/
// sanceNaLup) — poražení konkrétního bosse odemkne jeho signální
// relikvii natrvalo (viz combat/types.ts Nepritel.vybaveniId,
// Souboj.tsx). Každý boss ze Season 1 (Fáze 10) přidává vlastní
// relikvii stejným vzorem — jeden záznam navíc tady + vybaveniId na
// jeho Nepritel, žádná nová soustava.
// ==========================================

export interface Vybaveni {
  id: string
  nazev: string
  popis: string
  ikona: string
  /** Odkud pochází — jen pro zobrazení (Hrdina.tsx), žádná herní logika. */
  zdroj: string
  /** Bonusy ve stejném tvaru jako combat/useSouboj.ts BojoveStatistiky —
   *  vypocitejBojoveStatistiky je přičítá k postavě/úrovni/obchodu. */
  bonusVydrz: number
  bonusPoskozeni: number
  bonusKriticka: number
}

export const VYBAVENI: Vybaveni[] = [
  {
    id: 'amulet-strazce',
    nazev: 'Amulet strážce',
    popis: 'Relikvie poraženého Strážce jeskyně — chrání nositele a bystří jeho reflexy.',
    ikona: '🔱',
    zdroj: 'Poraz Strážce jeskyně (dungeon Molten Core)',
    bonusVydrz: 12,
    bonusPoskozeni: 0,
    bonusKriticka: 0.04,
  },
  {
    // Druhá relikvie (Fáze 10, Season 1) — od Strážce lesa (Greenhaven/
    // Věčný les). Útočná, na rozdíl od amuletu — dvě relikvie teď
    // nabízí skutečnou volbu buď/nebo (obě zabírají stejné, jediné
    // vybavené místo), ne jen druhý kus se stejným efektem.
    id: 'trnova-koruna',
    nazev: 'Trnová koruna',
    popis: 'Relikvie poraženého Strážce lesa — dodává úderům trnitou sílu.',
    ikona: '🌿',
    zdroj: 'Poraz Strážce lesa (Věčný les u Greenhavenu)',
    bonusVydrz: 4,
    bonusPoskozeni: 0.08,
    bonusKriticka: 0,
  },
  {
    // Třetí relikvie (Fáze 10, Season 1) — od Stínové královny
    // (Voidspire/Shadowveil). Vychýlená na kritickou šanci, kde
    // předchozí dvě byly vydrž/poškození — tři relikvie teď pokrývají
    // tři různé archetypy postavy (obranář/útočník/riskér), ne tři
    // varianty téhož.
    id: 'stinovy-plast',
    nazev: 'Stínový plášť',
    popis: 'Relikvie poražené Stínové královny — halí nositele stínem a bystří jeho úder na slabá místa.',
    ikona: '🖤',
    zdroj: 'Poraz Stínovou královnu (Shadowveil u Voidspire)',
    bonusVydrz: 2,
    bonusPoskozeni: 0,
    bonusKriticka: 0.08,
  },
  {
    // Čtvrtá relikvie (Fáze 10, Season 1) — od Zamrzlého strážce
    // (Frostheim/Frosthold). Čistě obranná, žádné poškození ani
    // kritická šance navíc — na rozdíl od Amuletu strážce (vydrž +
    // kritická šance dohromady) je tohle "zeď", ne všestranný kus.
    id: 'ledovy-stit',
    nazev: 'Ledový štít',
    popis: 'Relikvie poraženého Zamrzlého strážce — mráz kolem nositele vydrží i ty nejtvrdší rány.',
    ikona: '🛡️',
    zdroj: 'Poraz Zamrzlého strážce (Frosthold u Frostheimu)',
    bonusVydrz: 16,
    bonusPoskozeni: 0,
    bonusKriticka: 0,
  },
  {
    // Pátá relikvie (Fáze 10) — od Prvního strážce (Solace, finále
    // hlavní dějové linky Season 1). Záměrně nejsilnější ze všech pěti
    // a všestranná (všechny tři bonusy zároveň, ne jeden dominantní) —
    // odměna za finálový souboj má být citelně lepší než čtyři
    // specializované relikvie z cesty k němu, ne jen další z řady.
    id: 'koruna-prvniho-strazce',
    nazev: 'Koruna prvního strážce',
    popis: 'Relikvie Prvního strážce, matky všech ostatních — nese v sobě kus síly každého z nich.',
    ikona: '👑',
    zdroj: 'Poraz Prvního strážce (krypta pod Solace)',
    bonusVydrz: 10,
    bonusPoskozeni: 0.06,
    bonusKriticka: 0.05,
  },
]
