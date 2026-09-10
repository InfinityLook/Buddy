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
  /** null = nezařazeno do žádné konkrétní peněženky/účtu (výchozí,
   *  zpětně kompatibilní stav pro záznamy z doby před peněženkami). */
  walletId: string | null
  /** Klíč do sdíleného IndexedDB souborového úložiště
   *  (core/utils/fileStorage.ts), null = bez přílohy. */
  receiptId: string | null
  receiptMime: string | null
  /** Kdy byl záznam naposledy změněn — cloudová synchronizace
   *  (financeSync.ts) podle toho pozná, co poslat/stáhnout, stejný
   *  "časové razítko, ne countdown" přístup jako Pomodorovo endsAt. */
  updatedAt: number
  /** Měkké smazání — tvrdé DELETE by se na zařízení, co si smazání
   *  ještě nestáhlo, nikdy neprojevilo. Stejný důvod jako
   *  messages.deleted_at v Social. null = není smazáno. */
  deletedAt: number | null
}

export type NewTransaction = Pick<Transaction, 'type' | 'amount' | 'category' | 'note' | 'date'> & {
  walletId?: string | null
  receiptId?: string | null
  receiptMime?: string | null
}

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

// ==========================================
// Čisté funkce nad transakcemi — schválně v types.ts, ne v
// useFinance.ts. useFinance.ts od chvíle, kdy umí notifikace na
// opakující se platby, importuje core/utils/notify.ts, které přes
// core/utils/registerSW.ts vede k virtuálnímu modulu
// "virtual:pwa-register" (vite-plugin-pwa), jaký Vitestova vlastní
// instance Vite nezná — přesně ten samý "nejde vykreslit ve Vitestu"
// strop, co CLAUDE.md už zaznamenal pro celé vlajkové appky, tady
// dopadl i na čisté funkce, kdyby zůstaly ve stejném souboru. Testy
// (tests/unit/finance.test.ts, economyStats.ts) proto importují přímo
// odsud, ne z useFinance.ts, které tyhle funkce jen re-exportuje pro
// zpětnou kompatibilitu volajících uvnitř appky samotné.
// ==========================================

export const dnesniMesic = (): string => new Date().toISOString().slice(0, 7) // YYYY-MM

export const minulyMesic = (): string => {
  const d = new Date()
  d.setDate(1) // jinak by ubrání měsíce u 31. mohlo přeskočit rovnou o dva
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 7)
}

export const patriDoObdobi = (transaction: Transaction, obdobi: ObdobiFiltr): boolean => {
  if (obdobi === 'vse') return true
  const mesic = transaction.date.slice(0, 7)
  return obdobi === 'tento-mesic' ? mesic === dnesniMesic() : mesic === minulyMesic()
}

const MESICE_ZKRATKY = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro']

/** Rozdělí transakce daného typu podle kategorie, seřazené od největší. */
export const rozdelPodleKategorie = (transactions: Transaction[]): KategorieVysek[] => {
  const soucty = new Map<FinanceCategory, number>()
  for (const t of transactions) soucty.set(t.category, (soucty.get(t.category) ?? 0) + t.amount)

  const celkem = [...soucty.values()].reduce((a, b) => a + b, 0)
  if (celkem === 0) return []

  return [...soucty.entries()]
    .map(([category, amount]) => ({ category, amount, percent: (amount / celkem) * 100 }))
    .sort((a, b) => b.amount - a.amount)
}

// Výchozí okno grafu trendu — dřív pevných 6 měsíců, teď 12 (profesionální
// roční přehled místo půlročního), parametrizované, ať jde otestovat
// i pro jiná okna bez psaní appky dokola.
export const VYCHOZI_MESICU_TRENDU = 12

/** Trend příjmů/výdajů za posledních `pocetMesicu` měsíců (včetně
 *  aktuálního) — čistá funkce, testovatelná bez store/komponenty. */
