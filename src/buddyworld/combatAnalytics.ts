export type SoubojUdalost = 'utok' | 'zasah' | 'uhyb' | 'chyba'
export function statistikaSouboje(udalosti: readonly SoubojUdalost[]) {
 const utoky=udalosti.filter(x=>x==='utok').length
 const zasahy=udalosti.filter(x=>x==='zasah').length
 const uhyby=udalosti.filter(x=>x==='uhyb').length
 return {utoky,zasahy,uhyby,uspesnost:utoky?Math.round(100*Math.min(zasahy,utoky)/utoky):0}
}
