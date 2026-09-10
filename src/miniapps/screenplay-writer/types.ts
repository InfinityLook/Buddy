// ==========================================
// Scénář — appka Writer's Roomu na psaní scénářů ve skutečném
// scénáristickém formátu: scéna má nadpis (INT/EXT. MÍSTO – ČAS)
// a sled prvků (akce, nebo postava+dialog).
// ==========================================

import { StavPolozky } from '@/flagships/writer-room/writerRoomStav'

export type TypMista = 'INT' | 'EXT' | 'INT/EXT'
export const TYPY_MIST: TypMista[] = ['INT', 'EXT', 'INT/EXT']

export interface AkcePrvek {
  id: string
  typ: 'akce'
  text: string
}

export interface DialogPrvek {
  id: string
  typ: 'dialog'
  postava: string
  text: string
  // Nepovinná herecká poznámka v závorce, např. "(bez otáčení)".
  poznamka: string
}

export type ScenaPrvek = AkcePrvek | DialogPrvek

export interface Scena {
  id: string
  typMista: TypMista
  misto: string
  cas: string
  prvky: ScenaPrvek[]
  createdAt: string
  // Stejný ruční štítek postupu jako Kapitola.stav v Knize — cyklovaný
  // jedním klepnutím, nezávislý na tom, jestli scéna má text.
  stav: StavPolozky
  // Stejná role jako Kapitola.poznamka — autorova soukromá poznámka,
  // do exportu/Náhledu se nepromítá.
  poznamka: string
}

export interface Scenar {
  id: string
  nazev: string
  sceny: Scena[]
  createdAt: string
  // Stejný důvod jako u Kniha.upravenoAt — kdy se na scénáři naposledy
  // doopravdy psalo, ne kdy byl založen.
  upravenoAt: string
  // Stejná role jako Kniha.cilSlov, jen v počtu scén — null = žádný cíl
  // nenastaven.
  cilScen: number | null
  // "Bible postav" — krátká soukromá poznámka (vzhled, motivace) ke
  // jménu už použitému v dialogu (viz ziskejPostavy níž). Klíčovaná
  // jménem, ne id — appka nemá žádný samostatný "seznam postav" se
  // vznikem/id, jméno v dialogu JE ta jediná identita postavy tady.
  // Nepovinné pole — starší uložený scénář ho nemá vůbec, fallback na
  // prázdný objekt (viz screenplayWriterValidation.ts).
  postavyPoznamky: Record<string, string>
}

// Skládá skutečný scénáristický nadpis scény z jejích tří polí — appka
// je nikdy neukládá jako jeden řetězec, ať se dá místo/čas upravit
// samostatně beze změny formátu.
export const nadpisSceny = (s: Scena, poradi: number): string =>
  `${poradi}. ${s.typMista}. ${s.misto.toUpperCase()} – ${s.cas.toUpperCase()}`

// Stejná "podle poslední úpravy, ne podle založení" logika jako u Knihy.
export const serazenoPodleUpravy = <T extends { upravenoAt: string }>(polozky: T[]): T[] =>
  [...polozky].sort((a, b) => b.upravenoAt.localeCompare(a.upravenoAt))

