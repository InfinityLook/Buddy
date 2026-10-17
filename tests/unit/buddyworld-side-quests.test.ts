import { describe, expect, it } from 'vitest'
import { VEDLEJSI_UKOLY, lzePrevzitVedlejsiOdmenu, overSplneneVedlejsiUkoly } from '@/buddyworld/sideQuests'
import { VYCHOZI_OSADA } from '@/buddyworld/villageProgress'

// Přesunuto z src/buddyworld/sideQuests.test.ts — mimo
// tests/unit/**/*.test.ts (viz vitest.config.ts) by appka tenhle
// soubor nikdy nespustila, jen by tiše seděl nevyužitý.
describe('vedlejší úkoly', () => {
  it('mají jedinečná ID', () => expect(new Set(VEDLEJSI_UKOLY.map(q => q.id)).size).toBe(VEDLEJSI_UKOLY.length))
  it('nepovolí odměnu před splněním', () => expect(lzePrevzitVedlejsiOdmenu('pomoc_stavitelce', [], VYCHOZI_OSADA)).toBe(false))
  it('povolí odměnu po splnění', () => expect(lzePrevzitVedlejsiOdmenu('pomoc_stavitelce', [], { ...VYCHOZI_OSADA, drevo: 10 })).toBe(true))
  it('nepovolí opakované vyzvednutí', () => expect(lzePrevzitVedlejsiOdmenu('pomoc_stavitelce', ['pomoc_stavitelce'], { ...VYCHOZI_OSADA, drevo: 10 })).toBe(false))
  it('filtruje neplatná a duplicitní uložená ID', () => expect(overSplneneVedlejsiUkoly(['pomoc_stavitelce', 'neplatne', 'pomoc_stavitelce'])).toEqual(['pomoc_stavitelce']))
})
