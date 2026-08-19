import { useCallback, useMemo, useState } from 'react'
import { useWalletStore } from '@/core/store/useWalletStore'
import {
  useActiveRole,
  useRoleStore,
  daysRemaining,
  formatValidUntil,
} from '@/core/role'
import { SHOP_CATEGORIES, packTotalCredits } from './catalog'
import type { PurchaseResult, PurchaseTarget, ShopCategory } from './types'

// ==========================================
// Logika obchodu.
//
// Platební brána zatím připojená není, a to je vědomé: nákup za peníze
// nesmí být jen zápis do localStorage. Všechny tři druhy zboží proto
// vedou přes jedinou funkci `purchase`, která dneska vrátí "zatím to
// nejde". Až brána přibude, mění se jedno místo — komponenty se nedotkne.
//
// Kontroly, které nezávisí na platbě (zůstatek, VIP, už vlastníš), tu
// jsou naostro už teď, aby se na nich dalo stavět a aby UI ukazovalo
// pravdivé stavy místo natvrdo napsaných.
// ==========================================

const NEDOSTUPNE =
  'Platby se teprve připojují. Až budou hotové, koupíš tohle přímo tady.'

export const useShop = () => {
  const balance = useWalletStore((state) => state.balance)
  const ownedItems = useWalletStore((state) => state.ownedItems)

  const role = useActiveRole()
  const assignment = useRoleStore((state) => state.assignment)

  const [activeCategory, setActiveCategory] = useState<ShopCategory>(SHOP_CATEGORIES[0].id)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 3200)
  }, [])

  const isVip = role.id === 'vip'
  const vipDaysLeft = useMemo(() => daysRemaining(assignment), [assignment])
  const vipValidUntil = useMemo(() => formatValidUntil(assignment.validUntil), [assignment])

  const ownsItem = useCallback((itemId: string) => ownedItems.includes(itemId), [ownedItems])

  /**
   * Jediná cesta k nákupu. Vrací výsledek, komponenta z něj udělá hlášku —
   * díky tomu jde chování ověřit bez vykreslování.
   */
  const purchase = useCallback(
    (target: PurchaseTarget): PurchaseResult => {
      switch (target.kind) {
        // Kredity i VIP stojí skutečné peníze, takže o nich nemůže
        // rozhodnout prohlížeč. Až sem povede platební brána.
        case 'credits':
        case 'vip':
          return { status: 'unavailable', message: NEDOSTUPNE }

        case 'item': {
          const { item } = target

          if (item.comingSoon) {
            return { status: 'coming-soon', message: 'Tohle se teprve chystá.' }
          }

          if (item.permanent && ownsItem(item.id)) {
            return { status: 'already-owned', message: `${item.title} už máš.` }
          }

          if (item.vipOnly && !isVip) {
            return {
              status: 'requires-vip',
              message: `${item.title} je jen pro VIP.`,
            }
          }

          if (balance < item.price) {
            return {
              status: 'insufficient',
              message: `Chybí ti ${item.price - balance} kreditů.`,
              missing: item.price - balance,
            }
          }

          // Sem se dneska nikdo nedostane — kredity zatím není jak
          // získat. Až budou, dokončí nákup tahle větev a stačí do ní
          // dopsat předání zboží (motiv, avatar, násobič).
          return { status: 'unavailable', message: NEDOSTUPNE }
        }
      }
    },
    [balance, isVip, ownsItem]
  )

  /** Nákup i s vypsáním hlášky — to, co volají komponenty. */
  const tryPurchase = useCallback(
    (target: PurchaseTarget) => {
      const result = purchase(target)
      showToast(result.message)
      return result
    },
    [purchase, showToast]
  )

  return {
    balance,
    ownedItems,
    ownsItem,
    role,
    isVip,
    vipDaysLeft,
    vipValidUntil,
    activeCategory,
    setActiveCategory,
    purchase,
    tryPurchase,
    toast,
    showToast,
    packTotalCredits,
  }
}
