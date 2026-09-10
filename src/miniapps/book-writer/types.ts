// ==========================================
// Kniha — appka Writer's Roomu na psaní knih po kapitolách.
// ==========================================

import { StavPolozky } from '@/flagships/writer-room/writerRoomStav'
import JSZip from 'jszip'

export interface Kapitola {
  id: string
  nazev: string
  text: string
  createdAt: string
  // Ruční štítek postupu, přepínaný jedním klepnutím (Nápad →
  // Rozepsáno → Hotovo) — nezávislý na tom, jestli kapitola má text,
  // ať jde odlišit "ještě jsem to nezačal" od "mám odstavec, ale
  // rozhodně to není hotové".
  stav: StavPolozky
  // Autorova soukromá poznámka ke kapitole (např. "potřebuje revizi"),
  // oddělená od samotného textu kapitoly — nikdy se neexportuje do
  // .txt ani nezobrazuje v Náhledu, je jen pro appku samotnou.
  poznamka: string
  // Volné, autorem psané štítky (např. "akce, důležité") — na rozdíl
  // od `stav` (pevná tříhodnotová sada) jde o libovolný text, oddělený
  // čárkou jen na zobrazení. Nepovinné pole — starší uložená kapitola
  // ho nemá vůbec, fallback na prázdný řetězec (viz
  // bookWriterValidation.ts).
  stitky: string
}

export interface Kniha {
  id: string
  nazev: string
  // null = žádný cíl nenastaven, appka jen počítá, kolik slov už je hotovo.
  cilSlov: number | null
  kapitoly: Kapitola[]
  createdAt: string
  // Kdy byla kniha naposledy skutečně upravena (nová/upravená/smazaná
  // kapitola, změna cíle) — ne kdy byla založena. Bez tohohle dashboard
  // Writer's Roomu i seznam knih ukazovaly vždycky nejnověji ZALOŽENOU
  // knihu, ne tu, na které se doopravdy pracuje.
  upravenoAt: string
}

