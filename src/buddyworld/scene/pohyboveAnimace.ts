/** Small pure animation state resolver, independent of rendering and GLB assets. */
export type AnimacePohybu = 'idle' | 'walk' | 'run' | 'attack'
export function typAnimacePohybu(rychlost: number): 'idle' | 'walk' | 'run' {
  if (!Number.isFinite(rychlost) || rychlost < 0.15) return 'idle'
  return rychlost >= 5 ? 'run' : 'walk'
}
export function vyberAnimaciPohybu(rychlost: number, utoci: boolean): AnimacePohybu {
  return utoci ? 'attack' : typAnimacePohybu(rychlost)
}
export function fazeKroku(predchozi: number, rychlost: number, dt: number): number {
  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(rychlost)) return predchozi
  return (predchozi + Math.max(0, rychlost) * Math.min(dt, 0.1) * 2.8) % (Math.PI * 2)
}


/** Priorita bojových reakcí: smrt > zásah > úhyb > útok > pohyb. */
export type AnimaceHrace = AnimacePohybu | 'dodge' | 'hit' | 'death'
export interface BojovyAnimacniStav {
  mrtvy: boolean
  zasahDoMs: number
  uhybDoMs: number
  utokDoMs: number
}
export function vyberAnimaciHrace(rychlost: number, casMs: number, stav: BojovyAnimacniStav): AnimaceHrace {
  if (stav.mrtvy) return 'death'
  if (casMs < stav.zasahDoMs) return 'hit'
  if (casMs < stav.uhybDoMs) return 'dodge'
  return vyberAnimaciPohybu(rychlost, casMs < stav.utokDoMs)
}
/** Průběh jednorázové animace v intervalu 0–1, bezpečný i pro neplatné vstupy. */
export function prubehAnimace(casMs: number, konecMs: number, delkaMs: number): number {
  if (!Number.isFinite(casMs) || !Number.isFinite(konecMs) || !Number.isFinite(delkaMs) || delkaMs <= 0) return 1
  return Math.max(0, Math.min(1, 1 - (konecMs - casMs) / delkaMs))
}
