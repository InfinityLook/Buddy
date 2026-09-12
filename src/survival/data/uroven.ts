// ==========================================
// Level-up křivka (bod 11 zadání) — čistý vzorec, ne tabulka, stejný
// "parametrický, ne 100 řádků" přístup jako vypocitejVlnu ve waves.ts.
//
// Práh je KUMULATIVNÍ celkové XP běhu (SurvivalHerniStav.xpZaBeh),
// potřebné k DOSAŽENÍ dané úrovně — úroveň 1 je zadarmo (appka s ní
// startuje, 0 XP). Křivka je zvolená podle skutečných čísel z
// data/monsters.ts (běžné zabití dává 8-70 XP, vlna 1 má ~10
// nepřátel) — appka chce první level-up zhruba během vlny 1, další
// pak postupně řidší, ne jeden perk na každé druhé zabití.
// ==========================================

export const prahXpProUroven = (uroven: number): number => {
  if (uroven <= 1) return 0
  return Math.round(80 * Math.pow(uroven - 1, 1.3))
}