// Prostý rozdělovač podle bílých znaků — appka nepotřebuje přesné
// typografické počítadlo, jen orientační číslo pro cíl a přehled.
export const pocetSlov = (text: string): number => {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

export const celkovyPocetSlov = (kniha: Kniha): number =>
  kniha.kapitoly.reduce((soucet, k) => soucet + pocetSlov(k.text), 0)

// Stejný hrubý filmařský/čtenářský odhad jako Scénářovo odhadStopazeMinut
// vedle, jen v jednotkách "čtenář", ne "promítání" — běžná orientační
// rychlost čtení je kolem 200 slov za minutu. Appka žádné skutečné
// stránkování/typografii nedělá, takže jde jen o orientační číslo pro
// autora, ne o přesný přepočet.
const SLOV_ZA_MINUTU_CTENI = 200

export const odhadCteniMinut = (kniha: Kniha): number => Math.round(celkovyPocetSlov(kniha) / SLOV_ZA_MINUTU_CTENI)

// Seřadí knihy podle poslední úpravy, ne podle pořadí v poli (to je
// pořadí založení) — použito jak seznamem knih v appce samotné, tak
// Writer's Roomovým náhledem, ať obojí ukazuje totéž.
export const serazenoPodleUpravy = <T extends { upravenoAt: string }>(polozky: T[]): T[] =>
  [...polozky].sort((a, b) => b.upravenoAt.localeCompare(a.upravenoAt))

// Rychlé šablony struktury kapitol — místo prázdné kapitoly pokaždé
// znovu autor může jedním klepnutím založit celou hotovou kostru
// (názvy kapitol), do které pak jen píše. Pevná, malá sada — appka
// nenabízí vlastní/upravitelné šablony, stejná "pevná sada, ne
// libovolný vstup" zásada jako fixní barevné palety jinde v appce.
export interface SablonaKapitol {
  id: string
  nazev: string
  kapitoly: string[]
}

export const SABLONY_KAPITOL: SablonaKapitol[] = [
  {
    id: 'tri-akty',
    nazev: 'Tři akty',
    kapitoly: ['Akt I: Úvod', 'Akt II: Konflikt', 'Akt III: Rozuzlení'],
  },
  {
    id: 'hrdinova-cesta',
    nazev: 'Hrdinova cesta (zkráceně)',
    kapitoly: ['Obyčejný svět', 'Volání k dobrodružství', 'Zkoušky a spojenci', 'Nejtemnější hodina', 'Návrat proměněný'],
  },
]

// Poskládá celou knihu do jednoho čitelného textu pro export — nadpisy
// kapitol jako řádky navíc, jinak čistý text tak, jak ho autor napsal.
export const sestavTextKnihy = (kniha: Kniha): string =>
  [
    kniha.nazev.toUpperCase(),
    '',
    ...kniha.kapitoly.map((k, i) => `${i + 1}. ${k.nazev}\n\n${k.text.trim() || '(prázdná kapitola)'}`),
  ].join('\n\n')

const escapujXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Skládá knihu do skutečného, platného souboru EPUB (verze 2.0.1) —
// druhý, formátově věrný export vedle sestavTextKnihy výš, stejná
// role jako Scénářovo sestavFountain vedle jeho vlastní sestavTextScenare
// (čitelný .txt pro rychlé nahlédnutí, druhý formát pro skutečné čtečky/
// nástroje). Používá appce už existující JSZip závislost (stejnou, co
// core/utils/fileBackup.ts používá pro zálohy) — EPUB je jen zip se
// zvláštní strukturou (mimetype/META-INF/OEBPS), žádná binární data se
// nekódují, jen se sbalí vedle sebe. Prázdná kniha (bez kapitol) by
// znamenala prázdný spine, který skutečné čtečky odmítají — appka
// tenhle případ pokryje jednou zástupnou kapitolou místo pádu.
export const sestavEpub = async (kniha: Kniha): Promise<Blob> => {
  const zip = new JSZip()
  // mimetype musí být první soubor v archivu a nesmí být komprimovaný —
  // to je EPUB specifikace, ne appce vlastní rozhodnutí.
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  )

  const kapitolyKZapsani =
    kniha.kapitoly.length > 0
      ? kniha.kapitoly
      : [{ id: 'prazdna', nazev: kniha.nazev, text: '(kniha zatím nemá žádnou kapitolu)', createdAt: '', stav: 'napad' as StavPolozky, poznamka: '', stitky: '' }]

  const kapitolySoubory = kapitolyKZapsani.map((k, i) => {
    const jmeno = `kapitola${i + 1}.xhtml`
    const odstavce = (k.text.trim() || '(prázdná kapitola)')
      .split(/\n+/)
      .map((odstavec) => `<p>${escapujXml(odstavec)}</p>`)
      .join('\n')
    const obsah = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="cs">
<head><title>${escapujXml(k.nazev)}</title></head>
<body>
<h1>${escapujXml(k.nazev)}</h1>
${odstavce}
</body>
</html>`
    return { id: `kap${i + 1}`, jmeno, obsah, nazev: k.nazev }
  })

  kapitolySoubory.forEach(({ jmeno, obsah }) => zip.file(`OEBPS/${jmeno}`, obsah))

  const uid = `buddy-kniha-${kniha.id}`
  const manifestPolozky = kapitolySoubory
    .map(({ id, jmeno }) => `<item id="${id}" href="${jmeno}" media-type="application/xhtml+xml"/>`)
    .join('\n    ')
  const spinePolozky = kapitolySoubory.map(({ id }) => `<itemref idref="${id}"/>`).join('\n    ')

  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapujXml(kniha.nazev)}</dc:title>
    <dc:language>cs</dc:language>
    <dc:identifier id="BookId">${uid}</dc:identifier>
  </metadata>
  <manifest>
    ${manifestPolozky}
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    ${spinePolozky}
  </spine>
</package>`
  )

  const navPoints = kapitolySoubory
    .map(
      ({ jmeno, nazev }, i) => `<navPoint id="navpoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapujXml(nazev)}</text></navLabel>
      <content src="${jmeno}"/>
    </navPoint>`
    )
    .join('\n    ')

  zip.file(
    'OEBPS/toc.ncx',
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uid}"/>
  </head>
  <docTitle><text>${escapujXml(kniha.nazev)}</text></docTitle>
  <navMap>
    ${navPoints}
  </navMap>
</ncx>`
  )

  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
}
