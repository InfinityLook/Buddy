import type { RoleDefinition } from '../types'

// ==========================================
// Role pro správu obsahu. Nekupuje se, přiděluje ji správa aplikace.
//
// Zatím na ni nic nenavazuje — aplikace nemá sdílený obsah, který by
// šlo moderovat. Je založená dopředu, aby přidání moderace později
// znamenalo dopsat oprávnění sem, ne vymýšlet celý systém rolí znovu.
// ==========================================

export const MODERATOR_ROLE: RoleDefinition = {
  id: 'moderator',
  title: 'Moderátor',
  description: 'Dohlíží na sdílený obsah a hlášení od uživatelů.',
  icon: '🛡️',
  tone: 'moderator',
  permissions: [
    'shop.view',
    'shop.purchase',
    'cosmetics.premium',
    'progress.boost',
    'features.premium',
    'moderation.content',
    'social.secretChat',
  ],
  purchasable: false,
  rank: 50,
}

export default MODERATOR_ROLE
