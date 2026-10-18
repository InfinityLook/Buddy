/** v19: safe local preferences with no global side effects. */
export type Predvolby = {omezitPohyb:boolean;velkyText:boolean;zobrazitNapovedu:boolean}
export const VYCHOZI_PREDVOLBY:Predvolby={omezitPohyb:false,velkyText:false,zobrazitNapovedu:true}
export const KLIC_PREDVOLEB='buddyworld:predvolby:v1'
export function validujPredvolby(v:unknown):Predvolby {
 if(!v||typeof v!=='object')return {...VYCHOZI_PREDVOLBY}
 const p=v as Partial<Predvolby>
 return {omezitPohyb:typeof p.omezitPohyb==='boolean'?p.omezitPohyb:false,velkyText:typeof p.velkyText==='boolean'?p.velkyText:false,zobrazitNapovedu:typeof p.zobrazitNapovedu==='boolean'?p.zobrazitNapovedu:true}
}
export function nactiPredvolby(storage:Pick<Storage,'getItem'>):Predvolby {try{return validujPredvolby(JSON.parse(storage.getItem(KLIC_PREDVOLEB)||'null'))}catch{return {...VYCHOZI_PREDVOLBY}}}
export function ulozPredvolby(p:Predvolby,storage:Pick<Storage,'setItem'>):boolean {try{storage.setItem(KLIC_PREDVOLEB,JSON.stringify(validujPredvolby(p)));return true}catch{return false}}
