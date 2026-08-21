// ==========================================
// Tvar dat Financí.
//
// Kategorie jsou pevná sada, ne uživatelský vstup — u peněz se vyplatí
// mít malý, dobře čitelný výčet, i za cenu, že si někdo přeje vlastní
// kategorii. Příjem a výdaj mají každý svou sadu, protože "Kapesné" mezi
// výdaji nebo "Zábava" mezi příjmy nedává smysl a jen by kategorii
// znejasnily.
// ==========================================

export type TransactionType = 'prijem' | 'vydaj'

export type IncomeCategory = 'Kapesné' | 'Brigáda' | 'Dar' | 'Ostatní příjem'
export type ExpenseCategory =
  | 'Jídlo'
  | 'Doprava'
  | 'Zábava'
  | 'Škola'
  | 'Oblečení'
  | 'Úspory'
  | 'Ostatní výdaj'

export type FinanceCategory = IncomeCategory | ExpenseCategory

export const INCOME_CATEGORIES: IncomeCategory[] = ['Kapesné', 'Brigáda', 'Dar', 'Ostatní příjem']

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Jídlo',
  'Doprava',
  'Zábava',
  'Škola',
  'Oblečení',
  'Úspory',
  'Ostatní výdaj',
]

/** Kategorie, které patří k danému typu transakce. */
export const categoriesFor = (type: TransactionType): FinanceCategory[] =>
  type === 'prijem' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

export interface Transaction {
  id: string
  type: TransactionType
  /** Celé koruny, vždy kladné — znaménko dává `type`. Desetihaléře by
   *  u kapesného jen komplikovaly zadávání bez skutečného přínosu. */
  amount: number
  category: FinanceCategory
  note: string
  /** Den, ke kterému transakce patří (YYYY-MM-DD), ne čas zápisu —
   *  uživatel často zapisuje včerejší útratu až večer. */
  date: string
  /** Čas skutečného vytvoření záznamu, pro řazení víc transakcí ve
   *  stejný den v pořadí, ve kterém vznikly. */
  createdAt: string
}

export type NewTransaction = Pick<Transaction, 'type' | 'amount' | 'category' | 'note' | 'date'>

/** Rozsah, za který se počítá souhrn a grafy. */
export type ObdobiFiltr = 'tento-mesic' | 'minuly-mesic' | 'vse'

export const OBDOBI_LABELS: Record<ObdobiFiltr, string> = {
  'tento-mesic': 'Tento měsíc',
  'minuly-mesic': 'Minulý měsíc',
  vse: 'Vše',
}

export type TypFiltr = 'vse' | TransactionType

export const TYP_LABELS: Record<TypFiltr, string> = {
  vse: 'Vše',
  prijem: 'Příjmy',
  vydaj: 'Výdaje',
}

/** Jeden výsek koláčového grafu — kategorie, částka a podíl v procentech. */
export interface KategorieVysek {
  category: FinanceCategory
  amount: number
  percent: number
}

/** Jeden měsíc v grafu trendu. */
export interface MesicniBod {
  /** YYYY-MM, pro řazení a jako React key */
  mesic: string
  /** Zkrácený název pro popisek pod sloupcem, např. "srp" */
  label: string
  prijmy: number
  vydaje: number
}
