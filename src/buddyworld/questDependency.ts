export type Uzol = {id:string;vyzaduje:readonly string[]}
export function odemceneUkoly(uzly:readonly Uzol[],splnene:readonly string[]):string[] {
 const hotovo=new Set(splnene)
 return uzly.filter(u=>!hotovo.has(u.id)&&u.vyzaduje.every(x=>hotovo.has(x))).map(u=>u.id)
}
