export type Bod = {x:number;z:number}
export function vzdalenostBodu(a:Bod,b:Bod):number {
 if(![a.x,a.z,b.x,b.z].every(Number.isFinite))return Infinity
 return Math.hypot(a.x-b.x,a.z-b.z)
}
export function hroziZasah(hrac:Bod,stred:Bod,polomer:number):boolean {
 return Number.isFinite(polomer)&&polomer>=0&&vzdalenostBodu(hrac,stred)<=polomer
}
