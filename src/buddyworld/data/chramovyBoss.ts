import type { Pozice2D } from '../types'
import { CHRAM_POZICE } from './chramStrazcu'

/** Chrámový strážce – časovaná výzva propojená s pozicí hráče v 3D aréně. */
export const STRAZCE_MAX_HP = 180
export const HRAC_MAX_HP = 100
export const DOSAH_VYZVY = 8
export const DOSAH_UTOKU = 4
export const DOSAH_BOSS_UTOKU = 5.5
/** Doba viditelného varování před úderem (ms). */
export const VAROVANI_PRED_UTOKEM_MS = 950
export const stavVarovani = (s: StavSouboje | null, ted: number) => s?.faze === 'boj' && ted < s.dalsiUtokMs && s.dalsiUtokMs - ted <= VAROVANI_PRED_UTOKEM_MS
export const zbyvaDoUtoku = (s: StavSouboje | null, ted: number) => s?.faze === 'boj' ? Math.max(0, s.dalsiUtokMs - ted) : null
export const ARENA_STRAZCE_POZICE: Pozice2D = { x: CHRAM_POZICE.x + 6.5, z: CHRAM_POZICE.z - 2 }
/** Boss patroluje pouze uvnitř arény; krok je omezen, aby neprošel stěnou. */
export const POHYB_BOSSE_M_S = 1.65
export const POLOMER_POHYBU_BOSSE = 3.0
export const POLOMER_PLOSNEHO_UDERU = 3.1
/** Druhá fáze: každý druhý úder je širší energetická vlna. */
export const POLOMER_ENERGETICKE_VLNY = 4.2
export const polomerUderu = (s: StavSouboje): number => s.typUderu === 'vlna' ? POLOMER_ENERGETICKE_VLNY : POLOMER_PLOSNEHO_UDERU
export function posunStrazce(od: Pozice2D, k: Pozice2D, sekundy: number): Pozice2D {
  const dx = k.x - od.x, dz = k.z - od.z
  const delka = Math.hypot(dx, dz)
  if (!Number.isFinite(sekundy) || sekundy <= 0 || delka < 0.001) return od
  const krok = Math.min(delka, POHYB_BOSSE_M_S * Math.min(sekundy, 0.25))
  const x = od.x + dx / delka * krok, z = od.z + dz / delka * krok
  const ax = x - ARENA_STRAZCE_POZICE.x, az = z - ARENA_STRAZCE_POZICE.z
  const vzd = Math.hypot(ax, az)
  return vzd <= POLOMER_POHYBU_BOSSE ? { x, z } : {
    x: ARENA_STRAZCE_POZICE.x + ax / vzd * POLOMER_POHYBU_BOSSE,
    z: ARENA_STRAZCE_POZICE.z + az / vzd * POLOMER_POHYBU_BOSSE,
  }
}
export const poziceStrazce = (s: StavSouboje | null): Pozice2D => s?.bossPozice ?? ARENA_STRAZCE_POZICE
export const vzdalenostOdStrazce = (p: Pozice2D, s: StavSouboje | null) => {
  const b = poziceStrazce(s)
  return Math.hypot(p.x - b.x, p.z - b.z)
}
export const vzdalenostOdAreny = (p: Pozice2D) => Math.hypot(p.x - ARENA_STRAZCE_POZICE.x, p.z - ARENA_STRAZCE_POZICE.z)
export const ODMENA_STRAZCE = { kamen: 25, krystaly: 35 } as const
export interface StavSouboje { bossHp: number; hracHp: number; dalsiUtokMs: number; krytDoMs: number; posledniZasahMs: number; uhybDoMs?: number; posledniUhybMs?: number; bossPozice?: Pozice2D; posledniTikMs?: number; cilUderu?: Pozice2D; typUderu?: 'uder' | 'vlna'; pocetUderu?: number; faze: 'boj' | 'vyhra' | 'prohra' }
export const vzdalenostKeStrazci = (p: Pozice2D) => vzdalenostOdAreny(p)
export const lzeVyzvatStrazce = (podzemi: boolean, porazen: boolean, p: Pozice2D) => podzemi && !porazen && vzdalenostKeStrazci(p) <= DOSAH_VYZVY
export const novySouboj = (ted: number): StavSouboje => ({ bossHp: STRAZCE_MAX_HP, hracHp: HRAC_MAX_HP, dalsiUtokMs: ted + 2500, krytDoMs: 0, posledniZasahMs: -Infinity, uhybDoMs: 0, posledniUhybMs: -Infinity, bossPozice: { ...ARENA_STRAZCE_POZICE }, posledniTikMs: ted, typUderu: 'uder', pocetUderu: 0, faze: 'boj' })
export function utokHrace(s: StavSouboje, ted: number, pozice?: Pozice2D): StavSouboje {
  if (pozice && vzdalenostOdStrazce(pozice, s) > DOSAH_UTOKU) return s
  if (s.faze !== 'boj' || ted - s.posledniZasahMs < 650) return s
  const hp = Math.max(0, s.bossHp - (s.bossHp <= STRAZCE_MAX_HP * .5 ? 12 : 16))
  return { ...s, bossHp: hp, posledniZasahMs: ted, faze: hp === 0 ? 'vyhra' : 'boj' }
}
export function kryjSe(s: StavSouboje, ted: number): StavSouboje {
  return s.faze !== 'boj' ? s : { ...s, krytDoMs: Math.max(s.krytDoMs, ted + 900) }
}
export function uhni(s: StavSouboje, ted: number): StavSouboje {
  if (s.faze !== 'boj' || ted - (s.posledniUhybMs ?? -Infinity) < 1800) return s
  return { ...s, uhybDoMs: ted + 700, posledniUhybMs: ted }
}
export function tikSouboje(s: StavSouboje, ted: number, pozice?: Pozice2D): StavSouboje {
  if (s.faze !== 'boj') return s
  // Boss pronásleduje hráče, ale během varování stojí a zamkne cílovou oblast.
  const varuje = ted >= s.dalsiUtokMs - VAROVANI_PRED_UTOKEM_MS
  const dt = Math.max(0, Math.min(250, ted - (s.posledniTikMs ?? ted))) / 1000
  const bossPozice = pozice && !varuje ? posunStrazce(poziceStrazce(s), pozice, dt) : poziceStrazce(s)
  const cilUderu = varuje && !s.cilUderu ? { ...bossPozice } : s.cilUderu
  const aktualni = { ...s, bossPozice, posledniTikMs: ted, cilUderu }
  if (ted < s.dalsiUtokMs) return aktualni
  const zuri = s.bossHp <= STRAZCE_MAX_HP * .5
  const stred = cilUderu ?? bossPozice
  const mimoDosah = pozice !== undefined && Math.hypot(pozice.x - stred.x, pozice.z - stred.z) > polomerUderu(s)
  const zasah = mimoDosah || (s.uhybDoMs ?? 0) >= ted ? 0 : s.krytDoMs >= ted ? 4 : s.typUderu === 'vlna' ? 26 : zuri ? 22 : 14
  const hp = Math.max(0, s.hracHp - zasah)
  const pocetUderu = (s.pocetUderu ?? 0) + 1
  const typUderu = zuri && pocetUderu % 2 === 0 ? 'vlna' : 'uder'
  return { ...aktualni, hracHp: hp, cilUderu: undefined, pocetUderu, typUderu, dalsiUtokMs: ted + (zuri ? 1700 : 2500), faze: hp === 0 ? 'prohra' : 'boj' }
}
export const overPorazenehoStrazce = (v: unknown): boolean => v === true
