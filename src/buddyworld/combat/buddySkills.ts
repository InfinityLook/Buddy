/** Čistá logika bojové asistence maskota; cooldown běží podle herního času. */
export const BUDDY_SKILL_COOLDOWN_MS = 12000
export const BUDDY_SKILL_DOSAH = 5
export const BUDDY_SKILL_POSKOZENI = 18
/** Síla Buddyho roste s levelem hráče, s bezpečným stropem proti exploitu. */
export type BuddyElement = 'ember' | 'moss' | 'nyx' | 'frost'
/** Odlišné bojové profily; podpůrné efekty přibudou až s implementací stavů. */
export const BUDDY_ELEMENTY: Record<BuddyElement, { nasobic: number; cooldownMs: number; nazev: string }> = {
  ember: { nasobic: 1.25, cooldownMs: 14000, nazev: 'Ohnivý úder' },
  moss: { nasobic: 0.75, cooldownMs: 9000, nazev: 'Přírodní dotek' },
  nyx: { nasobic: 1.5, cooldownMs: 18000, nazev: 'Magický výboj' },
  frost: { nasobic: 0.95, cooldownMs: 11000, nazev: 'Ledový úder' },
}
export const buddyElement = (id: string): BuddyElement =>
  Object.prototype.hasOwnProperty.call(BUDDY_ELEMENTY, id) ? id as BuddyElement : 'ember'
export const buddySkillCooldown = (id: string): number => BUDDY_ELEMENTY[buddyElement(id)].cooldownMs
export const buddyElementPoskozeni = (level: number, id: string): number =>
  Math.round(buddySkillPoskozeniProLevel(level) * BUDDY_ELEMENTY[buddyElement(id)].nasobic)
export const buddySkillPoskozeniProLevel = (level: number): number => {
  const bezpecnyLevel = Number.isFinite(level) ? Math.max(1, Math.min(60, Math.floor(level))) : 1
  return BUDDY_SKILL_POSKOZENI + (bezpecnyLevel - 1) * 2
}
export const buddySkillPripraven = (casMs: number, posledniMs: number, vzdalenost: number, zije: boolean, maskotId = 'ember'): boolean =>
  zije && Number.isFinite(casMs) && Number.isFinite(vzdalenost) && vzdalenost <= BUDDY_SKILL_DOSAH &&
  casMs - posledniMs >= buddySkillCooldown(maskotId)
export const buddySkillZasah = <T extends { hp: number; faze: string; respawnOdMs: number }>(cil: T, casMs: number, level = 1, maskotId = 'ember'): { cil: T; porazen: boolean } => {
  if (cil.faze === 'mrtvy' || cil.hp <= 0) return { cil, porazen: false }
  const hp = Math.max(0, cil.hp - buddyElementPoskozeni(level, maskotId))
  return { cil: { ...cil, hp, faze: hp === 0 ? 'mrtvy' : cil.faze, respawnOdMs: hp === 0 ? casMs + 8000 : cil.respawnOdMs }, porazen: hp === 0 }
}

/** Podpůrný efekt Moss: po úspěšném zásahu vyléčí až 12 % max. HP. */
export const mossUzdraveni = <T extends { hp: number; maxHp: number }>(hrac: T): T => ({
  ...hrac,
  hp: Math.min(hrac.maxHp, hrac.hp + Math.max(1, Math.ceil(hrac.maxHp * 0.12))),
})
/** Frost zpomalí živého běžného nepřítele na 4 s. */
export const FROST_ZPOMALENI_MS = 4000
export const frostNasobicRychlosti = (casMs: number, doMs: number): number =>
  casMs < doMs ? 0.4 : 1


/** Ember: hoření po dobu 5 s, jeden zásah každou celou sekundu.
 * Efekt sám nepřítele nedorazí, aby XP/quest odměny neobešly
 * centrální zpracování vítězství ve scéně. */
export interface HoriStav { konecMs: number; dalsiTikMs: number }
export const EMBER_HORENI_TRVANI_MS = 5000
export const EMBER_HORENI_TIK_MS = 1000
export const zacniHoreni = (casMs: number): HoriStav => ({
  konecMs: casMs + EMBER_HORENI_TRVANI_MS,
  dalsiTikMs: casMs + EMBER_HORENI_TIK_MS,
})
export const krokHoreni = (stav: HoriStav, casMs: number, hp: number): { stav: HoriStav | null; hp: number } => {
  if (!Number.isFinite(casMs) || !Number.isFinite(hp) || hp <= 0 || casMs > stav.konecMs)
    return { stav: null, hp }
  const pocetTiku = Math.max(0, Math.min(5, Math.floor((Math.min(casMs, stav.konecMs) - stav.dalsiTikMs) / EMBER_HORENI_TIK_MS) + 1))
  const noveHp = Math.max(1, hp - pocetTiku * 3)
  const dalsi = stav.dalsiTikMs + pocetTiku * EMBER_HORENI_TIK_MS
  return { hp: noveHp, stav: dalsi > stav.konecMs ? null : { ...stav, dalsiTikMs: dalsi } }
}
