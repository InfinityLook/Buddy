export interface HistoryItem {
  id: string
  expression: string
  result: string
  // U rovnic i jednotlivé kroky řešení, u prostých výpočtů prázdné
  steps: string[]
  timestamp: string
}
