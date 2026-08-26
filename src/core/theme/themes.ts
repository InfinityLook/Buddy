// ==========================================
// Vzhledy aplikace — 5 barevných palet, 3 volně dostupné a 2 jen pro
// VIP (cosmetics.premium, stejné oprávnění jako prémiová kosmetika
// v obchodě). Appka je celá schválně tmavá (color-scheme: dark
// natvrdo v global.css) — žádný z pěti vzhledů to nemění, jen barví
// jinak, ne přechází do světlého režimu. Ta volba by znamenala
// projít světelnost/kontrast v každé jedné stránce zvlášť, což
// nikdo nežádal — tohle je re-skin, ne druhý design systém.
//
// Klíč k tomu, jak se vzhled aplikuje: jména proměnných v Theme
// odpovídají 1:1 vlastním jménům custom properties v global.css
// (--accent-cyan, --bg-panel, ...). Přepnutí vzhledu jen přepíše
// JEJICH HODNOTY přes document.documentElement.style — žádná stránka
// ani komponenta se nemusí měnit, protože nikde v appce se barva
// nepíše natvrdo, vždycky přes var(--...). Jméno proměnné jako
// "accentCyan" u vzhledu Západ slunce proto reálně drží oranžovou,
// ne azurovou — jde jen o to, která ROLE (primární akcent) barvu
// dostane, ne o doslovný název.
// ==========================================

export type ThemeId = 'nebula' | 'zapad' | 'les' | 'zlata' | 'polarni'

export interface Theme {
  id: ThemeId
  nazev: string
  ikona: string
  popis: string
  /** Jen pro VIP (cosmetics.premium) — viz core/role. */
  vip: boolean

  bgBase: string
  bgPanel: string
  bgPanelRaised: string
  bgGlass: string
  borderSubtle: string
  borderStrong: string

  accentCyan: string
  accentViolet: string
  accentMagenta: string
  accentGreen: string
  accentOrange: string
  accentRed: string

  textPrimary: string
  textSecondary: string
  textMuted: string
  textOnAccent: string

  glowCyan: string
  glowViolet: string
}

export const DEFAULT_THEME_ID: ThemeId = 'nebula'

