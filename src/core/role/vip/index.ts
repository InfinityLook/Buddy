import type { RoleDefinition } from '../types'

// ==========================================
// Placená role. Kupuje se v obchodě na období (měsíc, půl roku, rok),
// takže na rozdíl od ostatních má přiřazení vyplněné datum konce
// platnosti a po jeho uplynutí uživatel tiše spadne zpátky na 'user'.
//
// Vyhodnocení platnosti dělá core/role/roleUtils.ts při každém čtení,
// ne při zápisu — viz komentář u RoleAssignment.
// ==========================================

export const VIP_ROLE: RoleDefinition = {
  id: 'vip',
  title: 'VIP',
  description: 'Prémiové motivy, avataři a zrychlení postupu.',
  icon: '👑',
  tone: 'vip',
  permissions: [
    'shop.view',
    'shop.purchase',
    'cosmetics.premium',
    'progress.boost',
    'features.premium',
  ],
  purchasable: true,
  rank: 10,
}

/** Doba platnosti jednotlivých variant předplatného ve dnech. */
export const VIP_DURATIONS = {
  month: 30,
  halfYear: 180,
  year: 365,
} as const

export type VipDuration = keyof typeof VIP_DURATIONS

export default VIP_ROLE
