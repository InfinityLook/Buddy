export type Diagnostika={kontroly:number;uspesne:number;chyby:readonly string[]}
export function vyhodnotDiagnostiku(vysledky:readonly {nazev:string;ok:boolean}[]):Diagnostika {return {kontroly:vysledky.length,uspesne:vysledky.filter(x=>x.ok).length,chyby:vysledky.filter(x=>!x.ok).map(x=>x.nazev)}}
export function diagnostikaOK(d:Diagnostika):boolean {return d.kontroly>0&&d.kontroly===d.uspesne&&d.chyby.length===0}
