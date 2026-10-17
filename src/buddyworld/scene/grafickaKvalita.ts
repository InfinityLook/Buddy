/** Nastavení kvality Buddy World: bezpečné pro SSR (Next.js). */
export type GrafickaKvalita = 'usporny' | 'vyvazeny' | 'detailni'
export const KLIC_KVALITY = 'buddyworld-graficka-kvalita-v1'
export const UDALOST_KVALITY = 'buddyworld:graficka-kvalita'

export const PROFILY_KVALITY: Record<GrafickaKvalita, { pixelRatio: number; antialias: boolean; efekty: boolean; popis: string }> = {
  usporny: { pixelRatio: 1, antialias: false, efekty: false, popis: 'Nižší rozlišení a méně efektů; vhodné pro slabší mobily.' },
  vyvazeny: { pixelRatio: 1.5, antialias: true, efekty: true, popis: 'Doporučené pro většinu telefonů.' },
  detailni: { pixelRatio: 2, antialias: true, efekty: true, popis: 'Ostřejší obraz; vyšší spotřeba baterie.' },
}
export function jeGrafickaKvalita(hodnota: unknown): hodnota is GrafickaKvalita {
  return hodnota === 'usporny' || hodnota === 'vyvazeny' || hodnota === 'detailni'
}
export function nactiGrafickouKvalitu(): GrafickaKvalita {
  if (typeof window === 'undefined') return 'vyvazeny'
  try { const hodnota = window.localStorage.getItem(KLIC_KVALITY); return jeGrafickaKvalita(hodnota) ? hodnota : 'vyvazeny' }
  catch { return 'vyvazeny' }
}
export function ulozGrafickouKvalitu(kvalita: GrafickaKvalita): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(KLIC_KVALITY, kvalita) } catch { /* Soukromé prohlížení. */ }
  window.dispatchEvent(new CustomEvent<GrafickaKvalita>(UDALOST_KVALITY, { detail: kvalita }))
}
export function cilovyPixelRatio(kvalita: GrafickaKvalita, devicePixelRatio: number): number {
  const pomer = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1
  return Math.max(0.5, Math.min(pomer, PROFILY_KVALITY[kvalita].pixelRatio))
}
