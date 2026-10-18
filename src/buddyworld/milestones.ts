/** v16: progress badges computed from actual existing achievements. */
export type Pokrok = {ruiny:boolean;fragmenty:number;lesniObjevy:number;hlidac:boolean}
export type Milnik = {id:string;nazev:string;splneno:boolean}
export function vyhodnotMilniky(p:Pokrok):Milnik[] {return [
 {id:'runy',nazev:'Čtenář run',splneno:p.ruiny},
 {id:'fragmenty',nazev:'Sběratel fragmentů',splneno:p.fragmenty>=3},
 {id:'les',nazev:'Průzkumník lesa',splneno:p.lesniObjevy>=3},
 {id:'hlidac',nazev:'Ochránce ruin',splneno:p.hlidac},
]}
export function procentaMilniku(p:Pokrok):number {return Math.round(100*vyhodnotMilniky(p).filter(m=>m.splneno).length/4)}
