/** v15: static codex of existing world landmarks; no invented unlocks. */
export type ZaznamKodexu = {id:string;nazev:string;oblast:string;popis:string}
export const KODEX:readonly ZaznamKodexu[] = [
 {id:'osada',nazev:'Osada',oblast:'Začátek',popis:'Domov, budovy a obyvatelé.'},
 {id:'mytina',nazev:'Křišťálová mýtina',oblast:'Les',popis:'Krystaly a úlomky dávného světla.'},
 {id:'les',nazev:'Magický les',oblast:'Les',popis:'Skryté objevy a lesní tajemství.'},
 {id:'ruiny',nazev:'Zapomenuté ruiny',oblast:'Ruiny',popis:'Runová hádanka, fragmenty a Hlídač.'},
 {id:'hlidac',nazev:'Hlídač ruin',oblast:'Ruiny',popis:'Nepřítel s časovanými plošnými útoky.'},
]
export function najdiVKodexu(dotaz:string):ZaznamKodexu[] {const q=dotaz.trim().toLocaleLowerCase('cs');return KODEX.filter(x=>!q||`${x.nazev} ${x.oblast} ${x.popis}`.toLocaleLowerCase('cs').includes(q))}
