/** v12: deterministic, bounded combat difficulty without mutating player stats. */
export type Obtiznost = 'pribeh' | 'normalni' | 'vyzva'
export const OBTIZNOSTI: readonly Obtiznost[] = ['pribeh','normalni','vyzva']
export function nasobicObtiznosti(d: Obtiznost): number { return d === 'pribeh' ? 0.75 : d === 'vyzva' ? 1.3 : 1 }
export function upravPoskozeni(zaklad: number, d: Obtiznost): number {
 if (!Number.isFinite(zaklad) || zaklad <= 0) return 0
 return Math.max(1, Math.min(9999, Math.round(zaklad * nasobicObtiznosti(d))))
}
export function vyvazCooldown(ms:number, redukce:number):number {
 if(!Number.isFinite(ms)||!Number.isFinite(redukce)) return 1000
 return Math.round(Math.max(250,Math.min(120000,ms*(1-Math.max(0,Math.min(.6,redukce))))))
}
