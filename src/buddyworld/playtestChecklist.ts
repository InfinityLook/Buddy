export type Kontrola = {id:string;hotovo:boolean}
export function stavPlaytestu(kontroly:readonly Kontrola[]) {
 const jedinecne=new Map<string,boolean>()
 for(const k of kontroly)if(k&&typeof k.id==='string'&&k.id.trim())jedinecne.set(k.id,Boolean(k.hotovo))
 const celkem=jedinecne.size,hotovo=[...jedinecne.values()].filter(Boolean).length
 return {celkem,hotovo,zbyva:celkem-hotovo,procenta:celkem?Math.round(hotovo*100/celkem):0}
}
