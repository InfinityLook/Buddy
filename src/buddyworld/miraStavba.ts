/** Osobní stavební úkol Miry: nové umístěné stavby po přijetí. */
export interface MiraStavba { zacatek: number | null; prevzato: boolean }
export const MIRA_STAVBA_ODMENA = { drevo: 8, kamen: 6, krystaly: 1 } as const
export const MIRA_CIL = 2
export function overMiraStavba(raw: unknown): MiraStavba {
  if (!raw || typeof raw !== 'object') return { zacatek: null, prevzato: false }
  const p = raw as Record<string, unknown>
  const zacatek = typeof p.zacatek === 'number' && Number.isSafeInteger(p.zacatek) && p.zacatek >= 0 && p.zacatek <= 80 ? p.zacatek : null
  return { zacatek, prevzato: zacatek !== null && p.prevzato === true }
}
export function pocetMiraStaveb(stav: MiraStavba, pocet: number): number {
  if (stav.zacatek === null || !Number.isSafeInteger(pocet) || pocet < 0) return 0
  return Math.min(MIRA_CIL, Math.max(0, pocet - stav.zacatek))
}
export function fazeMiraStavby(stav: MiraStavba, pocet: number): 'zamceno' | 'stavba' | 'pripraveno' | 'hotovo' {
  if (stav.zacatek === null) return 'zamceno'
  if (stav.prevzato) return 'hotovo'
  return pocetMiraStaveb(stav, pocet) >= MIRA_CIL ? 'pripraveno' : 'stavba'
}
