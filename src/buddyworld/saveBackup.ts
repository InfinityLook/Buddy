/** Full save snapshot, including legacy player/village stores. */
export const SAVE_PREFIXY = ['buddyworld:', 'buddyworld-', 'schoolbuddy-buddyworld-'] as const
export type Zaloha = {format:'buddyworld-backup'; verze:1; data:Record<string,string>}
export const vlastniKlic=(key:string)=>SAVE_PREFIXY.some(prefix=>key.startsWith(prefix))
export function vytvorZalohu(storage:Pick<Storage,'length'|'key'|'getItem'>):Zaloha {
 const data:Record<string,string>={}
 for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k&&vlastniKlic(k)){const v=storage.getItem(k);if(v!==null&&v.length<=100000)data[k]=v}}
 return {format:'buddyworld-backup',verze:1,data}
}
export function overZalohu(input:unknown):input is Zaloha {
 if(!input||typeof input!=='object')return false
 const z=input as Partial<Zaloha>
 if(z.format!=='buddyworld-backup'||z.verze!==1||!z.data||typeof z.data!=='object'||Array.isArray(z.data))return false
 const entries=Object.entries(z.data)
 return entries.length<=250&&JSON.stringify(z.data).length<=1_900_000&&entries.every(([k,v])=>vlastniKlic(k)&&k.length<=200&&typeof v==='string'&&v.length<=100000)
}
// Exact snapshot restore, with rollback on a failed write. Unrelated app keys are untouched.
export function obnovZalohu(input:unknown,storage:Pick<Storage,'length'|'key'|'getItem'|'setItem'|'removeItem'>):boolean {
 if(!overZalohu(input))return false
 let before:Zaloha
 try{before=vytvorZalohu(storage)}catch{return false}
 try{
  for(const k of Object.keys(before.data))if(!(k in input.data))storage.removeItem(k)
  for(const [k,v] of Object.entries(input.data))storage.setItem(k,v)
  return true
 }catch{
  try{for(const k of Object.keys(input.data))if(!(k in before.data))storage.removeItem(k);for(const [k,v] of Object.entries(before.data))storage.setItem(k,v)}catch{/* The UI reports the failure. */}
  return false
 }
}
