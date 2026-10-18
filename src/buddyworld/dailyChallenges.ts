/** v17: deterministic daily challenge rotation; no rewards to avoid repeat-claim exploits. */
export type DenniVyzva = {id:string;nazev:string;popis:string}
export const DENNI_VYZVY:readonly DenniVyzva[] = [
 {id:'pruzkum',nazev:'Průzkumník',popis:'Prozkoumej dnes jednu oblast světa.'},
 {id:'sbirani',nazev:'Sběratel',popis:'Sesbírej suroviny pro osadu.'},
 {id:'obcane',nazev:'Pomocník',popis:'Promluv s některým obyvatelem.'},
 {id:'trenink',nazev:'Trénink',popis:'Procvič soubojové ovládání.'},
]
export function vyzvaProDatum(isoDatum:string):DenniVyzva {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(isoDatum)||!Number.isFinite(Date.parse(`${isoDatum}T00:00:00Z`))) return DENNI_VYZVY[0]
 const den=Math.floor(Date.parse(`${isoDatum}T00:00:00Z`)/86400000)
 return DENNI_VYZVY[((den%DENNI_VYZVY.length)+DENNI_VYZVY.length)%DENNI_VYZVY.length]
}
