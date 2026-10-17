import { RELIKVIE } from './relikvie'

/** Jednorázové završení pátrání po třech pečetích. */
export const TRI_PECETE_ID = 'probuzeni-strazcu'
export const TRI_PECETE_ODMENA = { drevo: 12, kamen: 12, krystaly: 20 } as const
export const TRI_PECETE_PRIBEH = [
  'Tři dávné pečetě znovu září. Jejich světlo se spojí nad údolím.',
  'V kamenech se probudí ozvěna strážců: „Světlo není zbraň. Je to slib, že svět neopustíme.“',
  'Buddy ucítí volání starého chrámu. Tajemství údolí ještě není celé odhalené.',
] as const

export function jsouPeceteAktivni(aktivovane: readonly string[]): boolean {
  return RELIKVIE.every(r => aktivovane.includes(r.id))
}
export function lzeProbuditStrazce(aktivovane: readonly string[], zaznamenane: readonly string[]): boolean {
  return jsouPeceteAktivni(aktivovane) && !zaznamenane.includes(TRI_PECETE_ID)
}
export function overUdalostiPeceti(value: unknown): string[] {
  return Array.isArray(value) && value.includes(TRI_PECETE_ID) ? [TRI_PECETE_ID] : []
}
