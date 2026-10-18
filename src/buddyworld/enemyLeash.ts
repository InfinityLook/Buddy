import {vzdalenostBodu,type Bod} from './enemyThreat'
export function rezimNepritele(hrac:Bod,nepritel:Bod,domov:Bod,aktivace:number,navrat:number):'klid'|'pronásledování'|'návrat' {
 if(!Number.isFinite(aktivace)||!Number.isFinite(navrat)||aktivace<0||navrat<aktivace)return 'klid'
 if(vzdalenostBodu(nepritel,domov)>navrat)return 'návrat'
 return vzdalenostBodu(hrac,nepritel)<=aktivace?'pronásledování':'klid'
}
