import { describe, expect, it } from 'vitest'
import { validateSoubojStatistikyData } from '@/core/utils/soubojStatistikyValidation'

// Jedenácté kolo vylepšení — "rival" statistiky (zapasyProtiPostavam),
// stejná item-by-item disciplína jako `vysledky`/`historie`, jen o
// jednu úroveň vnoření hlouběji.

describe('validateSoubojStatistikyData — zapasyProtiPostavam', () => {
  it('platný vnořený záznam projde beze změny', () => {
    const vysledek = validateSoubojStatistikyData({
      vysledky: {},
      historie: [],
      zapasyProtiPostavam: { pyra: { volt: { vyhry: 3, prohry: 1, remizy: 0 } } },
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.zapasyProtiPostavam.pyra?.volt).toEqual({ vyhry: 3, prohry: 1, remizy: 0 })
    }
  })

  it('neplatná vlastní postava zahodí celý vnořený řádek', () => {
    const vysledek = validateSoubojStatistikyData({
      zapasyProtiPostavam: { neexistujici: { volt: { vyhry: 1, prohry: 0, remizy: 0 } } },
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.zapasyProtiPostavam.neexistujici).toBeUndefined()
    }
  })

  it('neplatná soupeřova postava zahodí jen tenhle jeden vnořený záznam', () => {
    const vysledek = validateSoubojStatistikyData({
      zapasyProtiPostavam: {
        pyra: { neexistujici: { vyhry: 1, prohry: 0, remizy: 0 }, volt: { vyhry: 2, prohry: 0, remizy: 0 } },
      },
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.zapasyProtiPostavam.pyra).toEqual({ volt: { vyhry: 2, prohry: 0, remizy: 0 } })
    }
  })

  it('chybějící pole se bere jako prázdný objekt, ne jako chyba', () => {
    const vysledek = validateSoubojStatistikyData({})
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.zapasyProtiPostavam).toEqual({})
    }
  })

  it('historie s neplatnou souperId zahodí jen soupeře, záznam samotný zůstává', () => {
    const vysledek = validateSoubojStatistikyData({
      historie: [{ postavaId: 'pyra', souperId: 'neexistujici', vysledek: 'vyhra', kdy: 100 }],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.historie[0]).toEqual({ postavaId: 'pyra', souperId: undefined, vysledek: 'vyhra', kdy: 100 })
    }
  })
})
