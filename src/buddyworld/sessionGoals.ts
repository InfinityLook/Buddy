export type Cil={id:string;text:string;minuty:number}
export const CILE:readonly Cil[]=[{id:'kratky',text:'Prozkoumej jednu novou oblast',minuty:5},{id:'stredni',text:'Promluv s obyvateli osady',minuty:15},{id:'dlouhy',text:'Pokračuj v příběhové výpravě',minuty:30}]
export function cilProCas(minuty:number):Cil {return CILE.reduce((best,c)=>c.minuty<=minuty?c:best,CILE[0])}
