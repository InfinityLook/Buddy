/** Season 1: Ztracené světlo. Pure quest state machine, independent of UI and persistence. */
export const KRYSTALOVA_VYPRAVA_ID = 'ztracene_svetlo' as const
export type VypravaFaze = 'nezahajena' | 'sber' | 'boj' | 'navrat' | 'dokoncena'
export interface KristalovaVyprava {
  faze: VypravaFaze
  ulomky: string[]
  porazeni: string[]
  odmenaPrevzata: boolean
}
export type VypravaAkce =
  | { type: 'zahajit' }
  | { type: 'sebrat_ulomek'; id: string; region: string }
  | { type: 'porazit_nepritele'; id: string; region: string }
  | { type: 'prevzit_odmenu'; region: string }

export const VYPRAVA_ODMENA = { drevo: 4, kamen: 4, krystaly: 3, xp: 80 } as const
export const VYPRAVA_REGION = 'kristalova_mytina'
export const novaKristalovaVyprava = (): KristalovaVyprava => ({
  faze: 'nezahajena', ulomky: [], porazeni: [], odmenaPrevzata: false,
})
const validId = (id: string) => id.length > 0 && id.length <= 100

export function zpracujVypravu(s: KristalovaVyprava, a: VypravaAkce): KristalovaVyprava {
  if (a.type === 'zahajit') return s.faze === 'nezahajena' ? { ...s, faze: 'sber' } : s
  if (a.type === 'sebrat_ulomek') {
    if (s.faze !== 'sber' || a.region !== VYPRAVA_REGION || !validId(a.id) || s.ulomky.includes(a.id)) return s
    const ulomky = [...s.ulomky, a.id]
    return { ...s, ulomky, faze: ulomky.length >= 3 ? 'boj' : 'sber' }
  }
  if (a.type === 'porazit_nepritele') {
    if (s.faze !== 'boj' || a.region !== VYPRAVA_REGION || !validId(a.id) || s.porazeni.includes(a.id)) return s
    const porazeni = [...s.porazeni, a.id]
    return { ...s, porazeni, faze: porazeni.length >= 2 ? 'navrat' : 'boj' }
  }
  if (a.type === 'prevzit_odmenu' && s.faze === 'navrat' && a.region === 'buddy_vesnice' && !s.odmenaPrevzata) {
    return { ...s, faze: 'dokoncena', odmenaPrevzata: true }
  }
  return s
}

export function popisVypravy(s: KristalovaVyprava): string {
  switch (s.faze) {
    case 'nezahajena': return 'Promluv si se starostkou Elarou.'
    case 'sber': return `Najdi krystalové úlomky: ${s.ulomky.length}/3`
    case 'boj': return `Poraz nepřátele na mýtině: ${s.porazeni.length}/2`
    case 'navrat': return 'Vrať se za Elarou do Buddyho vesnice.'
    case 'dokoncena': return 'Ztracené světlo – dokončeno.'
  }
}

/** Sanitization for localStorage/Firestore; never trust a raw saved object. */
export function nactiKristalovouVypravu(raw: unknown): KristalovaVyprava {
  if (!raw || typeof raw !== 'object') return novaKristalovaVyprava()
  const o = raw as Record<string, unknown>
  const ids = (value: unknown) => Array.isArray(value)
    ? [...new Set(value.filter((v): v is string => typeof v === 'string' && validId(v)))].slice(0, 100)
    : []
  const ulomky = ids(o.ulomky)
  const porazeni = ids(o.porazeni)
  const faze: VypravaFaze = o.faze === 'dokoncena' && o.odmenaPrevzata === true && ulomky.length >= 3 && porazeni.length >= 2
    ? 'dokoncena' : o.faze === 'nezahajena' ? 'nezahajena'
    : ulomky.length < 3 ? 'sber' : porazeni.length < 2 ? 'boj' : 'navrat'
  return { faze, ulomky, porazeni, odmenaPrevzata: faze === 'dokoncena' }
}

/** Reconcile already collected unique shards after quest acceptance. */
export function synchronizujDriveSebraneUlomky(stav: KristalovaVyprava, sebrane: readonly string[]): KristalovaVyprava {
  if (stav.faze !== 'sber') return stav
  const povolene = new Set(['mytina-ulomek-1', 'mytina-ulomek-2', 'mytina-ulomek-3'])
  let dalsi = stav
  for (const id of sebrane) {
    if (povolene.has(id)) dalsi = zpracujVypravu(dalsi, { type: 'sebrat_ulomek', id, region: VYPRAVA_REGION })
  }
  return dalsi
}
