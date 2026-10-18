export type Rozhovor={postava:string;tema:string;cas:number}
export function pridejRozhovor(log:readonly Rozhovor[],r:Rozhovor):Rozhovor[]{if(!r.postava.trim()||!r.tema.trim()||!Number.isFinite(r.cas))return [...log];return [...log.slice(-19),{postava:r.postava.slice(0,60),tema:r.tema.slice(0,120),cas:r.cas}]}
