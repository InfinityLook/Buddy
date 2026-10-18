export type Objev={id:string;nazev:string}
export const OBJEVY:readonly Objev[]=[{id:'osada',nazev:'Navštiv osadu'},{id:'les',nazev:'Prozkoumej magický les'},{id:'ruiny',nazev:'Najdi Zapomenuté ruiny'},{id:'fragmenty',nazev:'Sesbírej tři fragmenty'},{id:'hlidac',nazev:'Poraz Hlídače ruin'}]
export function stavObjevu(ids:readonly string[]):{hotovo:number;celkem:number}{const known=new Set(OBJEVY.map(x=>x.id));return {hotovo:new Set(ids.filter(x=>known.has(x))).size,celkem:OBJEVY.length}}
