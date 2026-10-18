/** v13: bounded, privacy-preserving in-session combat events. */
export type BojovaUdalost = 'utok'|'zasah'|'uhyb'|'unik'|'vitezstvi'|'prohra'
export type ZaznamBoje = { id:number; druh:BojovaUdalost; cas:number }
export function pridejZaznam(log:readonly ZaznamBoje[], druh:BojovaUdalost,cas:number):ZaznamBoje[] {
 if(!Number.isFinite(cas)||cas<0) return [...log]
 const id=(log[log.length-1]?.id??0)+1
 return [...log,{id,druh,cas:Math.round(cas)}].slice(-50)
}
export function souhrnBoje(log:readonly ZaznamBoje[]) {
 return {utoky:log.filter(e=>e.druh==='utok').length,uhyby:log.filter(e=>e.druh==='uhyb').length,zasahy:log.filter(e=>e.druh==='zasah').length}
}
