/** v9.0: výcvik se počítá až od přijetí; jednorázová odměna je součástí jedné změny village store. */
export const KAEL_VYCVIK_ODMENA = { drevo: 7, kamen: 5, krystaly: 2 } as const
export const KAEL_VYCVIK_POCET = 3
export type KaelTrainingProgress = { zacatek: number | null; prevzato: boolean }
export function overKaelTraining(data: unknown): KaelTrainingProgress {
  if (!data || typeof data !== 'object') return { zacatek: null, prevzato: false }
  const x = data as Record<string, unknown>
  return { zacatek: typeof x.zacatek === 'number' && Number.isSafeInteger(x.zacatek) && x.zacatek >= 0 && x.zacatek <= 1000000000 ? x.zacatek : null, prevzato: x.prevzato === true }
}
export function stavVycvikuV2(progress: KaelTrainingProgress, celkem: number): 'zamceno' | 'aktivni' | 'pripraveno' | 'prevzato' {
  if (progress.zacatek === null) return 'zamceno'
  if (progress.prevzato) return 'prevzato'
  return Number.isFinite(celkem) && celkem - progress.zacatek >= KAEL_VYCVIK_POCET ? 'pripraveno' : 'aktivni'
}
export function pocetVycvikuV2(progress: KaelTrainingProgress, celkem: number): number {
  return progress.zacatek === null || !Number.isFinite(celkem) ? 0 : Math.max(0, Math.min(KAEL_VYCVIK_POCET, Math.floor(celkem - progress.zacatek)))
}
