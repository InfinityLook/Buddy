import { describe, it, expect } from 'vitest'
import { validateFitnessCilData } from '@/core/utils/fitnessCilValidation'
import { sanitizujSezeni } from '@/miniapps/form-check/useFormCheck'

describe('validateFitnessCilData', () => {
  it('platná kladná čísla projdou beze změny', () => {
    const vysledek = validateFitnessCilData({ cilKcal: 400, cilTreninkMin: 30, cilTreninkuTydne: 3 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data).toEqual({ cilKcal: 400, cilTreninkMin: 30, cilTreninkuTydne: 3 })
    }
  })

  it('chybějící pole spadnou na null, ne na chybu celého objektu', () => {
    const vysledek = validateFitnessCilData({})
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data).toEqual({ cilKcal: null, cilTreninkMin: null, cilTreninkuTydne: null })
    }
  })

  it('záporné nebo nulové číslo spadne na null, ne na chybu', () => {
    const vysledek = validateFitnessCilData({ cilKcal: -50, cilTreninkMin: 0 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.cilKcal).toBeNull()
      expect(vysledek.data.cilTreninkMin).toBeNull()
    }
  })

  it('špatný typ pole (řetězec místo čísla) spadne na null, ostatní pole zůstanou platná', () => {
    const vysledek = validateFitnessCilData({ cilKcal: 'hodně', cilTreninkuTydne: 4 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.cilKcal).toBeNull()
      expect(vysledek.data.cilTreninkuTydne).toBe(4)
    }
  })

  it('úplně neplatný tvar dat (ne objekt) se odmítne', () => {
    const vysledek = validateFitnessCilData('nesmysl')
    expect(vysledek.success).toBe(false)
  })
})

describe('sanitizujSezeni', () => {
  it('vrátí prázdné pole, když perzistovaná hodnota není pole', () => {
    expect(sanitizujSezeni(undefined)).toEqual([])
    expect(sanitizujSezeni('nesmysl')).toEqual([])
  })

  it('poškozenou položku (chybí id) tiše vyřadí, zbytek zůstane', () => {
    const vysledek = sanitizujSezeni([
      { id: 'a', cvik: 'dřep', pocetOpakovani: 5, trvaniSekund: 30, createdAt: '2024-01-01' },
      { cvik: 'dřep', pocetOpakovani: 5, trvaniSekund: 30, createdAt: '2024-01-01' }, // chybí id
    ])
    expect(vysledek).toHaveLength(1)
    expect(vysledek[0].id).toBe('a')
  })

  it('starší sezení bez cvik/poznamka/narocnost dostane bezpečné výchozí hodnoty', () => {
    const vysledek = sanitizujSezeni([
      { id: 'a', pocetOpakovani: 5, trvaniSekund: 30, createdAt: '2024-01-01' },
    ])
    expect(vysledek[0]).toMatchObject({ cvik: 'dřep', poznamka: '', narocnost: null })
  })

  it('neplatný cvik/náročnost spadne na bezpečnou výchozí hodnotu, položka se nevyřadí', () => {
    const vysledek = sanitizujSezeni([
      {
        id: 'a',
        cvik: 'kotoul',
        pocetOpakovani: 5,
        trvaniSekund: 30,
        createdAt: '2024-01-01',
        narocnost: 'extrémní',
      },
    ])
    expect(vysledek).toHaveLength(1)
    expect(vysledek[0].cvik).toBe('dřep')
    expect(vysledek[0].narocnost).toBeNull()
  })

  it('platný cvik (klik) a platná náročnost/poznámka projdou beze změny', () => {
    const vysledek = sanitizujSezeni([
      {
        id: 'a',
        cvik: 'klik',
        pocetOpakovani: 12,
        trvaniSekund: 60,
        createdAt: '2024-01-01',
        narocnost: 'tezka',
        poznamka: 'bolely ruce',
      },
    ])
    expect(vysledek[0]).toMatchObject({ cvik: 'klik', narocnost: 'tezka', poznamka: 'bolely ruce' })
  })
})
