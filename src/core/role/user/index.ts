import type { RoleDefinition } from '../types'

// ==========================================
// Výchozí role. Má ji každý, kdo si nic nekoupil, a je to zároveň stav,
// do kterého se uživatel vrací, když mu vyprší předplatné.
//
// Základ aplikace musí zůstat použitelný i s ní — všechny miniaplikace,
// XP, odznaky i zálohy jsou dostupné bez ohledu na roli. Placené je jen
// to, co je navíc.
// ==========================================

export const USER_ROLE: RoleDefinition = {
  id: 'user',
  title: 'Student',
  description: 'Základní účet se všemi miniaplikacemi, XP i odznaky.',
  icon: '🎒',
  tone: 'user',
  permissions: ['shop.view', 'shop.purchase'],
  purchasable: false,
  rank: 0,
}

export default USER_ROLE
