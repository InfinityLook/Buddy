export function zbyvaCooldown(posledni:number,ted:number,interval:number):number {
 if(![posledni,ted,interval].every(Number.isFinite)||interval<=0)return 0
 return Math.max(0,Math.ceil(interval-Math.max(0,ted-posledni)))
}
export function lzeZautocit(posledni:number,ted:number,interval:number):boolean {return zbyvaCooldown(posledni,ted,interval)===0}
