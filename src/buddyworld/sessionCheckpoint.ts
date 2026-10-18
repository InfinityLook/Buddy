export type Checkpoint = {id:string;cas:number}
export function posledniCheckpoint(data:readonly Checkpoint[]):Checkpoint|null {
 const platne=data.filter(x=>x&&typeof x.id==='string'&&x.id.length>0&&Number.isFinite(x.cas)&&x.cas>=0)
 return platne.reduce<Checkpoint|null>((best,x)=>!best||x.cas>best.cas?x:best,null)
}
