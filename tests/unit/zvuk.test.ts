import { describe, it, expect, beforeEach } from 'vitest'
import { useZvukStore, ziskejHlasitost } from '@/core/store/useZvukStore'
import { validateZvukData } from '@/core/utils/zvukValidation'

// ==========================================
// Zvuk — čtyři posuvníky hlasitosti (viz core/store/useZvukStore.ts,
// SettingsModule.tsx's Zvuk sekce). Stejný "reset přes plain merge, ne
// setState(x, true)" vzor jako gamification.test.ts — replace:true by
// smazal i setHlasitost, protože žije na stejném state objektu jako
// data.
// ==========================================

beforeEach(() => {
  useZvukStore.setState({ master: 100, buddy: 100, hra: 100, music: 100 })
})

describe('useZvukStore', () => {
  it('výchozí hlasitost je 100 % pro všechny čtyři', () => {
    const s = useZvukStore.getState()
    expect(s.master).toBe(100)
    expect(s.buddy).toBe(100)
    expect(s.hra).toBe(100)
    expect(s.music).toBe(100)
  })

  it('setHlasitost nastaví jen zadanou kategorii, ostatní nechá být', () => {
    useZvukStore.getState().setHlasitost('buddy', 40)
    const s = useZvukStore.getState()
    expect(s.buddy).toBe(40)
    expect(s.master).toBe(100)
    expect(s.hra).toBe(100)
    expect(s.music).toBe(100)
  })

  it('setHlasitost ořízne hodnotu mimo 0-100', () => {
    useZvukStore.getState().setHlasitost('hra', 150)
    expect(useZvukStore.getState().hra).toBe(100)

    useZvukStore.getState().setHlasitost('music', -20)
    expect(useZvukStore.getState().music).toBe(0)
  })

  it('setHlasitost zaokrouhlí desetinné číslo', () => {
    useZvukStore.getState().setHlasitost('master', 33.6)
    expect(useZvukStore.getState().master).toBe(34)
  })
})

describe('ziskejHlasitost', () => {
  it('při plné hlasitosti (100/100) vrátí 1', () => {
    expect(ziskejHlasitost('buddy')).toBe(1)
  })

  it('master násobí kategorii — poloviční master = poloviční výsledek', () => {
    useZvukStore.getState().setHlasitost('master', 50)
    expect(ziskejHlasitost('hra')).toBeCloseTo(0.5)
  })

  it('master na 0 ztiší i kategorii nastavenou na 100', () => {
    useZvukStore.getState().setHlasitost('master', 0)
    expect(ziskejHlasitost('music')).toBe(0)
  })

  it('kombinace obou — 50 % master × 50 % kategorie = 0.25', () => {
    useZvukStore.getState().setHlasitost('master', 50)
    useZvukStore.getState().setHlasitost('buddy', 50)
    expect(ziskejHlasitost('buddy')).toBeCloseTo(0.25)
  })
})

describe('validateZvukData', () => {
  it('platná data projdou beze změny', () => {
    const vysledek = validateZvukData({ master: 80, buddy: 60, hra: 40, music: 20 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data).toEqual({ master: 80, buddy: 60, hra: 40, music: 20 })
    }
  })

  it('chybějící pole spadne na výchozích 100', () => {
    const vysledek = validateZvukData({ master: 50 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data).toEqual({ master: 50, buddy: 100, hra: 100, music: 100 })
    }
  })

  it('mimo rozsah se ořízne na 0-100', () => {
    const vysledek = validateZvukData({ master: 500, buddy: -30, hra: 100, music: 100 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.master).toBe(100)
      expect(vysledek.data.buddy).toBe(0)
    }
  })

  it('nečíselná/poškozená hodnota spadne na 100, ne na chybu', () => {
    const vysledek = validateZvukData({ master: 'hodně', buddy: null, hra: 50, music: 100 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.master).toBe(100)
      expect(vysledek.data.buddy).toBe(100)
      expect(vysledek.data.hra).toBe(50)
    }
  })

  it('úplně cizí tvar dat (např. null) selže', () => {
    const vysledek = validateZvukData(null)
    expect(vysledek.success).toBe(false)
  })
})
