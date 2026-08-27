// ==========================================
// Rámečky avataru — kosmetický výběr barev prstenu kolem fotky/iniciály
// v SocialAvatar.tsx, ne nová komponenta ani nový systém: prsten už
// existuje (conic-gradient + maska, viz SocialModule.css), rámeček jen
// přepíše jeho dvě barvy (--sa-a/--sa-b) pevnou paletou místo té
// odvozené z id uživatele (avatarColor.ts).
//
// VIP-gating jde přes stejné oprávnění jako Vzhled aplikace
// (core/theme/) — cosmetics.premium. Pro VLASTNÍ avatar appka může
// zavolat useHasPermission přímo; pro CIZÍ avatar (SocialAvatar u
// přítele, veřejném profilu) live hook nepomůže, protože platí jen pro
// přihlášeného. resolveActiveFrameId proto bere roli vrácenou
// z precti_verejny_profil() — ta je už server-side ověřená a časově
// platná (viz její WHERE r.valid_until is null or r.valid_until > now()),
// takže "VIP rámeček visící na účtu, kterému VIP mezitím vypršelo" se
// stejně jako u vzhledu aplikace tiše nezobrazí, aniž by ho appka
// musela aktivně shazovat.
// ==========================================

export interface AvatarFrame {
  id: string
  nazev: string
  vip: boolean
  a: string
  b: string
}

export const AVATAR_FRAMES: AvatarFrame[] = [
  { id: 'polarni', nazev: 'Polární', vip: false, a: '#7dd3fc', b: '#e0f2fe' },
  { id: 'prirodni', nazev: 'Přírodní', vip: false, a: '#4ade80', b: '#facc15' },
  { id: 'zlaty', nazev: 'Zlatý', vip: true, a: '#fbbf24', b: '#f59e0b' },
  { id: 'plamenny', nazev: 'Plamenný', vip: true, a: '#f87171', b: '#fb923c' },
]

// Role, které core/role's registry svazuje s oprávněním cosmetics.premium
// (core/role/{vip,admin,moderator}/index.ts) — duplikace jen tohohle
// jednoho řetězcového seznamu je levnější než tahat celý core/role modul
// jen kvůli jedné kontrole podle cizí role.
const PREMIUM_ROLE_IDS = new Set(['vip', 'admin', 'moderator'])

/**
 * Vyhodnotí, jestli se rámeček doopravdy má zobrazit — stejné "ověř při
 * čtení, nikdy nevěř tomu, co leží uloženo" jako resolveActiveThemeId.
 * `role` je hodnota vrácená precti_verejny_profil() pro majitele
 * avataru, ne role toho, kdo se dívá.
 */
export const resolveActiveFrameId = (frameId: string | null, role: string): AvatarFrame | null => {
  if (!frameId) return null
  const frame = AVATAR_FRAMES.find((f) => f.id === frameId)
  if (!frame) return null
  if (frame.vip && !PREMIUM_ROLE_IDS.has(role)) return null
  return frame
}
