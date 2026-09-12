import { EfektPerku } from './perky'

// ==========================================
// Build/synergy systém (bod 12 zadání, krok 3/4) — pevná, hand-psaná
// sada bonusů navíc, co appka odemkne, jakmile hráčovy perkové volby
// (stav.ziskanePerky, viz engine.ts's vyberPerk) splní podmínku dvou
// druhů:
//
//   'kombo' — hráč vybral KAŽDÝ z vyjmenovaných perků aspoň jednou
//             (různé perky dohromady tvoří "build", ne že by appka
//             chtěla víc kopií jednoho a téhož).
//   'stack' — hráč vybral TENTÝŽ perk aspoň `pocet`-krát (appka odmění
//             hráče, co jede "všechno na jednu kartu" strategii, ne jen
//             ty, co sbírají různorodou nabídku).
//
// Stejná "pevná sada, ne libovolný vstup" zásada jako appka používá
// jinde (BARVY_UZLU, IKONY_SKUPIN, PERKY samotné vedle tohohle
// souboru) — appka tu nenabízí žádný generátor kombinací, jen pět
// hand-vybraných, tematicky pojmenovaných bonusů.
//
// Efekt synergie se čte úplně stejně jako u obyčejného perku (viz
// engine.ts's aplikujEfekt, sdílené s aplikujPerk) — appka nechce
// druhý, nezávislý způsob, jak se `EfektPerku` promítá do HracStav.
// Na rozdíl od perku ale synergie appce NEPŘIJDE formou nabídky/karty
// — engine ji sám tiše odemkne v tu chvíli, co podmínka poprvé platí
// (viz engine.ts's zkontrolujSynergie), a hráč se o ní dozví jen z
// logu. Appka to sleduje přes stav.aplikovaneSynergie (seznam id, co
// tenhle běh appka UŽ jednou udělila), ať stejný bonus nikdy nepřičte
// dvakrát — bez týhle ochrany by třeba synergie s podmínkou 'stack' s
// pocet: 3 klidně mohla vypadat splněná i při 4., 5., ... výběru
// stejného perku a appka by ji aplikovala pokaždé znovu.
// ==========================================

export type PodminkaSynergie =
  | { typ: 'kombo'; perky: string[] }
  | { typ: 'stack'; perkId: string; pocet: number }

export interface SynergieDef {
  id: string
  jmeno: string
  popis: string
  ikona: string
  podminka: PodminkaSynergie
  efekt: EfektPerku
  hodnota: number
}

export const SYNERGIE: SynergieDef[] = [
  {
    id: 'valecnik',
    jmeno: 'Válečník',
    popis: 'Síla + Rychlopalba: +15 % poškození navíc.',
    ikona: '⚔️',
    podminka: { typ: 'kombo', perky: ['sila', 'rychlopalba'] },
    efekt: 'damage',
    hodnota: 0.15,
  },
  {
    id: 'presny_zabijak',
    jmeno: 'Přesný zabiják',
    popis: 'Přesnost + Brutalita: +0.4× násobič kritického poškození navíc.',
    ikona: '🔪',
    podminka: { typ: 'kombo', perky: ['presnost', 'brutalita'] },
    efekt: 'kritickyNasobic',
    hodnota: 0.4,
  },
  {
    id: 'nezmar',
    jmeno: 'Nezmar',
    popis: 'Vitalita + Hbitost: +30 max HP navíc (a doplní stejně).',
    ikona: '🛡️',
    podminka: { typ: 'kombo', perky: ['vitalita', 'hbitost'] },
    efekt: 'maxHp',
    hodnota: 30,
  },
  {
    id: 'berserk',
    jmeno: 'Berserk',
    popis: '3× Síla: +25 % poškození navíc.',
    ikona: '😡',
    podminka: { typ: 'stack', perkId: 'sila', pocet: 3 },
    efekt: 'damage',
    hodnota: 0.25,
  },
  {
    id: 'blesk',
    jmeno: 'Blesk',
    popis: '3× Rychlopalba: +20 % rychlost útoku navíc.',
    ikona: '⚡',
    podminka: { typ: 'stack', perkId: 'rychlopalba', pocet: 3 },
    efekt: 'utokyZaSekundu',
    hodnota: 0.2,
  },
]

/** Čistá kontrola, jestli daná podmínka synergie platí proti
 *  hráčovým dosavadním perkovým výběrům — appka ji volá pro každou
 *  ještě neudělenou synergii (viz engine.ts's zkontrolujSynergie), ne
 *  jen pro tu, co zrovna přibyla, protože i STARŠÍ synergie mohla
 *  začít platit teprve tímhle posledním výběrem (např. hráč má
 *  Sílu×2 + právě teď vybral Rychlopalbu poprvé — obě podmínky
 *  'valecnik' i případná budoucí čistě sílová synergie by mohly
 *  najednou platit). */
export const jeSynergieSplnena = (podminka: PodminkaSynergie, ziskanePerky: Record<string, number>): boolean => {
  if (podminka.typ === 'stack') return (ziskanePerky[podminka.perkId] ?? 0) >= podminka.pocet
  return podminka.perky.every((id) => (ziskanePerky[id] ?? 0) >= 1)
}