// Stejný prostý rozdělovač podle bílých znaků jako Kniha.pocetSlov —
// duplikovaný záměrně, ne importovaný z book-writer, ať appky
// zůstanou vzájemně nezávislé (stejná zásada jako u BARVY_UZLU jinde
// v appce).
export const pocetSlov = (text: string): number => {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

// Jména postav skutečně použitá v dialogu napříč celým scénářem, bez
// duplicit a abecedně — appka je používá jako nabídku už-použitých
// jmen při psaní repliky, ať nevznikne "Petr" vs. "petr".
export const ziskejPostavy = (scenar: Scenar): string[] => {
  const jmena = new Set<string>()
  scenar.sceny.forEach((s) =>
    s.prvky.forEach((p) => {
      if (p.typ === 'dialog' && p.postava.trim()) jmena.add(p.postava.trim())
    })
  )
  return [...jmena].sort((a, b) => a.localeCompare(b, 'cs'))
}

// Hrubý filmařský odhad stopáže — běžná scénáristická stránka se
// počítá jako cca 200 slov a cca jedna minuta promítání. Appka žádné
// skutečné stránkování nedělá, takže jde jen o orientační číslo pro
// autora, ne o přesný přepočet — proto zaokrouhlené na celé minuty.
const SLOV_NA_STRANU_SCENARE = 200

export const odhadStopazeMinut = (scenar: Scenar): number => {
  const slovCelkem = scenar.sceny.reduce(
    (soucet, s) => soucet + s.prvky.reduce((mezisoucet, p) => mezisoucet + pocetSlov(p.text), 0),
    0
  )
  return Math.round(slovCelkem / SLOV_NA_STRANU_SCENARE)
}

// Rychlé šablony struktury scén — stejná role a stejná "pevná sada, ne
// libovolný vstup" zásada jako Kniha's SABLONY_KAPITOL. Appka založí
// scény s tímhle místem/časem, ať autor nezačíná pokaždé od úplně
// prázdné scény.
export interface SablonaScen {
  id: string
  nazev: string
  sceny: { typMista: TypMista; misto: string; cas: string }[]
}

export const SABLONY_SCEN: SablonaScen[] = [
  {
    id: 'tri-akty',
    nazev: 'Tři akty',
    sceny: [
      { typMista: 'INT', misto: 'AKT I – ÚVOD', cas: 'DEN' },
      { typMista: 'INT', misto: 'AKT II – KONFLIKT', cas: 'DEN' },
      { typMista: 'INT', misto: 'AKT III – ROZUZLENÍ', cas: 'DEN' },
    ],
  },
]

// Skládá scénář do skutečného formátu Fountain (https://fountain.io) —
// prostého textového standardu, který otevře Final Draft i jiné
// profesionální scénáristické nástroje. Na rozdíl od sestavTextScenare
// níž (čitelný, ale ne strojově formátovaný export) tohle dodržuje
// skutečnou Fountain syntaxi: scéna začíná INT./EXT. na začátku
// odstavce, postava je celý řádek velkými písmeny, herecká poznámka v
// závorce na vlastním řádku. Krátká title page (`Title: …`) na
// začátku — appka nezná autora ani datum, takže jen název.
export const sestavFountain = (scenar: Scenar): string => {
  const znackaMista = (t: TypMista): string => (t === 'INT/EXT' ? 'INT./EXT.' : `${t}.`)
  const bloky = scenar.sceny.map((s) => {
    const nadpis = `${znackaMista(s.typMista)} ${s.misto.toUpperCase()} - ${s.cas.toUpperCase()}`
    const radky = s.prvky.map((p) =>
      p.typ === 'akce'
        ? p.text
        : [p.postava.toUpperCase(), p.poznamka ? `(${p.poznamka})` : null, p.text].filter(Boolean).join('\n')
    )
    return [nadpis, ...(radky.length > 0 ? radky : ['(scéna zatím nemá žádný text)'])].join('\n\n')
  })
  return [`Title: ${scenar.nazev}`, '', ...bloky].join('\n\n')
}

// Poskládá celý scénář do jednoho čitelného scénáristického textu pro
// export — stejný formát, jaký appka sama vykresluje v editoru
// (nadpis scény, akce prostým textem, dialog s postavou velkými
// písmeny a nepovinnou herecká poznámkou v závorce).
export const sestavTextScenare = (scenar: Scenar): string =>
  [
    scenar.nazev.toUpperCase(),
    '',
    ...scenar.sceny.map((s, i) => {
      const radky = s.prvky.map((p) =>
        p.typ === 'akce'
          ? p.text
          : `${p.postava.toUpperCase()}${p.poznamka ? ` (${p.poznamka})` : ''}\n${p.text}`
      )
      return [nadpisSceny(s, i + 1), '', ...(radky.length > 0 ? radky : ['(scéna zatím nemá žádný text)'])].join('\n\n')
    }),
  ].join('\n\n')
