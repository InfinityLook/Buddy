import * as v from 'valibot'
import {
  Budget,
  EXPENSE_CATEGORIES,
  FinanceGoal,
  INCOME_CATEGORIES,
  RecurringTransaction,
  Transaction,
  Wallet,
} from '@/miniapps/finance/types'

// ==========================================
// Ověření uložených dat Financí — stejný "poškozená položka se tiše
// vyřadí, ne celý seznam" vzor jako ostatní miniaplikace. Pět
// nezávisle sanitizovaných polí (transakce/peněženky/rozpočty/
// opakující se platby/cíle), protože jsou to pořád vlastní, oddělené
// koncepty i po sloučení do jednoho Zustand storu.
// ==========================================

const VSECHNY_KATEGORIE: string[] = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

export const TransactionSchema = v.object({
  id: v.string(),
  type: v.string(),
  amount: v.number(),
  category: v.string(),
  note: v.optional(v.string(), ''),
  date: v.optional(v.string(), ''),
  createdAt: v.optional(v.string(), ''),
  walletId: v.optional(v.nullable(v.string()), null),
  receiptId: v.optional(v.nullable(v.string()), null),
  receiptMime: v.optional(v.nullable(v.string()), null),
  updatedAt: v.optional(v.number(), 0),
  deletedAt: v.optional(v.nullable(v.number()), null),
})

const sanitizujTransakci = (raw: unknown): Transaction | null => {
  const jedna = v.safeParse(TransactionSchema, raw)
  if (!jedna.success) return null
  const d = jedna.output
  if (d.type !== 'prijem' && d.type !== 'vydaj') return null
  if (!Number.isFinite(d.amount) || d.amount < 0) return null
  if (!VSECHNY_KATEGORIE.includes(d.category)) return null
  return { ...d, type: d.type, category: d.category as Transaction['category'] }
}

export const WalletSchema = v.object({
  id: v.string(),
  name: v.string(),
  icon: v.optional(v.nullable(v.string()), null),
  createdAt: v.optional(v.string(), ''),
  updatedAt: v.optional(v.number(), 0),
  deletedAt: v.optional(v.nullable(v.number()), null),
})

const sanitizujPenezenku = (raw: unknown): Wallet | null => {
  const jedna = v.safeParse(WalletSchema, raw)
  if (!jedna.success) return null
  if (!jedna.output.name.trim()) return null
  return jedna.output
}

export const BudgetSchema = v.object({
  id: v.string(),
  category: v.string(),
  limitKc: v.number(),
  createdAt: v.optional(v.string(), ''),
  updatedAt: v.optional(v.number(), 0),
  deletedAt: v.optional(v.nullable(v.number()), null),
})

const sanitizujRozpocet = (raw: unknown): Budget | null => {
  const jedna = v.safeParse(BudgetSchema, raw)
  if (!jedna.success) return null
  const d = jedna.output
  if (!(EXPENSE_CATEGORIES as string[]).includes(d.category)) return null
  if (!Number.isFinite(d.limitKc) || d.limitKc < 0) return null
  return { ...d, category: d.category as Budget['category'] }
}

export const RecurringSchema = v.object({
  id: v.string(),
  type: v.string(),
  amount: v.number(),
  category: v.string(),
  note: v.optional(v.string(), ''),
  dayOfMonth: v.number(),
  active: v.optional(v.boolean(), true),
  lastAddedMonth: v.optional(v.nullable(v.string()), null),
  createdAt: v.optional(v.string(), ''),
  updatedAt: v.optional(v.number(), 0),
  deletedAt: v.optional(v.nullable(v.number()), null),
})

const sanitizujOpakujici = (raw: unknown): RecurringTransaction | null => {
  const jedna = v.safeParse(RecurringSchema, raw)
  if (!jedna.success) return null
  const d = jedna.output
  if (d.type !== 'prijem' && d.type !== 'vydaj') return null
  if (!VSECHNY_KATEGORIE.includes(d.category)) return null
  if (!Number.isInteger(d.dayOfMonth) || d.dayOfMonth < 1 || d.dayOfMonth > 28) return null
  return { ...d, type: d.type, category: d.category as RecurringTransaction['category'] }
}

export const GoalSchema = v.object({
  id: v.string(),
  name: v.string(),
  targetAmount: v.number(),
  deadline: v.optional(v.nullable(v.string()), null),
  createdAt: v.optional(v.string(), ''),
  updatedAt: v.optional(v.number(), 0),
  deletedAt: v.optional(v.nullable(v.number()), null),
})

const sanitizujCil = (raw: unknown): FinanceGoal | null => {
  const jedna = v.safeParse(GoalSchema, raw)
  if (!jedna.success) return null
  if (!jedna.output.name.trim()) return null
  if (!Number.isFinite(jedna.output.targetAmount) || jedna.output.targetAmount < 0) return null
  return jedna.output
}

export const FinanceDataSchema = v.object({
  transactions: v.optional(v.array(v.unknown()), []),
  wallets: v.optional(v.array(v.unknown()), []),
  budgets: v.optional(v.array(v.unknown()), []),
  recurring: v.optional(v.array(v.unknown()), []),
  goals: v.optional(v.array(v.unknown()), []),
})

export const validateFinanceData = (data: unknown) => {
  const result = v.safeParse(FinanceDataSchema, data)
  if (!result.success) {
    console.warn('Data Financí neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  return {
    success: true as const,
    data: {
      transactions: result.output.transactions.map(sanitizujTransakci).filter((t): t is Transaction => t !== null),
      wallets: result.output.wallets.map(sanitizujPenezenku).filter((w): w is Wallet => w !== null),
      budgets: result.output.budgets.map(sanitizujRozpocet).filter((b): b is Budget => b !== null),
      recurring: result.output.recurring.map(sanitizujOpakujici).filter((r): r is RecurringTransaction => r !== null),
      goals: result.output.goals.map(sanitizujCil).filter((g): g is FinanceGoal => g !== null),
    },
  }
}
