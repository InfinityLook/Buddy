export type Suroviny={drevo:number;kamen:number;krystaly:number}
export function chybejiciSuroviny(mam:Suroviny,potreba:Suroviny):Suroviny {return {drevo:Math.max(0,potreba.drevo-mam.drevo),kamen:Math.max(0,potreba.kamen-mam.kamen),krystaly:Math.max(0,potreba.krystaly-mam.krystaly)}}
export function mamDost(mam:Suroviny,potreba:Suroviny):boolean {return Object.values(chybejiciSuroviny(mam,potreba)).every(x=>x===0)}
