export type Pozice = {x:number;z:number}
export function omezPozici(p:Pozice,hranice:{minX:number;maxX:number;minZ:number;maxZ:number}):Pozice {
 const {minX,maxX,minZ,maxZ}=hranice
 if(![p.x,p.z,minX,maxX,minZ,maxZ].every(Number.isFinite)||minX>maxX||minZ>maxZ)return {x:0,z:0}
 return {x:Math.max(minX,Math.min(maxX,p.x)),z:Math.max(minZ,Math.min(maxZ,p.z))}
}
