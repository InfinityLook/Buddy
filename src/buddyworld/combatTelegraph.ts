export type Signal='kruh'|'rychly'|'klid'
export function popisSignalu(signal:Signal):string {switch(signal){case 'kruh':return 'Plošný útok: uteč mimo červený kruh.';case 'rychly':return 'Rychlý útok: reaguj okamžitě.';default:return 'Sleduj pohyb nepřítele.'}}
export function casNaReakci(signal:Signal):number{return signal==='rychly'?600:signal==='kruh'?850:0}
