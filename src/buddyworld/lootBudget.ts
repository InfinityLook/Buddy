export function rozpocetOdmen(zaklad:number,bonus:number,limit=10000):number {
 if(![zaklad,bonus,limit].every(Number.isFinite)||limit<=0)return 0
 return Math.max(0,Math.min(Math.floor(limit),Math.floor(Math.max(0,zaklad)+Math.max(0,bonus))))
}
