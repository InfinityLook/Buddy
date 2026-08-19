import type { VipDuration } from '@/core/role'

// ==========================================
// Tvar katalogu obchodu.
//
// Katalog je zatím zapsaný v kódu (catalog.ts). Až o cenách a nabídce
// bude rozhodovat server, zůstanou tyhle typy stejné a vymění se jen
// zdroj dat — proto tu není nic, co by se dalo spočítat až v komponentě.
// ==========================================

/** Kategorie, do kterých se v obchodě řadí zboží za kredity. */
export type ShopCategory = 'vzhled' | 'avatar' | 'postup' | 'funkce'

export interface ShopCategoryMeta {
  id: ShopCategory
  title: string
  description: string
  icon: string
}

/** Balíček kreditů kupovaný za skutečné peníze. */
export interface CreditPack {
  id: string
  title: string
  /** Kolik kreditů uživatel dostane bez bonusu */
  credits: number
  /** Kredity navíc u větších balíčků. 0 = žádné. */
  bonusCredits: number
  /** Cena v haléřích, aby se nepočítalo v desetinných číslech */
  priceHaler: number
  icon: string
  /** Zvýrazněná nabídka — v mřížce jen jedna */
  highlight?: boolean
  /** Krátký popisek na štítku ("nejoblíbenější") */
  tag?: string
}

/** Varianta předplatného VIP. */
export interface VipPlan {
  id: string
  duration: VipDuration
  title: string
  /** Doba platnosti ve dnech — musí odpovídat VIP_DURATIONS */
  days: number
  priceHaler: number
  /** Cena za měsíc pro srovnání variant, v haléřích */
  monthlyHaler: number
  /** O kolik procent je varianta levnější než měsíční. 0 = žádná sleva. */
  savingPercent: number
  highlight?: boolean
  tag?: string
}

/** Zboží kupované za kredity. */
export interface ShopItem {
  id: string
  category: ShopCategory
  title: string
  description: string
  icon: string
  /** Cena v kreditech */
  price: number
  /**
   * Vlastní se natrvalo (motiv, avatar), nebo se spotřebuje (násobič XP)?
   * Trvalé se po koupi označí jako vlastněné, spotřební jde koupit znovu.
   */
  permanent: boolean
  /** Vyžaduje aktivní VIP, nejen zaplacené kredity */
  vipOnly?: boolean
  /** Zboží, které se teprve chystá — vidět je, ale koupit nejde */
  comingSoon?: boolean
}

/**
 * Co se pokouší uživatel koupit. Jediný tvar pro všechny tři druhy zboží,
 * aby přes něj šla vést jedna společná cesta k platbě.
 */
export type PurchaseTarget =
  | { kind: 'credits'; pack: CreditPack }
  | { kind: 'vip'; plan: VipPlan }
  | { kind: 'item'; item: ShopItem }

/** Jak dopadl pokus o nákup. */
export type PurchaseResult =
  // Platební brána zatím není připojená
  | { status: 'unavailable'; message: string }
  // Na nákup za kredity zůstatek nestačí
  | { status: 'insufficient'; message: string; missing: number }
  // Zboží vyžaduje VIP, které uživatel nemá
  | { status: 'requires-vip'; message: string }
  // Trvalé zboží už uživatel vlastní
  | { status: 'already-owned'; message: string }
  | { status: 'coming-soon'; message: string }
  | { status: 'done'; message: string }
