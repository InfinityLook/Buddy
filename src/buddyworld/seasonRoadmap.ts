/** v18: visible progress roadmap, intentionally not automatic story completion. */
export type KrokSezony = {id:string;nazev:string;podminka:string}
export const KROKY_SEZONY:readonly KrokSezony[] = [
 {id:'uvod',nazev:'Prolog',podminka:'Seznam se s osadou a obyvateli.'},
 {id:'mytina',nazev:'Ztracené světlo',podminka:'Prozkoumej krystalovou mýtinu.'},
 {id:'les',nazev:'Hlasy lesa',podminka:'Odhal tajemství magického lesa.'},
 {id:'ruiny',nazev:'Vzpomínka strážců',podminka:'Vyřeš runy a najdi fragmenty.'},
 {id:'hlidac',nazev:'Zkouška ruin',podminka:'Poraz Hlídače ruin.'},
]
export function krokSezony(index:number):KrokSezony {return KROKY_SEZONY[Math.max(0,Math.min(KROKY_SEZONY.length-1,Math.floor(Number.isFinite(index)?index:0)))]}
