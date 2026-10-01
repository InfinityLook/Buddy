import type { Smer } from '../types'

// ==========================================
// Buddyho Trh — Fáze 4: katalog sabotážních akcí. Na rozdíl od Osudu
// (data/udalosti.ts) a kola štěstí (data/kolaStesti.ts) — obě appka
// vybírá NÁHODNĚ, když na ně hráč políčkem narazí — je sabotáž VOLBA
// aktivního hráče: appka tu nepotřebuje žádnou váhu ani náhodu při
// výběru samotném, jen pevné menu tří položek.
//
// Cena je appčiných "kreditech", ne ve skutečné měně — appka tenhle
// pojem používá i jinde (core/store/useWalletStore.ts, Obchod appky
// v RPG), ve stejné jednotce, v jaké appka drží `Hrac.penize` všude
// jinde v týhle hře.
// ==========================================

export type EfektSabotaze =
  | { typ: 'krast'; castka: number }
  | { typ: 'zpomaleni' }
  | { typ: 'odstrceni'; smer: Smer; kroku: number }

export interface SabotazniAkce {
  id: string
  nazev: string
  ikona: string
  /** Appka tuhle částku strhne útočníkovi VŽDYCKY (zmizí do banky),
   *  bez ohledu na to, jestli sabotáž na cíli doopravdy něco udělá —
   *  stejná "appka nebrání špatnému rozhodnutí, jen neplatnému tahu"
   *  filozofie jako riskovaný hod jinde v appce. */
  cena: number
  popis: string
  efekt: EfektSabotaze
}

/** Krádež je jediná akce s profitním motivem — útočník zaplatí málo,
 *  ale při úspěchu získá víc, takže se mu reálně vyplatí. Zpomalení a
 *  Odstrčení jsou čistě destruktivní: zaplatíš a peníze zmizí do
 *  banky, žádný přímý zisk, jen to soupeři zkomplikuje tah. Odstrčení
 *  má pevný směr v katalogu, ne volitelný útočníkem — stejné
 *  zjednodušení, jaké appka už udělala u Osudových `posun` karet
 *  (otevřená 2D mřížka nemá jeden přirozený "dopředu"). */
export const SABOTAZNI_AKCE: SabotazniAkce[] = [
  {
    id: 'krast',
    nazev: 'Krádež',
    ikona: '🥷',
    cena: 50,
    popis: 'Ukradni soupeři až 150 kreditů (nebo míň, pokud tolik nemá) — ty peníze dostaneš ty, ne banka.',
    efekt: { typ: 'krast', castka: 150 },
  },
  {
    id: 'zpomaleni',
    nazev: 'Zpomalení',
    ikona: '🐌',
    cena: 80,
    popis: 'Soupeř vynechá svůj příští tah.',
    efekt: { typ: 'zpomaleni' },
  },
  {
    id: 'odstrceni',
    nazev: 'Odstrčení',
    ikona: '👊',
    cena: 60,
    popis: 'Soupeř se posune o 3 pole zpět.',
    efekt: { typ: 'odstrceni', smer: 'dolu', kroku: 3 },
  },
]
