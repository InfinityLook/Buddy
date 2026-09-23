// ==========================================
// Kalendář — jedna z šesti dlaždic School Roomu (viz CLAUDE.md), jediná
// z nich, co appka do teď vůbec neměla (Pomodoro/Poznámky/Úkoly/Soubory
// jen přesunuté existující miniaplikace, Statistiky odkaz na /odmeny).
//
// Datum se ukládá jako čistý řetězec 'YYYY-MM-DD', ne jako Date objekt
// nebo timestamp — stejná "zone-less string literal" opatrnost, kterou
// CLAUDE.md zmiňuje u testů (TZ pinning): řetězec se neposouvá podle
// časového pásma zařízení, kde appka zrovna běží, takže "15. května"
// zůstane "15. května" i po obnově zálohy na jiném telefonu.
// ==========================================

// Opakování — appka nikdy neukládá jednotlivé budoucí výskyty zvlášť,
// jen první datum (Udalost.datum) a typ opakování; kdy přesně se
// událost objeví dál, se spočítá za běhu (viz udalostSeVyskytujeVDen),
// stejný "spočítej při čtení, neukládej odvozený stav" duch jako
// appčina Rozvrhova týdenní šablona.
export const MOZNOSTI_OPAKOVANI = ['zadne', 'tydne', 'mesicne'] as const
export type Opakovani = (typeof MOZNOSTI_OPAKOVANI)[number]

export const NAZEV_OPAKOVANI: Record<Opakovani, string> = {
  zadne: 'Jednorázově',
  tydne: 'Každý týden',
  mesicne: 'Každý měsíc',
}

export interface Udalost {
  id: string
  /** 'YYYY-MM-DD', vždy místní datum, nikdy ne UTC posunuté. První (u
   *  jednorázové jediný) výskyt události. */
  datum: string
  nazev: string
  popis: string
  createdAt: number
  opakovani: Opakovani
}

/** Vyskytuje se událost v daný den? Počítáno vždy znovu z prvního data
 *  a typu opakování, nikdy z uloženého seznamu budoucích výskytů — ten
 *  appka nikdy nedrží. Den PŘED prvním výskytem se nikdy nepočítá, i
 *  kdyby náhodou vyšel na stejný den v týdnu/měsíci. */
export const udalostSeVyskytujeVDen = (udalost: Udalost, datumStr: string): boolean => {
  if (datumStr < udalost.datum) return false
  if (datumStr === udalost.datum) return true
  if (udalost.opakovani === 'zadne') return false

  const [rokU, mesicU, denU] = udalost.datum.split('-').map(Number)
  const [rokD, mesicD, denD] = datumStr.split('-').map(Number)

  // Měsíční opakování na den, co daný měsíc vůbec nemá (např. 31. v
  // dubnu), ten měsíc prostě přeskočí — appka nevymýšlí náhradní den,
  // stejná opatrnost jako appčiny recurring platby v Economy Roomu.
  if (udalost.opakovani === 'mesicne') return denD === denU

  // 'tydne' — stejný den v týdnu A rozdíl je celý násobek 7 dní.
  const prvni = new Date(rokU, mesicU - 1, denU)
  const kontrolovany = new Date(rokD, mesicD - 1, denD)
  if (kontrolovany.getDay() !== prvni.getDay()) return false
  const rozdilDni = Math.round((kontrolovany.getTime() - prvni.getTime()) / 86_400_000)
  return rozdilDni % 7 === 0
}

/** Kolik RŮZNÝCH událostí (ne jednotlivých výskytů) je ještě "před
 *  námi" — opakující se událost počítá vždycky, protože se objeví
 *  znovu bez ohledu na to, kolikrát už proběhla; jednorázová jen
 *  pokud její jediné datum ještě nenastalo. */
export const pocetNadchazejicichUdalosti = (udalosti: Udalost[], dnesniStr: string): number =>
  udalosti.filter((u) => u.opakovani !== 'zadne' || u.datum >= dnesniStr).length

// Pevná paleta barev pro označení dne — appka má přesně šest hlavních
// akcentových barev (viz styles/global.css's --accent-*), stejná sada se
// tu jen znovupoužívá jako "pevná nabídka, ne libovolný vstup" (stejný
// duch jako Social's IKONY_SKUPIN/EMOJI_REAKCI). Barva dne je nezávislá
// na tom, jestli má den nějakou událost — jde označit i prázdný den
// (např. "den volna", "den zkoušky"), proto žije jako vlastní mapa
// datum -> barva, ne jako pole na Udalost.
export const BARVY_DNE = ['cyan', 'violet', 'magenta', 'green', 'orange', 'red'] as const
export type BarvaDne = (typeof BARVY_DNE)[number]
