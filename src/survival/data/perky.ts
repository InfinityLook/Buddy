// ==========================================
// Perky pro level-up (bod 11 zadání) — pevná, hand-psaná sada, stejná
// "pevná sada, ne libovolný vstup" zásada jako appka používá jinde
// (BARVY_UZLU, IKONY_SKUPIN). Sedm perků, appka nabízí tři náhodné při
// každém level-upu (viz engine.ts's vyberNabidkuPerku) — hráč si může
// stejný perk vybrat vícekrát za běh (stackuje), appka nevylučuje už
// jednou vybrané id z budoucích nabídek.
//
// `hodnota` se čte podle `efekt` dvěma různými způsoby (viz engine.ts's
// aplikujPerk) — 'damage'/'utokyZaSekundu'/'dosahUtoku'/'rychlost' jsou
// MULTIPLIKATIVNÍ zlomky (0.15 = +15 % na aktuální hodnotu, stackuje
// násobením, ne sčítáním, ať desátý stejný perk pořád znamená totéž
// relativní zlepšení), 'maxHp'/'kritickyNasobic' jsou PEVNÉ přírůstky,
// 'kritickaSance' je pevný přírůstek v procentních bodech (viz
// MAX_KRITICKA_SANCE — appka nedovolí víc než 75 %, ať kritický zásah
// nikdy nebude jistota).
// ==========================================

export type EfektPerku = 'damage' | 'utokyZaSekundu' | 'dosahUtoku' | 'maxHp' | 'rychlost' | 'kritickaSance' | 'kritickyNasobic'

export interface PerkDef {
  id: string
  jmeno: string
  popis: string
  ikona: string
  efekt: EfektPerku
  hodnota: number
}

export const MAX_KRITICKA_SANCE = 0.75

export const PERKY: PerkDef[] = [
  { id: 'sila', jmeno: 'Síla', popis: '+15 % poškození.', ikona: '💪', efekt: 'damage', hodnota: 0.15 },
  {
    id: 'rychlopalba',
    jmeno: 'Rychlopalba',
    popis: '+12 % rychlost útoku.',
    ikona: '🏹',
    efekt: 'utokyZaSekundu',
    hodnota: 0.12,
  },
  { id: 'dosah', jmeno: 'Dosah', popis: '+10 % dosah útoku.', ikona: '🎯', efekt: 'dosahUtoku', hodnota: 0.1 },
  {
    id: 'vitalita',
    jmeno: 'Vitalita',
    popis: '+20 max HP (a doplní stejně).',
    ikona: '❤️',
    efekt: 'maxHp',
    hodnota: 20,
  },
  { id: 'hbitost', jmeno: 'Hbitost', popis: '+8 % rychlost pohybu.', ikona: '👟', efekt: 'rychlost', hodnota: 0.08 },
  {
    id: 'presnost',
    jmeno: 'Přesnost',
    popis: '+5 % šance na kritický zásah.',
    ikona: '🎲',
    efekt: 'kritickaSance',
    hodnota: 0.05,
  },
  {
    id: 'brutalita',
    jmeno: 'Brutalita',
    popis: '+0.3× násobič kritického poškození.',
    ikona: '💥',
    efekt: 'kritickyNasobic',
    hodnota: 0.3,
  },
]

/** Kolik karet appka nabídne při jednom level-upu. */
export const POCET_VOLEB_PERKU = 3
