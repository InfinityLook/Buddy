/** Season 1 / quest 3: Srdce mýtiny. Pure, deterministic state transitions. */
export type TretiFaze = 'zamcena' | 'pripravena' | 'lov' | 'pruzkum' | 'navrat' | 'dokoncena'
export interface TretiVyprava { faze: TretiFaze; porazeni: string[]; odmenaPrevzata: boolean }
export const TRETI_ODMENA = { xp: 180, krystaly: 7, drevo: 3, kamen: 5 } as const
export const novaTretiVyprava = (): TretiVyprava => ({ faze: 'zamcena', porazeni: [], odmenaPrevzata: false })
export type TretiAkce = { type: 'odemknout' | 'zahajit' } | { type: 'porazit'; id: string; region: string } | { type: 'prozkoumat'; region: string } | { type: 'prevzit'; region: string }
export function dalsiTretiVyprava(s: TretiVyprava, a: TretiAkce): TretiVyprava {
  if (a.type === 'odemknout' && s.faze === 'zamcena') return { ...s, faze: 'pripravena' }
  if (a.type === 'zahajit' && s.faze === 'pripravena') return { ...s, faze: 'lov' }
  if (a.type === 'porazit' && s.faze === 'lov' && a.region === 'kristalova_mytina' && a.id.length > 0 && a.id.length <= 100 && !s.porazeni.includes(a.id)) {
    const porazeni = [...s.porazeni, a.id]
    return { ...s, porazeni, faze: porazeni.length >= 3 ? 'pruzkum' : 'lov' }
  }
  if (a.type === 'prozkoumat' && s.faze === 'pruzkum' && a.region === 'kristalova_mytina') return { ...s, faze: 'navrat' }
  if (a.type === 'prevzit' && s.faze === 'navrat' && a.region === 'buddy_vesnice' && !s.odmenaPrevzata) return { ...s, faze: 'dokoncena', odmenaPrevzata: true }
  return s
}
export function nactiTretiVypravu(raw: unknown): TretiVyprava {
  if (!raw || typeof raw !== 'object') return novaTretiVyprava()
  const v = raw as Record<string, unknown>
  const porazeni = Array.isArray(v.porazeni) ? [...new Set(v.porazeni.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 100))].slice(0, 20) : []
  if (v.faze === 'zamcena' || v.faze === 'pripravena') return { faze: v.faze, porazeni: [], odmenaPrevzata: false }
  if (v.faze === 'lov') return { faze: 'lov', porazeni: porazeni.slice(0, 2), odmenaPrevzata: false }
  if (porazeni.length < 3) return { faze: 'lov', porazeni, odmenaPrevzata: false }
  if (v.faze === 'dokoncena' && v.odmenaPrevzata === true) return { faze: 'dokoncena', porazeni, odmenaPrevzata: true }
  if (v.faze === 'navrat') return { faze: 'navrat', porazeni, odmenaPrevzata: false }
  return { faze: 'pruzkum', porazeni, odmenaPrevzata: false }
}
export function popisTreti(s: TretiVyprava): string {
  switch (s.faze) {
    case 'zamcena': return 'Nejdříve dokonči Ozvěny krystalů.'
    case 'pripravena': return 'Elara zachytila podivný signál ze srdce mýtiny.'
    case 'lov': return `Poraz 3 různé tvory v Křišťálové mýtině: ${s.porazeni.length}/3.`
    case 'pruzkum': return 'Prozkoumej místo magického signálu na Křišťálové mýtině.'
    case 'navrat': return 'Vrať se za Elarou do Buddyho vesnice.'
    case 'dokoncena': return 'Srdce mýtiny – dokončeno.'
  }
}
