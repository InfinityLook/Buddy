/** Season 1, quest 2: Ozvěny krystalů. Pure progression logic. */
export type DruhaFaze = 'zamcena' | 'pripravena' | 'boj' | 'navrat' | 'dokoncena'
export interface DruhaVyprava { faze: DruhaFaze; porazeni: string[]; odmenaPrevzata: boolean }
export const DRUHA_ODMENA = { xp: 120, krystaly: 5, drevo: 2, kamen: 6 } as const
export const novaDruhaVyprava = (): DruhaVyprava => ({ faze: 'zamcena', porazeni: [], odmenaPrevzata: false })
export type DruhaAkce = { type: 'odemknout' | 'zahajit' } | { type: 'porazit'; id: string; region: string } | { type: 'prevzit'; region: string }
export function dalsiDruhaVyprava(s: DruhaVyprava, a: DruhaAkce): DruhaVyprava {
  if (a.type === 'odemknout' && s.faze === 'zamcena') return { ...s, faze: 'pripravena' }
  if (a.type === 'zahajit' && s.faze === 'pripravena') return { ...s, faze: 'boj' }
  if (a.type === 'porazit' && s.faze === 'boj' && a.region === 'kristalova_mytina' && a.id.length > 0 && a.id.length <= 100 && !s.porazeni.includes(a.id)) {
    const porazeni = [...s.porazeni, a.id]
    return { ...s, porazeni, faze: porazeni.length >= 2 ? 'navrat' : 'boj' }
  }
  if (a.type === 'prevzit' && s.faze === 'navrat' && a.region === 'buddy_vesnice' && !s.odmenaPrevzata) return { ...s, faze: 'dokoncena', odmenaPrevzata: true }
  return s
}
export function nactiDruhouVypravu(raw: unknown): DruhaVyprava {
  if (!raw || typeof raw !== 'object') return novaDruhaVyprava()
  const v = raw as Record<string, unknown>
  const porazeni = Array.isArray(v.porazeni) ? [...new Set(v.porazeni.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 100))].slice(0, 10) : []
  if (v.faze === 'dokoncena' && v.odmenaPrevzata === true && porazeni.length >= 2) return { faze: 'dokoncena', porazeni, odmenaPrevzata: true }
  if (v.faze === 'zamcena' || v.faze === 'pripravena') return { faze: v.faze, porazeni: [], odmenaPrevzata: false }
  return { faze: porazeni.length >= 2 ? 'navrat' : 'boj', porazeni, odmenaPrevzata: false }
}
export function popisDruhe(s: DruhaVyprava): string {
  switch (s.faze) {
    case 'zamcena': return 'Nejdřív dokonči výpravu Ztracené světlo.'
    case 'pripravena': return 'Elara má pro tebe další výpravu.'
    case 'boj': return `Prozkoumej mýtinu a poraz její strážce: ${s.porazeni.length}/2.`
    case 'navrat': return 'Vrať se do Buddyho vesnice pro odměnu.'
    case 'dokoncena': return 'Ozvěny krystalů – dokončeno.'
  }
}