export const spocitejMesicniTrend = (
  transactions: Transaction[],
  pocetMesicu: number = VYCHOZI_MESICU_TRENDU,
  ted: Date = new Date()
): MesicniBod[] => {
  const body: MesicniBod[] = []
  const d = new Date(ted)
  d.setDate(1)

  for (let i = pocetMesicu - 1; i >= 0; i--) {
    const bod = new Date(d)
    bod.setMonth(bod.getMonth() - i)
    const klic = bod.toISOString().slice(0, 7)

    const tohoMesice = transactions.filter((t) => t.date.slice(0, 7) === klic)
    body.push({
      mesic: klic,
      label: MESICE_ZKRATKY[bod.getMonth()],
      prijmy: tohoMesice.filter((t) => t.type === 'prijem').reduce((s, t) => s + t.amount, 0),
      vydaje: tohoMesice.filter((t) => t.type === 'vydaj').reduce((s, t) => s + t.amount, 0),
    })
  }

  return body
}

// ==========================================
// Peněženky/účty — profesionální rozšíření: hotovost/bankovní účet/
// spoření sledované zvlášť, ne jeden společný zůstatek. `Transaction.
// walletId: null` znamená "nezařazeno" — appka nikdy nenutí starý
// záznam do žádné peněženky jen proto, že peněženky teď existují.
// ==========================================

export interface Wallet {
  id: string
  name: string
  icon: string | null
  createdAt: string
  updatedAt: number
  deletedAt: number | null
}

// Prefix pro klíč do sdíleného IndexedDB souborového úložiště
// (core/utils/fileStorage.ts) — stejný "vlastní prefix, ať se prostor
// id nikdy nepotká s jinou appkou" vzor jako Music Studiovo
// NAHRAVKA_ID_PREFIX. Skutečný obsah účtenky (foto/PDF) zůstává čistě
// lokální na zařízení, kde byla přiložena — cloudová synchronizace
// (financeSync.ts) přenáší jen id/mime metadata na transakci, ne
// samotný soubor, stejné omezení jako File Manager má dnes u záloh.
export const UCTENKA_ID_PREFIX = 'finance-uctenka-'

// ==========================================
// Rozpočty — skutečný, uživatelem nastavený měsíční limit na kategorii,
// na rozdíl od Economy Roomova staršího "Výdaje podle kategorie" panelu
// (ten ukazuje jen podíl, ne limit, protože appka žádný limit dřív
// neznala — viz EconomyRoomModule.tsx's vlastní komentář). Limit je
// vždycky měsíční a nepatří ke konkrétnímu měsíci — appka ho pořád
// porovnává proti AKTUÁLNÍMU měsíci, ne proti měsíci, kdy byl založen.
// ==========================================

export interface Budget {
  id: string
  category: ExpenseCategory
  limitKc: number
  createdAt: string
  updatedAt: number
  deletedAt: number | null
}

export interface BudgetStav {
  budget: Budget
  utraceno: number
  procenta: number
  jePrekrocen: boolean
}

/** Kolik je vyčerpáno z limitu za AKTUÁLNÍ měsíc — čistá funkce, appka
 *  ji volá s už vyfiltrovanými transakcemi tohoto měsíce (viz
 *  useFinance.ts's obdobiTransactions), ne aby si sama počítala datum. */
export const spocitejStavRozpoctu = (
  budgets: Budget[],
  transakceTohotoMesice: Transaction[]
): BudgetStav[] => {
  const soucty = new Map<string, number>()
  for (const t of transakceTohotoMesice) {
    if (t.type !== 'vydaj') continue
    soucty.set(t.category, (soucty.get(t.category) ?? 0) + t.amount)
  }

  return budgets.map((budget) => {
    const utraceno = soucty.get(budget.category) ?? 0
    const procenta = budget.limitKc > 0 ? Math.round((utraceno / budget.limitKc) * 100) : 0
    return { budget, utraceno, procenta, jePrekrocen: utraceno > budget.limitKc }
  })
}

// ==========================================
// Opakující se transakce — nájem/předplatné/výplata se přidají samy
// v nastavený den v měsíci, appka pak jen zaznamená, že to pro tenhle
// měsíc už udělala (posledniPridanoMesic), ať se stejná platba nepřidá
// dvakrát při dalším otevření appky ten samý den.
// ==========================================

