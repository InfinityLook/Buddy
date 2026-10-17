/** v9.9 – objevování lesa: autorský text, bez externích assetů. */
import { MAGICKY_LES_KRYSTALY } from './scene/magickyLes3D'
export type LesniPozice = { x: number; z: number }
export const KLIC_LES = 'buddyworld:magicky-les-objevy:v1'
export const DOSAH_LES = 2.6
export const LESNI_OBJEVY = [
  { id: 'les-ozvena', x: MAGICKY_LES_KRYSTALY[0][0], z: MAGICKY_LES_KRYSTALY[0][1], nazev: 'Ozvěna lesa', pribeh: 'První krystal šeptá o staré cestě mezi kořeny.' },
  { id: 'les-pamet', x: MAGICKY_LES_KRYSTALY[1][0], z: MAGICKY_LES_KRYSTALY[1][1], nazev: 'Paměť kořenů', pribeh: 'Druhý krystal uchovává stopu dávných strážců.' },
  { id: 'les-svit', x: MAGICKY_LES_KRYSTALY[2][0], z: MAGICKY_LES_KRYSTALY[2][1], nazev: 'Světlo mýtiny', pribeh: 'Třetí krystal odhaluje cestu k zapomenutým ruinám.' },
] as const
export function validujLesniObjevy(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const povolene = new Set<string>(LESNI_OBJEVY.map(o => o.id))
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && povolene.has(id)))]
}
export function nejblizsiLesniObjev(pozice: LesniPozice, sebrane: readonly string[]) {
  if (!Number.isFinite(pozice.x) || !Number.isFinite(pozice.z)) return null
  return LESNI_OBJEVY.find(o => !sebrane.includes(o.id) && Math.hypot(o.x - pozice.x, o.z - pozice.z) <= DOSAH_LES) ?? null
}
export function nactiLesniObjevy(): string[] {
  try { return validujLesniObjevy(JSON.parse(localStorage.getItem(KLIC_LES) ?? '[]')) } catch { return [] }
}
/** Vrací false při chybě úložiště; odměnou je pouze příběhový zápis. */
export function ulozLesniObjevy(ids: readonly string[]): boolean {
  try {
    const validni = validujLesniObjevy(ids)
    localStorage.setItem(KLIC_LES, JSON.stringify(validni))
    return localStorage.getItem(KLIC_LES) === JSON.stringify(validni)
  } catch { return false }
}

