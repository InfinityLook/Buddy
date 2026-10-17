/** Adaptivní škálování rozlišení bez změny uživatelského profilu.
 * Při dlouhodobě pomalém vykreslování ubere DPR; po stabilním zrychlení jej obnoví. */
export interface StavRozliseni { pomer: number; vzorky: number; soucetMs: number; posledniZmenaMs: number }
export function novyStavRozliseni(pomer: number): StavRozliseni {
  return { pomer, vzorky: 0, soucetMs: 0, posledniZmenaMs: 0 }
}
/** Vrací nový stav; žádné DOM API – snadno testovatelné. */
export function dalsiRozliseni(
  stav: StavRozliseni, casSnimkuMs: number, tedMs: number, maximum: number, minimum = 0.75,
): StavRozliseni {
  if (!Number.isFinite(casSnimkuMs) || casSnimkuMs <= 0 || casSnimkuMs > 250 || !Number.isFinite(tedMs)) return stav
  const vzorky = stav.vzorky + 1
  const soucetMs = stav.soucetMs + casSnimkuMs
  if (vzorky < 90) return { ...stav, vzorky, soucetMs }
  const prumer = soucetMs / vzorky
  const limit = Math.max(minimum, maximum)
  let pomer = stav.pomer
  if (tedMs - stav.posledniZmenaMs >= 3500) {
    if (prumer > 25) pomer = Math.max(minimum, Math.round((pomer - 0.15) * 100) / 100)
    else if (prumer < 17) pomer = Math.min(limit, Math.round((pomer + 0.1) * 100) / 100)
  }
  return { pomer, vzorky: 0, soucetMs: 0, posledniZmenaMs: pomer !== stav.pomer ? tedMs : stav.posledniZmenaMs }
}