export interface RecurringTransaction {
  id: string
  type: TransactionType
  amount: number
  category: FinanceCategory
  note: string
  /** 1–28 — appka schválně nepovoluje 29–31, ať se vyhne měsícům, které
   *  ten den vůbec nemají (únor). */
  dayOfMonth: number
  active: boolean
  /** 'YYYY-MM' měsíce, kdy byla naposledy automaticky přidána — null,
   *  pokud ještě nikdy. */
  lastAddedMonth: string | null
  createdAt: string
  updatedAt: number
  deletedAt: number | null
}

/** Má se dnes tahle opakující se platba přidat? Ano, právě jednou za
 *  měsíc, v den dayOfMonth nebo později (kdyby appka ten přesný den
 *  nebyla otevřená vůbec), a jen pokud ještě letos/tenhle měsíc
 *  nepřidala. Čistá funkce, testovatelná bez store/notifikace. */
export const melaByBytPridanaDnes = (r: RecurringTransaction, dnes: Date): boolean => {
  if (!r.active) return false
  const dnesniMesicStr = `${dnes.getFullYear()}-${String(dnes.getMonth() + 1).padStart(2, '0')}`
  if (r.lastAddedMonth === dnesniMesicStr) return false
  return dnes.getDate() >= r.dayOfMonth
}

// ==========================================
// Finanční/spořicí cíle — částka + nepovinný termín, progres se počítá
// ze SKUTEČNÉHO zůstatku (useFinance's zustatek), appka nevymýšlí
// samostatnou "spořicí přihrádku", protože žádná appka v projektu
// neumí peníze rozdělit na víc než jeden skutečný zůstatek. Víc cílů
// tak nezávisle měří stejnou otázku ("jak blízko jsem částce X"), ne
// že by si dělily jeden společný fond — přesně řečeno v komentáři níž.
// ==========================================

export interface FinanceGoal {
  id: string
  name: string
  targetAmount: number
  /** 'YYYY-MM-DD', nepovinné. */
  deadline: string | null
  createdAt: string
  updatedAt: number
  deletedAt: number | null
}

export interface GoalStav {
  goal: FinanceGoal
  procenta: number
  jeSplneny: boolean
}

/** Progres cíle vůči SKUTEČNÉMU zůstatku, ne vůči vymyšlené spořicí
 *  přihrádce — víc cílů nezávisle měří tu samou otázku "jak blízko jsem
 *  téhle částce", zámerně bez dělení jednoho fondu mezi ně (appka žádný
 *  koncept "přiřazených" peněz na cíl nemá). */
export const spocitejStavCile = (goal: FinanceGoal, zustatek: number): GoalStav => {
  const procenta = goal.targetAmount > 0 ? Math.min(100, Math.round((Math.max(0, zustatek) / goal.targetAmount) * 100)) : 0
  return { goal, procenta, jeSplneny: zustatek >= goal.targetAmount }
}

// ==========================================
// Export do CSV — pro účetnictví/daňové přiznání. Středník jako
// oddělovač (ne čárka) — český Excel/Sheets bere středník jako výchozí
// oddělovač CSV, čárka by se navíc mohla splést s desetinnou čárkou
// v částce, i když appka sama pracuje jen s celými korunami.
// ==========================================

const csvEscape = (hodnota: string): string => {
  // Uvozovky/středník/nový řádek v textu se musí obalit uvozovkami,
  // jinak by rozbily sloupcování — standardní CSV pravidlo.
  if (/[";\n]/.test(hodnota)) return `"${hodnota.replace(/"/g, '""')}"`
  return hodnota
}

export const sestavCsvTransakci = (transakce: Transaction[]): string => {
  const hlavicka = ['Datum', 'Typ', 'Kategorie', 'Částka (Kč)', 'Poznámka'].join(';')
  const radky = transakce.map((t) =>
    [
      t.date,
      t.type === 'prijem' ? 'Příjem' : 'Výdaj',
      csvEscape(t.category),
      String(t.amount),
      csvEscape(t.note),
    ].join(';')
  )
  // BOM na začátku, ať Excel český text (diakritiku) rozpozná jako
  // UTF-8 a nezobrazí ho jako změť — bez něj Excel často naslepo
  // předpokládá Windows-1250.
  return `﻿${[hlavicka, ...radky].join('\r\n')}`
}
