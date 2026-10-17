/** v10.3: jednorázové setkání po nalezení tří fragmentů. Bez farmitelných odměn. */
import { RUINY_POZICE } from './scene/zapomenuteRuiny3D'
export const HLIDAC_POZICE = { x: RUINY_POZICE.x + 8, z: RUINY_POZICE.z - 7 } as const
export const HLIDAC_DOSAH = 3.3
/** Runtime position is shared with the Three.js animation loop; resets on scene unmount. */
let aktualniPoziceHlidace: {x:number;z:number} = {...HLIDAC_POZICE}
export const poziceHlidace = () => ({...aktualniPoziceHlidace})
export function nastavPoziciHlidace(p:{x:number;z:number}):void { if(Number.isFinite(p.x)&&Number.isFinite(p.z)) aktualniPoziceHlidace={x:p.x,z:p.z} }
export function resetPoziceHlidace():void { aktualniPoziceHlidace={...HLIDAC_POZICE} }
export function vzdalenostOdHlidace(p:{x:number;z:number}):number { return Math.hypot(p.x-aktualniPoziceHlidace.x,p.z-aktualniPoziceHlidace.z) }
export const HLIDAC_MAX_HP = 3
export const HLIDAC_KLIC = 'buddyworld:hlidac-ruin:v1'
export type HlidacRuin = { hp: number; porazen: boolean; ochrana: number; uhyb: boolean; porazky: number }
export const novyHlidac = (): HlidacRuin => ({hp:HLIDAC_MAX_HP,porazen:false,ochrana:3,uhyb:false,porazky:0})
export function validujHlidace(value: unknown): HlidacRuin {
  if (!value || typeof value !== 'object') return novyHlidac()
  const v = value as Record<string,unknown>
  if (v.porazen === true) return {hp:0,porazen:true,ochrana:Math.max(0,Math.min(3,Number.isInteger(v.ochrana)?v.ochrana as number:3)),uhyb:false,porazky:0}
  if (!Number.isInteger(v.hp) || (v.hp as number) < 1 || (v.hp as number) > HLIDAC_MAX_HP) return novyHlidac()
  return {hp:v.hp as number,porazen:false,ochrana:Number.isInteger(v.ochrana)&& (v.ochrana as number)>=1 && (v.ochrana as number)<=3 ? v.ochrana as number:3,uhyb:v.uhyb===true,porazky:Number.isInteger(v.porazky)&& (v.porazky as number)>=0 && (v.porazky as number)<=999 ? v.porazky as number:0}
}
export function vDosahuHlidace(p: {x:number;z:number}): boolean {
  return Number.isFinite(p.x) && Number.isFinite(p.z) && vzdalenostOdHlidace(p) <= HLIDAC_DOSAH
}
export function zasahniHlidace(stav: HlidacRuin, pozice: {x:number;z:number}, odemceno:boolean): HlidacRuin {
  if (!odemceno || stav.porazen || !vDosahuHlidace(pozice)) return stav
  const hp = Math.max(0,stav.hp-1)
  if (hp === 0) return {...stav,hp:0,porazen:true,uhyb:false}
  // Po zásahu hlídač oplatí úder; připravený úhyb zabrání ztrátě ochrany.
  const ochrana = Math.max(0, stav.ochrana-(stav.uhyb ? 0 : 1))
  if (ochrana===0) return {...novyHlidac(),porazky:Math.min(999,stav.porazky+1)}
  return {...stav,hp,ochrana,uhyb:false}
}
export function nactiHlidace(): HlidacRuin {
  try { return validujHlidace(JSON.parse(localStorage.getItem(HLIDAC_KLIC) ?? 'null')) } catch { return novyHlidac() }
}
export function ulozHlidace(stav: HlidacRuin): boolean {
  try { const text=JSON.stringify(validujHlidace(stav)); localStorage.setItem(HLIDAC_KLIC,text); return localStorage.getItem(HLIDAC_KLIC)===text } catch { return false }
}

/** Úhyb je příprava na následující útok; sám o sobě nezpůsobuje poškození. */
export function pripravUhyb(stav:HlidacRuin,pozice:{x:number;z:number},odemceno:boolean):HlidacRuin {
  if (!odemceno || stav.porazen || stav.uhyb || !vDosahuHlidace(pozice)) return stav
  return {...stav,uhyb:true}
}
