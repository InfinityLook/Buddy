import * as v from 'valibot'

// ==========================================
// Ověření peněženky načtené z úložiště. Cokoli, co do uloženého tvaru
// přibude, musí být volitelné — jinak starší uložený stav neprojde
// a uživatel přijde o zůstatek i o koupené věci.
// ==========================================

export const WalletSchema = v.object({
  // Záporný zůstatek nemá význam a znamenal by poškozený stav
  balance: v.optional(v.number([v.minValue(0)]), 0),
  ownedItems: v.optional(v.array(v.string()), []),
})

export const validateWalletData = (data: unknown) => {
  const result = v.safeParse(WalletSchema, data)
  if (result.success) {
    return { success: true as const, data: result.output }
  }
  console.warn('Data peněženky neodpovídají schématu (byla poškozena nebo změněna):', result.issues)
  return { success: false as const, issues: result.issues }
}
