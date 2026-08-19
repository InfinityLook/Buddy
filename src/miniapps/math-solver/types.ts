export interface HistoryItem {
  id: string
  expression: string
  result: string
  // U rovnic i jednotlivé kroky řešení, u prostých výpočtů prázdné
  steps: string[]
  timestamp: string
  // Režim úhlu při výpočtu. Bez něj vypadaly dva zápisy sin(30)
  // s výsledky 0.5 a -0.988 jako chyba, přestože jsou oba správně.
  angleMode?: 'deg' | 'rad'
}
