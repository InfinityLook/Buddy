import { useEffect } from 'react'
import { useHasPermission } from '@/core/role'
import { useThemeStore } from './useThemeStore'
import { resolveActiveThemeId, THEMES } from './themes'
import type { Theme } from './themes'

// ==========================================
// Skutečné přepnutí barev — inline na document.documentElement.style,
// ne přes CSS třídu/[data-theme] blok v global.css. Paleta žije jen
// v themes.ts (jeden zdroj pravdy, žádný druhý CSS soubor, se kterým
// by mohla vypadnout ze shody), a inline styl navíc vyhraje nad
// natvrdo napsanými hodnotami v :root bez !important.
// ==========================================

// Jen barevné/rozměrové hodnoty — id/nazev/ikona/popis/vip do CSS
// proměnných nepatří, ať je klic vždycky doopravdy string.
type BarevnyKlic = Exclude<keyof Theme, 'id' | 'nazev' | 'ikona' | 'popis' | 'vip'>

const PROMENNE: { klic: BarevnyKlic; css: string }[] = [
  { klic: 'bgBase', css: '--bg-base' },
  { klic: 'bgPanel', css: '--bg-panel' },
  { klic: 'bgPanelRaised', css: '--bg-panel-raised' },
  { klic: 'bgGlass', css: '--bg-glass' },
  { klic: 'borderSubtle', css: '--border-subtle' },
  { klic: 'borderStrong', css: '--border-strong' },
  { klic: 'accentCyan', css: '--accent-cyan' },
  { klic: 'accentViolet', css: '--accent-violet' },
  { klic: 'accentMagenta', css: '--accent-magenta' },
  { klic: 'accentGreen', css: '--accent-green' },
  { klic: 'accentOrange', css: '--accent-orange' },
  { klic: 'accentRed', css: '--accent-red' },
  { klic: 'textPrimary', css: '--text-primary' },
  { klic: 'textSecondary', css: '--text-secondary' },
  { klic: 'textMuted', css: '--text-muted' },
  { klic: 'textOnAccent', css: '--text-on-accent' },
  { klic: 'glowCyan', css: '--shadow-glow-cyan' },
  { klic: 'glowViolet', css: '--shadow-glow-violet' },
]

export const aplikujVzhled = (tema: Theme): void => {
  const root = document.documentElement.style
  for (const { klic, css } of PROMENNE) root.setProperty(css, tema[klic])
}

/**
 * Drží aplikovaný vzhled ve shodě s uloženou volbou i s aktuálním
 * oprávněním — volá se jednou ze startu (App.tsx), ne z obrazovky
 * s výběrem vzhledu, protože VIP může vypršet, i když uživatel zrovna
 * kouká někam jinam do appky.
 */
export const useAppliedTheme = (): void => {
  const themeId = useThemeStore((s) => s.themeId)
  const smiPremium = useHasPermission('cosmetics.premium')

  useEffect(() => {
    aplikujVzhled(THEMES[resolveActiveThemeId(themeId, smiPremium)])
  }, [themeId, smiPremium])
}