export const THEMES: Record<ThemeId, Theme> = {
  // Výchozí — přesně palety z global.css, jak appka vypadala od
  // začátku. Vybrat "Nebula" musí vrátit appku přesně do stavu před
  // zavedením vzhledů, ani o odstín jinak.
  nebula: {
    id: 'nebula',
    nazev: 'Nebula',
    ikona: '🌌',
    popis: 'Výchozí — tmavě modrá s fialovou.',
    vip: false,
    bgBase: '#0a0e1a',
    bgPanel: '#10182b',
    bgPanelRaised: '#151f38',
    bgGlass: 'rgba(18, 20, 38, 0.7)',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.14)',
    accentCyan: '#35c4f0',
    accentViolet: '#8a5cf6',
    accentMagenta: '#ec4899',
    accentGreen: '#10b981',
    accentOrange: '#f59e0b',
    accentRed: '#ef4444',
    textPrimary: '#f2f5fb',
    textSecondary: '#9aa5c0',
    textMuted: '#62698a',
    textOnAccent: '#06121f',
    glowCyan: 'rgba(53, 196, 240, 0.35)',
    glowViolet: 'rgba(138, 92, 246, 0.35)',
  },

  zapad: {
    id: 'zapad',
    nazev: 'Západ slunce',
    ikona: '🌇',
    popis: 'Teplá oranžová a jantarová.',
    vip: false,
    bgBase: '#1a0f0a',
    bgPanel: '#241610',
    bgPanelRaised: '#2e1c14',
    bgGlass: 'rgba(36, 22, 16, 0.72)',
    borderSubtle: 'rgba(255, 214, 170, 0.08)',
    borderStrong: 'rgba(255, 214, 170, 0.16)',
    accentCyan: '#f0a935',
    accentViolet: '#f0673a',
    accentMagenta: '#ec4899',
    accentGreen: '#84cc16',
    accentOrange: '#f59e0b',
    accentRed: '#ef4444',
    textPrimary: '#fbf1e6',
    textSecondary: '#c9a98c',
    textMuted: '#8a6a52',
    textOnAccent: '#1a0f0a',
    glowCyan: 'rgba(240, 169, 53, 0.35)',
    glowViolet: 'rgba(240, 103, 58, 0.35)',
  },

  les: {
    id: 'les',
    nazev: 'Lesní',
    ikona: '🌲',
    popis: 'Zelená a tyrkysová, klidný tón.',
    vip: false,
    bgBase: '#071410',
    bgPanel: '#0c1f18',
    bgPanelRaised: '#112a20',
    bgGlass: 'rgba(12, 31, 24, 0.72)',
    borderSubtle: 'rgba(180, 255, 220, 0.08)',
    borderStrong: 'rgba(180, 255, 220, 0.16)',
    accentCyan: '#2dd4bf',
    accentViolet: '#65a30d',
    accentMagenta: '#ec4899',
    accentGreen: '#22c55e',
    accentOrange: '#eab308',
    accentRed: '#ef4444',
    textPrimary: '#eafaf0',
    textSecondary: '#8fbfa6',
    textMuted: '#567a68',
    textOnAccent: '#071410',
    glowCyan: 'rgba(45, 212, 191, 0.35)',
    glowViolet: 'rgba(101, 163, 13, 0.35)',
  },

  zlata: {
    id: 'zlata',
    nazev: 'Královská zlatá',
    ikona: '👑',
    popis: 'Zlato a purpur — jen pro VIP.',
    vip: true,
    bgBase: '#120a1a',
    bgPanel: '#1c1029',
    bgPanelRaised: '#251536',
    bgGlass: 'rgba(28, 16, 41, 0.75)',
    borderSubtle: 'rgba(255, 215, 130, 0.1)',
    borderStrong: 'rgba(255, 215, 130, 0.22)',
    accentCyan: '#f5c451',
    accentViolet: '#a855f7',
    accentMagenta: '#ec4899',
    accentGreen: '#10b981',
    accentOrange: '#f59e0b',
    accentRed: '#ef4444',
    textPrimary: '#fbf3e0',
    textSecondary: '#c9b3d9',
    textMuted: '#7d6a95',
    textOnAccent: '#120a1a',
    glowCyan: 'rgba(245, 196, 81, 0.45)',
    glowViolet: 'rgba(168, 85, 247, 0.4)',
  },

  polarni: {
    id: 'polarni',
    nazev: 'Polární záře',
    ikona: '🌠',
    popis: 'Sytě zářivé barvy — jen pro VIP.',
    vip: true,
    bgBase: '#050814',
    bgPanel: '#0a1024',
    bgPanelRaised: '#101a35',
    bgGlass: 'rgba(10, 16, 36, 0.72)',
    borderSubtle: 'rgba(150, 255, 230, 0.1)',
    borderStrong: 'rgba(150, 255, 230, 0.2)',
    accentCyan: '#22e5c9',
    accentViolet: '#b026ff',
    accentMagenta: '#ff2e9e',
    accentGreen: '#39ff9e',
    accentOrange: '#ffb020',
    accentRed: '#ff3d5e',
    textPrimary: '#eefcff',
    textSecondary: '#9fc9d9',
    textMuted: '#5c7c8c',
    textOnAccent: '#050814',
    glowCyan: 'rgba(34, 229, 201, 0.5)',
    glowViolet: 'rgba(176, 38, 255, 0.45)',
  },
}

export const VSECHNY_VZHLEDY: Theme[] = Object.values(THEMES)

export const isKnownThemeId = (value: unknown): value is ThemeId =>
  typeof value === 'string' && value in THEMES

/**
 * Vzhled, který se doopravdy použije — VIP vzhled bez oprávnění tiše
 * spadne na výchozí, stejná "vyhodnoť až při čtení" logika jako
 * resolveActiveRoleId u platnosti role. Uložený themeId zůstává, co
 * je (třeba VIP mezitím zase přibude), jen se nepoužije, dokud pro
 * něj oprávnění chybí.
 */
export const resolveActiveThemeId = (themeId: ThemeId, maPremium: boolean): ThemeId => {
  const tema = THEMES[themeId]
  if (!tema) return DEFAULT_THEME_ID
  return tema.vip && !maPremium ? DEFAULT_THEME_ID : themeId
}
