/** v10.5: souboj v reálném čase řízený časovačem. Čas je monotónní (performance.now). */
import { novyHlidac, vDosahuHlidace, poziceHlidace, type HlidacRuin } from './hlidacRuin'
export const HLIDAC_INTERVAL_MS = 2600
export const HLIDAC_VAROVANI_MS = 850
export const HLIDAC_UTOK_COOLDOWN_MS = 700
export const HLIDAC_UHYB_MS = 950
export const HLIDAC_OBLAST_ZASAHU = 2.4
export const HLIDAC_RYCHLY_POLomer = 1.5
export const HLIDAC_RYCHLY_VAROVANI_MS = 600
export type DruhUderu = 'normalni' | 'rychly'
export const polomerUderu = (druh:DruhUderu):number => druh === 'rychly' ? HLIDAC_RYCHLY_POLomer : HLIDAC_OBLAST_ZASAHU
export const delkaVarovani = (druh:DruhUderu):number => druh === 'rychly' ? HLIDAC_RYCHLY_VAROVANI_MS : HLIDAC_VAROVANI_MS
export type Bod2D = {x:number;z:number}
export function vOblastiZasahu(hrac:Bod2D,stred:Bod2D,polomer=HLIDAC_OBLAST_ZASAHU):boolean { return Number.isFinite(hrac.x)&&Number.isFinite(hrac.z)&&Number.isFinite(stred.x)&&Number.isFinite(stred.z)&&Number.isFinite(polomer)&&polomer>0&&Math.hypot(hrac.x-stred.x,hrac.z-stred.z)<=polomer }
export type RealTimeHlidac = { posledniUtok: number; dalsiUder: number; uhybDo: number; stredUderu?: Bod2D; druhUderu: DruhUderu; cisloUderu: number }
export const novyRealTimeHlidac = (ted:number):RealTimeHlidac => ({posledniUtok:ted, dalsiUder:ted+HLIDAC_INTERVAL_MS, uhybDo:0, druhUderu:'normalni', cisloUderu:0})
export function utokVRealnemCase(stav:HlidacRuin,rt:RealTimeHlidac,pozice:{x:number;z:number},odemceno:boolean,ted:number):{stav:HlidacRuin;rt:RealTimeHlidac} {
  if (!odemceno || stav.porazen || !vDosahuHlidace(pozice) || !Number.isFinite(ted) || ted-rt.posledniUtok<HLIDAC_UTOK_COOLDOWN_MS) return {stav,rt}
  const hp=Math.max(0,stav.hp-1)
  return {stav:{...stav,hp,porazen:hp===0,uhyb:false},rt:{...rt,posledniUtok:ted}}
}
export function uhybVRealnemCase(rt:RealTimeHlidac,ted:number):RealTimeHlidac {
  if (!Number.isFinite(ted) || ted<rt.uhybDo) return rt
  return {...rt,uhybDo:ted+HLIDAC_UHYB_MS}
}
export function tikHlidace(stav:HlidacRuin,rt:RealTimeHlidac,pozice:{x:number;z:number},odemceno:boolean,ted:number):{stav:HlidacRuin;rt:RealTimeHlidac;udalost:'nic'|'uhyb'|'mimo'|'zasah'|'prohra'} {
  if (!odemceno || stav.porazen || !Number.isFinite(ted) || !vDosahuHlidace(pozice)) return {stav,rt:{...rt,dalsiUder:ted+HLIDAC_INTERVAL_MS},udalost:'nic'}
  if (ted<rt.dalsiUder) {
    // Zamknout pozici úderu při začátku varování: hráč může utéct mimo kruh.
    if (ted>=rt.dalsiUder-delkaVarovani(rt.druhUderu) && !rt.stredUderu) return {stav,rt:{...rt,stredUderu:poziceHlidace()},udalost:'nic'}
    return {stav,rt,udalost:'nic'}
  }
  const dalsi={...rt,dalsiUder:ted+HLIDAC_INTERVAL_MS,stredUderu:undefined,cisloUderu:rt.cisloUderu+1,druhUderu:rt.druhUderu==='normalni'?'rychly':'normalni' as DruhUderu}
  if (!vOblastiZasahu(pozice,rt.stredUderu ?? poziceHlidace(),polomerUderu(rt.druhUderu))) return {stav,rt:dalsi,udalost:'mimo'}
  if (ted<rt.uhybDo) return {stav,rt:dalsi,udalost:'uhyb'}
  const ochrana=stav.ochrana-1
  if (ochrana<=0) return {stav:{...novyHlidac(),porazky:Math.min(999,stav.porazky+1)},rt:novyRealTimeHlidac(ted),udalost:'prohra'}
  return {stav:{...stav,ochrana},rt:dalsi,udalost:'zasah'}
}
export function hlidacVaruje(rt:RealTimeHlidac,ted:number):boolean {return ted>=rt.dalsiUder-delkaVarovani(rt.druhUderu) && ted<rt.dalsiUder}
