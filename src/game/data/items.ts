// ==========================================
// Loot — předměty, které upadávají poraženým nepřátelům (viz
// combat/types.ts Nepritel.lupId/sanceNaLup), ukládají se do
// useInventarStore.ts a dají se použít přímo v souboji (Souboj.tsx).
//
// Schválně JINÝ systém než src/game/obchod/predmety.ts — obchod
// prodává trvalá, jednou-koupená vylepšení za kredity (Predmet tam,
// vlastnictví jako boolean v useWalletStore.ownedItems), loot je
// spotřební věc sbíraná v souboji, dá se jí mít víc kusů a použitím
// se spotřebuje. Dvě různé mechaniky by se sdíleným datovým typem jen
// tvářily jako jedna a pletly by se — proto vlastní typ (Lup), vlastní
// store, vlastní tabulka.
// ==========================================

export type TypLupu = 'leceni'

export interface Lup {
  id: string
  nazev: string
  popis: string
  ikona: string
  typ: TypLupu
  /** Rozsah efektu (léčení), losuje se při použití stejně jako u karet. */
  hodnotaOd: number
  hodnotaDo: number
}

export const LUP: Lup[] = [
  {
    id: 'lecivy-lektvar',
    nazev: 'Léčivý lektvar',
    popis: 'Doplní část výdrže — dá se použít přímo v souboji, kdykoli jich pár máš v batohu.',
    ikona: '🧪',
    typ: 'leceni',
    hodnotaOd: 18,
    hodnotaDo: 26,
  },
]
