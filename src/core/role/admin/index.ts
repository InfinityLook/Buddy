import type { RoleDefinition } from '../types'

// ==========================================
// Nejvyšší role. Nekupuje se a nikdy nevyprší.
//
// Stejně jako moderátor je založená dopředu a zatím se na ni nikde
// nenavazuje. Až vznikne správa uživatelů nebo úprava katalogu obchodu,
// budou stát na oprávněních 'admin.users' a 'admin.catalog'.
// ==========================================

export const ADMIN_ROLE: RoleDefinition = {
  id: 'admin',
  title: 'Správce',
  description: 'Spravuje uživatele i katalog obchodu.',
  icon: '⚙️',
  tone: 'admin',
  permissions: [
    'shop.view',
    'shop.purchase',
    'cosmetics.premium',
    'progress.boost',
    'features.premium',
    'moderation.content',
    'admin.users',
    'admin.catalog',
    'admin.panel',
    'social.secretChat',
  ],
  purchasable: false,
  rank: 100,
}

export default ADMIN_ROLE
