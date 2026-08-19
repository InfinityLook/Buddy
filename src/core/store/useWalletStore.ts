import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateWalletData } from '@/core/utils/walletValidation'

// ==========================================
// Kredity a koupené položky.
//
// Kredity se kupují za peníze a utrácejí se i mimo obchod (motivy,
// avataři, zrychlení postupu), takže podle konvence projektu patří
// sem do core/store, ne do složky obchodu.
//
// POZOR: stejné varování jako u rolí. Zůstatek leží v localStorage přes
// secureStorage, což je obfuskace, ne šifrování — uživatel si ho umí
// přepsat. Dokud o kreditech nerozhoduje server, je tenhle stav jen
// podklad pro vykreslení a nesmí být jediným důkazem, že uživatel
// zaplatil. Proto se taky ze zálohy nikdy neobnovuje (viz BACKUP_STORES).
// ==========================================

interface WalletState {
  balance: number
  /** Id položek, které uživatel vlastní natrvalo (motivy, avataři). */
  ownedItems: string[]

  /** Připíše kredity. Volá se po potvrzeném nákupu. */
  credit: (amount: number) => void
  /**
   * Odečte kredity. Vrací false, když na to zůstatek nestačí — volající
   * pak nesmí nic předat. Kontrola je schválně tady, aby ji nešlo
   * omylem obejít na jednom ze zavolání.
   */
  spend: (amount: number) => boolean
  /** Zapíše položku mezi vlastněné. Opakované volání nic nezkazí. */
  grantItem: (itemId: string) => void
  ownsItem: (itemId: string) => boolean
  /** Vrátí peněženku do výchozího stavu. */
  reset: () => void
}

const VYCHOZI = { balance: 0, ownedItems: [] as string[] }

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      ...VYCHOZI,

      credit: (amount) => {
        if (!Number.isFinite(amount) || amount <= 0) return
        set((state) => ({ balance: state.balance + Math.floor(amount) }))
      },

      spend: (amount) => {
        const castka = Math.floor(amount)
        if (!Number.isFinite(castka) || castka <= 0) return false
        if (get().balance < castka) return false

        set((state) => ({ balance: state.balance - castka }))
        return true
      },

      grantItem: (itemId) =>
        set((state) =>
          state.ownedItems.includes(itemId)
            ? state
            : { ownedItems: [...state.ownedItems, itemId] }
        ),

      ownsItem: (itemId) => get().ownedItems.includes(itemId),

      reset: () => set(VYCHOZI),
    }),
    {
      name: 'schoolbuddy-wallet-storage',
      version: 1,
      storage: createJSONStorage(() => secureStorage),

      // Poškozený stav znamená prázdnou peněženku, ne převzetí toho, co
      // v úložišti leží. Bezpečný směr je nedat nic, ne dát všechno.
      merge: (persisted, current) => {
        const validation = validateWalletData(persisted)
        if (!validation.success) return current

        return {
          ...current,
          balance: validation.data.balance,
          ownedItems: validation.data.ownedItems,
        }
      },

      migrate: (persistedState, _version) => {
        const validation = validateWalletData(persistedState)
        return validation.success ? persistedState : VYCHOZI
      },
    }
  )
)
