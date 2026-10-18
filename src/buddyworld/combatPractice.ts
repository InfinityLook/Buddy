export type Trenink={zasahy:number;uhyby:number;chyby:number}
export const novyTrenink=():Trenink=>({zasahy:0,uhyby:0,chyby:0})
export function zaznamenejTrenink(t:Trenink,typ:'zasah'|'uhyb'|'chyba'):Trenink {const k=typ==='zasah'?'zasahy':typ==='uhyb'?'uhyby':'chyby';return {...t,[k]:Math.min(9999,t[k]+1)}}
export function uspesnostTreninku(t:Trenink):number {const n=t.zasahy+t.uhyby+t.chyby;return n?Math.round((t.zasahy+t.uhyby)/n*100):0}
