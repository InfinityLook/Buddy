import type { Pozice2D } from '../types'

/** First story boss of Crystal Clearing. Separate from the Temple Guardian. */
export const KRYSTALOVY_STRAZCE_HP = 160
export const KRYSTALOVY_HRAC_HP = 100
export const KRYSTALOVY_DOSAH = 3.25
/** 2D collision approximation: player/boss bodies and melee reach. */
export const KRYSTALOVY_TELO_BOSSE = 1.15
export const KRYSTALOVY_TELO_HRACE = 0.38
export const KRYSTALOVY_MELEE_DOSAH = 1.75
export const KRYSTALOVY_UHYB_MS = 600
export const KRYSTALOVY_UHYB_COOLDOWN_MS = 1800
export function vzdalenostTel(a: Pozice2D, b: Pozice2D): number { return Math.hypot(a.x - b.x, a.z - b.z) }
export function hracDosahneNaBosse(hrac: Pozice2D, boss: Pozice2D): boolean {
  return Number.isFinite(hrac.x) && Number.isFinite(hrac.z) && Number.isFinite(boss.x) && Number.isFinite(boss.z) && vzdalenostTel(hrac, boss) <= KRYSTALOVY_MELEE_DOSAH + KRYSTALOVY_TELO_BOSSE + KRYSTALOVY_TELO_HRACE
}
/** Prevent boss movement through the player body, even with large time steps. */
export function oddelTelesa(boss: Pozice2D, hrac: Pozice2D): Pozice2D {
  const dx = boss.x - hrac.x, dz = boss.z - hrac.z, vzd = Math.hypot(dx, dz)
  const min = KRYSTALOVY_TELO_BOSSE + KRYSTALOVY_TELO_HRACE
  if (!Number.isFinite(vzd) || vzd >= min) return boss
  const ux = vzd > 0.0001 ? dx / vzd : 1, uz = vzd > 0.0001 ? dz / vzd : 0
  return { x: hrac.x + ux * min, z: hrac.z + uz * min }
}
/** Explicit circular ground telegraph; a dodge must be active when the strike resolves. */
export function vZasahoveZone(hrac: Pozice2D, cil: Pozice2D, polomer: number): boolean {
  return Number.isFinite(hrac.x) && Number.isFinite(hrac.z) && vzdalenostTel(hrac, cil) <= polomer + KRYSTALOVY_TELO_HRACE
}
export const KRYSTALOVY_ARENA: Pozice2D = { x: 0, z: 4 }
export const KRYSTALOVY_ARENA_DOSAH = 3.2
export const KRYSTALOVY_ODMENA = { xp: 250, krystaly: 10, kamen: 8 } as const
export type KristalovyUtok = 'ostri' | 'vlna'
export interface KristalovySouboj {
  faze: 'boj' | 'vyhra' | 'prohra'
  bossHp: number
  hracHp: number
  dalsiUtokMs: number
  posledniUtokHraceMs: number
  uhybDoMs: number
  posledniUhybMs: number
  pocetUtoku: number
  utok: KristalovyUtok
  bossPozice?: Pozice2D
  posledniTikMs?: number
  cilUtoku?: Pozice2D
}
/** Pohyb bosse: pomalé pronásledování, bezpečné omezení delta-time a arény. */
export function posunKristalovehoStrazce(boss: Pozice2D, hrac: Pozice2D, dt: number, zuri: boolean): Pozice2D {
  const dx = hrac.x - boss.x, dz = hrac.z - boss.z
  const vzd = Math.hypot(dx, dz)
  if (!Number.isFinite(vzd) || vzd < KRYSTALOVY_TELO_BOSSE + KRYSTALOVY_TELO_HRACE + 0.65) return boss
  const krok = Math.min(vzd - (KRYSTALOVY_TELO_BOSSE + KRYSTALOVY_TELO_HRACE + 0.65), (zuri ? 2.5 : 1.55) * Math.max(0, Math.min(dt, 0.25)))
  const kandidat = { x: boss.x + dx / vzd * krok, z: boss.z + dz / vzd * krok }
  const ox = kandidat.x - KRYSTALOVY_ARENA.x, oz = kandidat.z - KRYSTALOVY_ARENA.z
  const odStredu = Math.hypot(ox, oz)
  return oddelTelesa(odStredu > 8 ? { x: KRYSTALOVY_ARENA.x + ox / odStredu * 8, z: KRYSTALOVY_ARENA.z + oz / odStredu * 8 } : kandidat, hrac)
}
export const poziceKristalovehoStrazce = (s: KristalovySouboj): Pozice2D => s.bossPozice ?? KRYSTALOVY_ARENA
export const vzdalenostOdKristaloveAreny = (p: Pozice2D): number => Math.hypot(p.x - KRYSTALOVY_ARENA.x, p.z - KRYSTALOVY_ARENA.z)
export const lzeVyzvatKristalovehoStrazce = (tretiDokoncena: boolean, jizPorazen: boolean, p: Pozice2D): boolean => tretiDokoncena && !jizPorazen && vzdalenostOdKristaloveAreny(p) <= KRYSTALOVY_ARENA_DOSAH
export const novyKristalovySouboj = (ted: number): KristalovySouboj => ({ faze: 'boj', bossHp: KRYSTALOVY_STRAZCE_HP, hracHp: KRYSTALOVY_HRAC_HP, dalsiUtokMs: ted + 2600, posledniUtokHraceMs: -Infinity, uhybDoMs: 0, posledniUhybMs: -Infinity, pocetUtoku: 0, utok: 'ostri', bossPozice: { ...KRYSTALOVY_ARENA }, posledniTikMs: ted })
export function zasahniKristalovehoStrazce(s: KristalovySouboj, ted: number, p: Pozice2D): KristalovySouboj {
  if (s.faze !== 'boj' || !hracDosahneNaBosse(p, poziceKristalovehoStrazce(s)) || ted - s.posledniUtokHraceMs < 650) return s
  const hp = Math.max(0, s.bossHp - (s.bossHp <= KRYSTALOVY_STRAZCE_HP / 2 ? 11 : 16))
  return { ...s, bossHp: hp, posledniUtokHraceMs: ted, faze: hp === 0 ? 'vyhra' : 'boj' }
}
export function uhniKristalovemuStrazci(s: KristalovySouboj, ted: number): KristalovySouboj {
  if (s.faze !== 'boj' || ted - s.posledniUhybMs < KRYSTALOVY_UHYB_COOLDOWN_MS) return s
  return { ...s, posledniUhybMs: ted, uhybDoMs: ted + KRYSTALOVY_UHYB_MS }
}
export function tikKristalovehoStrazce(s: KristalovySouboj, ted: number, p: Pozice2D): KristalovySouboj {
  if (s.faze !== 'boj') return s
  const zuriPohybu = s.bossHp <= KRYSTALOVY_STRAZCE_HP / 2
  const varuje = ted >= s.dalsiUtokMs - 900
  const pozice = !varuje ? posunKristalovehoStrazce(poziceKristalovehoStrazce(s), p, (ted - (s.posledniTikMs ?? ted)) / 1000, zuriPohybu) : poziceKristalovehoStrazce(s)
  const cilUtoku = varuje ? s.cilUtoku ?? { ...pozice } : undefined
  const aktualni = { ...s, bossPozice: pozice, posledniTikMs: ted, cilUtoku }
  if (ted < s.dalsiUtokMs) return aktualni
  const zuri = s.bossHp <= KRYSTALOVY_STRAZCE_HP / 2
  const polomer = s.utok === 'vlna' ? 5.0 : 3.1
  const zasah = !vZasahoveZone(p, cilUtoku ?? pozice, polomer) || s.uhybDoMs >= ted ? 0 : s.utok === 'vlna' ? 24 : zuri ? 20 : 13
  const hp = Math.max(0, s.hracHp - zasah)
  const pocetUtoku = s.pocetUtoku + 1
  return { ...aktualni, cilUtoku: undefined, hracHp: hp, pocetUtoku, utok: zuri && pocetUtoku % 2 === 1 ? 'vlna' : 'ostri', dalsiUtokMs: ted + (zuri ? 1750 : 2600), faze: hp === 0 ? 'prohra' : 'boj' }
}
export const kristalovyUtokVaruje = (s: KristalovySouboj, ted: number): boolean => s.faze === 'boj' && s.dalsiUtokMs - ted <= 900 && s.dalsiUtokMs > ted
