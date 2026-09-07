import type { Obtiznost } from './combat/ai'

// ==========================================
// Dvanácté kolo vylepšení — Žebříček (Arkádový režim proti botům, viz
// Zebricek.tsx). Čistá funkce, žádný React/stav — appka schválně
// neřeší obtížnost jako tři pevně dané "vlny" (1/2/3), ale jako
// škálu, co roste s číslem vlny donekonečna (Math.min na 'tezka'),
// takže žebříček nemá žádný "strop", na jaký by appka musela pamatovat
// zvlášť.
// ==========================================

/** Od které vlny appka přepne na danou obtížnost bota (combat/ai.ts's
 *  Obtiznost) — první tři vlny jsou "lehká", ať se hráč rozehřeje, pak
 *  normální, a od sedmé vlny už jde o skutečnou výzvu. */
export const obtiznostProVlnu = (vlna: number): Obtiznost => {
  if (vlna <= 3) return 'lehka'
  if (vlna <= 6) return 'normalni'
  return 'tezka'
}
