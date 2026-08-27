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
  // Delší, volitelný text vedle motta (jedna věta vs. odstavec) —
  // stejné pravidlo synchronizace jako motto, viz merge.ts.
  bio: string
  // Id z core/theme/avatarFrames.ts's AVATAR_FRAMES, nebo null (výchozí
  // prsten podle barvy id). VIP rámeček se ověřuje znovu při každém
  // zobrazení cizího profilu (viz resolveActiveFrameId), ne tady.
  frameId: string | null
  // Nejvýš 3 id odznaků z DEFAULT_BADGES, vybraná k vystavení na
  // veřejném profilu — precti_verejny_profil je navíc filtruje proti
  // user_badges, takže i kdyby sem někdo propašoval neodemčené id,
  // server ho stejně nikdy nevrátí.
  pinnedBadges: string[]
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
