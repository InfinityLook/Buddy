import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateBuddyWorldData } from '@/core/utils/buddyWorldValidation'
import { MASKOTI, VYCHOZI_MASKOT_ID } from './data/maskoti'
import { hracStavZUrovne, pripocistXp } from './leveling'
interface BuddyWorldState {
 level: number; xp: number; aktivniMaskotId: string; odemceneMaskoty: string[]; odmenyXp: string[]
 ulozPostup: (level: number, xp: number)=>void
 pridejXp: (xp: number, id?: string)=>void
 vybratMaskota: (id: string)=>void
}
export const useBuddyWorldStore = create<BuddyWorldState>()(persist((set,get)=>({
 level:1,xp:0,aktivniMaskotId:VYCHOZI_MASKOT_ID,odemceneMaskoty:MASKOTI.map(m=>m.id),odmenyXp:[],
 ulozPostup:(level,xp)=>set({level,xp}),
 pridejXp:(xp,id)=>set(s=>{
  if(!Number.isFinite(xp)||xp<=0||(id&&s.odmenyXp.includes(id)))return s
  const next=pripocistXp(hracStavZUrovne(s.level,s.xp),Math.min(10000,xp))
  return {level:next.level,xp:next.xp,odmenyXp:id?[...s.odmenyXp,id].slice(-500):s.odmenyXp}
 }),
 vybratMaskota:id=>{if(get().odemceneMaskoty.includes(id))set({aktivniMaskotId:id})},
}),{
 name:'schoolbuddy-buddyworld-storage',storage:createJSONStorage(()=>secureStorage),
 merge:(saved,current)=>{
  if(saved==null)return current
  const v=validateBuddyWorldData(saved);if(!v.success)return current
  const ledger=(saved as {odmenyXp?:unknown}).odmenyXp
  return {...current,...v.data,odemceneMaskoty:MASKOTI.map(m=>m.id),odmenyXp:Array.isArray(ledger)?[...new Set(ledger.filter((x):x is string=>typeof x==='string'&&x.length<120))].slice(-500):[]}
 },
}))
