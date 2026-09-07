import { beforeEach, describe, expect, it } from 'vitest'
import { zpracujVysledekZapasu } from '@/fighting/xpZaZapas'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useWalletStore } from '@/core/store/useWalletStore'
import { useSoubojStatistikyStore } from '@/fighting/useSoubojStatistikyStore'

// ==========================================
// Dvanácté kolo vylepšení — sdílené vyhodnocení výsledku zápasu (dřív
// jen uvnitř Ovladac.tsx's konecZapasu handleru), teď volané taky z
// ProtiPocitaci.tsx (Rychlý start/Žebříček) a OnlineHost.tsx/
// OnlineGuest.tsx (souboj na dálku). Appka resetuje dotčené store před
// každým testem PLNÝM MERGE (ne setState(x, true) — replace by smazal
// i akční metody, stejná disciplína jako gamification.test.ts).
// ==========================================

beforeEach(() => {
  useGamificationStore.setState({ xp: 0, level: 1, counters: {} })
  useWalletStore.setState({ balance: 0 })
  useSoubojStatistikyStore.setState({ vysledky: {}, historie: [], zapasyProtiPostavam: {}, nejlepsiVlnaZebricku: 0 })
})

describe('zpracujVysledekZapasu', () => {
  it('výhra (mujSlot === vitezSlot) připíše XP přes recordAction, kredity a zaznamená výhru', () => {
    const text = zpracujVysledekZapasu(1, 1, 'onyx', 'pyra')
    expect(useGamificationStore.getState().xp).toBeGreaterThan(0)
    expect(useGamificationStore.getState().counters.souboj).toBe(1)
    expect(useWalletStore.getState().balance).toBeGreaterThan(0)
    expect(useSoubojStatistikyStore.getState().vysledky.onyx?.vyhry).toBe(1)
    expect(useSoubojStatistikyStore.getState().zapasyProtiPostavam.onyx?.pyra?.vyhry).toBe(1)
    expect(text).toContain('Vyhrál')
  })

  it('prohra (vitezSlot je ta druhá strana) dá jen účastnickou XP, žádné kredity, žádný counters.souboj bump', () => {
    const text = zpracujVysledekZapasu(2, 1, 'onyx', 'pyra')
    expect(useGamificationStore.getState().xp).toBeGreaterThan(0)
    expect(useGamificationStore.getState().counters.souboj).toBeUndefined()
    expect(useWalletStore.getState().balance).toBe(0)
    expect(useSoubojStatistikyStore.getState().vysledky.pyra?.prohry).toBe(1)
    expect(text).toContain('Prohrál')
  })

  it('remíza (vitezSlot === null) dá účastnickou XP oběma stranám stejně, žádné kredity', () => {
    const text = zpracujVysledekZapasu(1, null, 'onyx', 'pyra')
    expect(useGamificationStore.getState().xp).toBeGreaterThan(0)
    expect(useWalletStore.getState().balance).toBe(0)
    expect(useSoubojStatistikyStore.getState().vysledky.onyx?.remizy).toBe(1)
    expect(text).toContain('Remíza')
  })

  it('mujSlot 2 vs. mujSlot 1 čtou svoji postavu ze správné strany postava0/postava1', () => {
    zpracujVysledekZapasu(2, 2, 'onyx', 'pyra') // slot 2 vyhrál, moje postava je pyra
    expect(useSoubojStatistikyStore.getState().vysledky.pyra?.vyhry).toBe(1)
    expect(useSoubojStatistikyStore.getState().vysledky.onyx).toBeUndefined()
  })
})
