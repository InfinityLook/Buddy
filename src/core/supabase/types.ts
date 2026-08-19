// Tvar dat, který putuje mezi aplikací a Supabase. Schválně obsahuje jen
// gamifikaci a tu část profilu, která dává smysl i mimo zařízení —
// e-mail, přepínače zabezpečení ani přečtená upozornění se nesynchronizují,
// protože jsou buď nepoužité, nebo čistě lokální.
//
// Avatar tu taky není: je to data URI, u vlastní fotky klidně stovky
// kilobajtů. Do sloupce v Postgresu to nepatří — až bude potřeba, je na to
// Supabase Storage.
export interface CloudSnapshot {
  displayName: string
  motto: string
  xp: number
  level: number
  streakDays: number
  lastActiveDate: string | null
  // badgeId → čas odemčení v ISO
  badges: Record<string, string>
  // druh činnosti → počet
  counters: Record<string, number>
}

export type SyncStatus = 'off' | 'connecting' | 'synced' | 'error' | 'offline'
