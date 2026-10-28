export const BUDDY_THEME_IDS = ['zlaty-soumrak', 'neonova-noc', 'polarni-zare', 'lesni-klid', 'cisty-den'] as const
export type Buddy3DThemeId = typeof BUDDY_THEME_IDS[number]
export type BuddyVoiceState = 'necinny' | 'posloucha' | 'premysli' | 'mluvi' | 'chyba'
export type BuddyAnimation = 'Spawn' | 'Idle' | 'Walk' | 'Jump' | 'Wave' | 'Listen' | 'Think' | 'Talk' | 'Happy' | 'Pet' | 'Sleep' | 'Confused' | 'Despawn'
export interface BuddyVoicePort {
  stav: BuddyVoiceState
  zpravy: Array<{ id: string; odesilatel: 'uzivatel' | 'buddy'; text: string }>
  chybaText: string | null
  podporujeRozpoznavani: boolean
  zacniMluvit: () => void
  posliText: (text: string) => void
  zastavit: () => void
}
export const BUDDY_THEMES: Record<Buddy3DThemeId, { name: string; accent: string; panel: string; text: string }> = {
  'zlaty-soumrak': { name: 'Zlatý soumrak', accent: '#e8bd70', panel: '#111e32', text: '#f5f3ed' },
  'neonova-noc': { name: 'Neonová noc', accent: '#64e8f7', panel: '#0e1b30', text: '#f0f6ff' },
  'polarni-zare': { name: 'Polární záře', accent: '#b4f6df', panel: '#14273e', text: '#f2f8fd' },
  'lesni-klid': { name: 'Lesní klid', accent: '#b5e0a3', panel: '#152c24', text: '#f1f7ed' },
  'cisty-den': { name: 'Čistý den', accent: '#436de2', panel: '#f8fbff', text: '#22304a' },
}
export function resolveBuddyTheme(value?: string | null): Buddy3DThemeId {
  return BUDDY_THEME_IDS.includes(value as Buddy3DThemeId) ? value as Buddy3DThemeId : 'zlaty-soumrak'
}
