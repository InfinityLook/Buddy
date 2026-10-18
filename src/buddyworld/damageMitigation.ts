export function poskozeniPoOchrane(poskozeni:number,ochrana:number):number {
 if(!Number.isFinite(poskozeni)||poskozeni<=0)return 0
 const d=Math.min(99999,Math.max(0,Math.round(poskozeni)))
 const o=Number.isFinite(ochrana)?Math.min(99999,Math.max(0,Math.round(ochrana))):0
 return Math.max(0,d-o)
}
