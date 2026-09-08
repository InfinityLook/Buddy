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

export interface Udalost {
  id: string
  /** 'YYYY-MM-DD', vždy místní datum, nikdy ne UTC posunuté. */
  datum: string
  nazev: string
  popis: string
  createdAt: number
}

// Pevná paleta barev pro označení dne — appka má přesně šest hlavních
// akcentových barev (viz styles/global.css's --accent-*), stejná sada se
// tu jen znovupoužívá jako "pevná nabídka, ne libovolný vstup" (stejný
// duch jako Social's IKONY_SKUPIN/EMOJI_REAKCI). Barva dne je nezávislá
// na tom, jestli má den nějakou událost — jde označit i prázdný den
// (např. "den volna", "den zkoušky"), proto žije jako vlastní mapa
// datum -> barva, ne jako pole na Udalost.
export const BARVY_DNE = ['cyan', 'violet', 'magenta', 'green', 'orange', 'red'] as const
export type BarvaDne = (typeof BARVY_DNE)[number]
