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
// Souboj.tsx). Zatím jedna položka, od jediného existujícího bosse
// (Strážce jeskyně) — další bossové (Fáze 10, Season 1) přinesou
// vlastní stejným vzorem, jeden záznam navíc tady + vybaveniId na
// jejich Nepritel.
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
]
