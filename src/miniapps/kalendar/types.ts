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
