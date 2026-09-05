import { patriDoObdobi } from '@/miniapps/finance/useFinance'
import type { Transaction } from '@/miniapps/finance/types'

// ==========================================
// Odvozené statistiky Economy Roomu ze skutečných transakcí Financí
// (src/miniapps/finance/useFinance.ts) — čisté funkce, žádný vlastní
// store, stejný důvod jako fitnessStats.ts hned vedle (School Roomu):
// testovatelné bez komponenty, jedno místo, které nemůže rozjet
// zobrazenou hodnotu od skutečných dat.
//
// useFinance() sám o sobě vrací jen "tento měsíc" a "vše" — pro srovnání
// s minulým měsícem (delta u Příjmů/Výdajů) je potřeba surové
// transakce, které hook exportuje přesně proto (viz komentář tam).
// ==========================================

export interface MesicniSrovnani {
  prijmyMinuly: number
  vydajeMinuly: number
}

/** Součty minulého měsíce, pro srovnání s `prijmyObdobi`/`vydajeObdobi`
 *  (ty jsou vždy za aktuálně zvolené období — v Economy Roomu vždy
 *  "tento měsíc", protože se `useFinance()` volá s výchozím filtrem). */
export const spocitatMesicniSrovnani = (transactions: Transaction[]): MesicniSrovnani => {
  const minuly = transactions.filter((t) => patriDoObdobi(t, 'minuly-mesic'))
  return {
    prijmyMinuly: minuly.filter((t) => t.type === 'prijem').reduce((s, t) => s + t.amount, 0),
    vydajeMinuly: minuly.filter((t) => t.type === 'vydaj').reduce((s, t) => s + t.amount, 0),
  }
}

/** Formátovaný rozdíl "+N Kč vs min. měsíc" / "−N Kč vs min. měsíc" —
 *  stejná "absolutní rozdíl, ne procenta" zásada jako
 *  fitnessStats.ts's formatujRozdil, z identického důvodu: u menších
 *  částek (typické kapesné) by procento u nuly v minulém měsíci bylo
 *  nesmyslné nebo přehnaně dramatické, kde absolutní Kč zůstává čitelné
 *  vždy. Vlastní funkce, ne reused formatujRozdil — jiná jednotka (Kč)
 *  a jiné srovnávané období (měsíc, ne včerejšek) by ve sdílené funkci
 *  znamenaly parametr navíc jen pro popisek, což by ji zbytečně
 *  zkomplikovalo pro obě volající appky. */
export const formatujRozdilMesic = (tentoMesic: number, minulyMesicCastka: number): string => {
  const rozdil = tentoMesic - minulyMesicCastka
  if (rozdil === 0) return 'stejně jako minulý měsíc'
  const znamenko = rozdil > 0 ? '+' : '−'
  return `${znamenko}${Math.abs(rozdil).toLocaleString('cs-CZ')} Kč vs min. měsíc`
}
