// ==========================================
// Vlnová vizualizace nahrávky — stejná "žádná knihovna pro pár sloupců"
// zásada jako appčin 14denní graf aktivity ve Fitness/Writer Roomu:
// obyčejný sloupcový graf z <div>ů, jen tady výška sloupce odpovídá
// vrcholu amplitudy toho úseku nahrávky, ne počtu za den. Kreslení
// samotné je proto v `Waveform.tsx` (JSX), tady je jen čistá funkce,
// co z dekódovaných dat spočítá vrcholy — testovatelná bez
// prohlížečového Web Audia, stejně jako wavEncoder.ts.
// ==========================================

export interface ZvukovaDataProVlnu {
  length: number
  getChannelData(channel: number): Float32Array
}

/** Rozdělí nahrávku na `pocetSloupcu` stejně dlouhých úseků a pro
 *  každý vrátí vrchol (maximum absolutní hodnoty) amplitudy — appka
 *  bere vrchol, ne průměr, ať i krátké, hlasité momenty (bicí rána,
 *  slabika) zůstanou ve vizualizaci vidět, ne rozmělněné průměrem
 *  celého úseku. */
export const spocitejVrcholyVlny = (buffer: ZvukovaDataProVlnu, pocetSloupcu = 40): number[] => {
  if (buffer.length === 0) return Array(pocetSloupcu).fill(0)
  const data = buffer.getChannelData(0)
  const velikostBloku = Math.max(1, Math.floor(buffer.length / pocetSloupcu))
  const vrcholy: number[] = []
  for (let i = 0; i < pocetSloupcu; i++) {
    let max = 0
    const zacatek = i * velikostBloku
    const konec = Math.min(buffer.length, zacatek + velikostBloku)
    for (let j = zacatek; j < konec; j++) {
      const vzorek = Math.abs(data[j] ?? 0)
      if (vzorek > max) max = vzorek
    }
    vrcholy.push(max)
  }
  return vrcholy
}
