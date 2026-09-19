// ==========================================
// Najít a nahradit napříč celým dílem — jedna malá čistá funkce
// sdílená všemi třemi appkami (Kniha/Scénář/Komiks), stejná role jako
// writerRoomSearch.ts/writerRoomStav.ts vedle: samotné nahrazení
// jednoho textového pole je triviální, ale appka ho volá na desítky
// polí najednou (každá kapitola/scéna/panel), takže se počítadlo
// skutečných záměn nemá počítat na čtyřech místech zvlášť.
//
// Ruční znak-po-znaku hledání shody bez ohledu na velikost písmen, ne
// regulární výraz — appka nepotřebuje "celé slovo" přepínač, jen
// spolehlivé nahrazení bez nutnosti escapovat speciální znaky regexu
// (autor může hledat třeba "?" nebo "(" v textu repliky), a bez
// String.prototype.split's vlastního omezení na přesnou shodu velikosti
// písmen. Case-insensitive schválně, stejně jako Osnovino vlastní
// hledání (obsahujeDotaz) — dřív "Nahradit vše" hledalo case-sensitive,
// takže hledání "petr" našlo shodu na "Petr" v Osnově, ale samotné
// nahrazení tiše nenahradilo nic, protože split() na přesnou shodu
// "petr" v textu se slovem "Petr" nikdy netrefí.
// ==========================================

export interface VysledekNahrazeni {
  text: string
  pocet: number
}

export const nahradVTextu = (text: string, hledatRaw: string, nahradit: string): VysledekNahrazeni => {
  // Jen hledaný výraz se ořezává — stejně jako obsahujeDotaz/najdiUryvek
  // ořezávají dotaz, ne to, co se hledáním najde. Nahradit se neořezává
  // schválně: autor může chtít nahradit "X" třeba za " X " s mezerami.
  const hledat = hledatRaw.trim()
  if (!hledat) return { text, pocet: 0 }

  const hledatMale = hledat.toLowerCase()
  const textMale = text.toLowerCase()
  let vysledek = ''
  let pocet = 0
  let i = 0
  while (i < text.length) {
    if (textMale.startsWith(hledatMale, i)) {
      vysledek += nahradit
      pocet++
      i += hledat.length
    } else {
      vysledek += text[i]
      i++
    }
  }
  return { text: vysledek, pocet }
}
