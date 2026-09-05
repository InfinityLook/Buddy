import { describe, it, expect } from 'vitest'
import { spocitatFitnessPrehled, formatujRozdil, KCAL_NA_OPAKOVANI } from '@/flagships/fitness-room/fitnessStats'
import type { Sezeni } from '@/miniapps/form-check/types'

const sezeni = (opakovani: number, trvaniSekund: number, kdy: Date): Sezeni => ({
  id: `${Math.random()}`,
  cvik: 'dřep',
  pocetOpakovani: opakovani,
  trvaniSekund,
  createdAt: kdy.toISOString(),
})

describe('spocitatFitnessPrehled', () => {
  it('sečte jen dnešní sezení do "dnes" a včerejší do "vcera"', () => {
    const dnes = new Date()
    const vcera = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const predtim = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

    const vysledek = spocitatFitnessPrehled([
      sezeni(10, 60, dnes),
      sezeni(5, 30, dnes),
      sezeni(20, 120, vcera),
      sezeni(100, 999, predtim),
    ])

    expect(vysledek.dnes.opakovani).toBe(15)
    expect(vysledek.dnes.minutTreninku).toBe(2) // 90s -> 1.5 -> zaokrouhleno na 2
    expect(vysledek.vcera.opakovani).toBe(20)
    expect(vysledek.vcera.minutTreninku).toBe(2)
  })

  it('bez sezení vrátí nulové shrnutí', () => {
    const vysledek = spocitatFitnessPrehled([])
    expect(vysledek.dnes).toEqual({ minutTreninku: 0, opakovani: 0, odhadKcal: 0 })
    expect(vysledek.vcera).toEqual({ minutTreninku: 0, opakovani: 0, odhadKcal: 0 })
  })

  it('odhad kalorií je opakovani × KCAL_NA_OPAKOVANI, zaokrouhlený', () => {
    const vysledek = spocitatFitnessPrehled([sezeni(50, 300, new Date())])
    expect(vysledek.dnes.odhadKcal).toBe(Math.round(50 * KCAL_NA_OPAKOVANI))
  })
})

describe('formatujRozdil', () => {
  it('kladný rozdíl dostane znaménko plus', () => {
    expect(formatujRozdil(10, 3)).toBe('+7 vs včera')
  })

  it('záporný rozdíl si znaménko mínus nese ze samotného čísla', () => {
    expect(formatujRozdil(3, 10)).toBe('-7 vs včera')
  })

  it('stejná hodnota hlásí "stejně jako včera", ne "+0"', () => {
    expect(formatujRozdil(5, 5)).toBe('stejně jako včera')
  })
})
