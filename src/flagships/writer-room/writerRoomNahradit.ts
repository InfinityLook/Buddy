// ==========================================
// Najít a nahradit napříč celým dílem — jedna malá čistá funkce
// sdílená všemi třemi appkami (Kniha/Scénář/Komiks), stejná role jako
// writerRoomSearch.ts/writerRoomStav.ts vedle: samotné nahrazení
// jednoho textového pole je triviální, ale appka ho volá na desítky
// polí najednou (každá kapitola/scéna/panel), takže se počítadlo
// skutečných záměn nemá počítat na čtyřech místech zvlášť.
//
// Prostý split/join podle přesné shody, ne regulární výraz — appka
// nepotřebuje "celé slovo"/case-insensitive přepínače, jen spolehlivé
// nahrazení bez nutnosti escapovat speciální znaky regexu (autor může
// hledat třeba "?" nebo "(" v textu repliky).
// ==========================================

export interface VysledekNahrazeni {
  text: string
  pocet: number
}

export const nahradVTextu = (text: string, hledat: string, nahradit: string): VysledekNahrazeni => {
  if (!hledat) return { text, pocet: 0 }
  const casti = text.split(hledat)
  return { text: casti.join(nahradit), pocet: casti.length - 1 }
}
