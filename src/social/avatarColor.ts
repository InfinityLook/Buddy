// ==========================================
// Barva avataru odvozená z id uživatele.
//
// Dřív měl každý avatar stejný přechod cyan→violet — v seznamu deseti
// přátel nebylo na první pohled poznat, kdo je kdo, dokud si člověk
// nepřečetl jméno. Hash je deterministický (stejné id = stejná barva
// napořád, na všech zařízeních), takže se nikam neukládá.
// ==========================================

/** Jednoduchý řetězcový hash (varianta djb2), dost dobrý na rozptýlení
 *  barev, ne na cokoliv, co by muselo odolat schválnému hledání kolizí. */
const hash = (text: string): number => {
  let h = 5381
  for (let i = 0; i < text.length; i++) {
    h = (h * 33) ^ text.charCodeAt(i)
  }
  return Math.abs(h)
}

/** Odstín 0–360 pro dané id. */
export const hueProId = (id: string): number => hash(id) % 360

/** Dvojice barev na prstenec kolem avataru — stejný odstín, druhá barva
 *  posunutá o zlatý úhel, ať dvojice vždycky vypadá jako ladicí přechod,
 *  ne jako náhodně vedle sebe hozené barvy. */
export const avatarGradient = (id: string): { a: string; b: string } => {
  const h = hueProId(id)
  return {
    a: `hsl(${h}, 82%, 62%)`,
    b: `hsl(${(h + 137) % 360}, 78%, 56%)`,
  }
}
