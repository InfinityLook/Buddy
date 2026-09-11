import { describe, it, expect } from 'vitest'
import { validateCvicebniPlanData } from '@/core/utils/cvicebniPlanValidation'
import { dnesniDenVTydnu } from '@/flagships/fitness-room/useCvicebniPlan'

describe('validateCvicebniPlanData', () => {
  it('platný plán projde beze změny', () => {
    const vysledek = validateCvicebniPlanData({ 1: 'dřep', 3: 'odpocinek', 5: 'prkno' })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data).toEqual({ 1: 'dřep', 3: 'odpocinek', 5: 'prkno' })
    }
  })

  it('den mimo 1–7 se tiše vyřadí, zbytek plánu zůstane', () => {
    const vysledek = validateCvicebniPlanData({ 0: 'dřep', 8: 'klik', 2: 'výpad' })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data).toEqual({ 2: 'výpad' })
  })

  it('neplatná hodnota dne (mimo cvik/odpočinek) se tiše vyřadí', () => {
    const vysledek = validateCvicebniPlanData({ 1: 'neco-neplatneho', 2: 'klik' })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data).toEqual({ 2: 'klik' })
  })

  it('úplně neplatný tvar dat (ne objekt) se odmítne', () => {
    expect(validateCvicebniPlanData('nesmysl').success).toBe(false)
    expect(validateCvicebniPlanData(undefined).success).toBe(false)
  })

  it('prázdný plán je platný', () => {
    const vysledek = validateCvicebniPlanData({})
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data).toEqual({})
  })
})

describe('dnesniDenVTydnu', () => {
  it('přepočítá JS getDay() (0=neděle) na appčino 1=pondělí..7=neděle', () => {
    expect(dnesniDenVTydnu(new Date('2024-01-01T12:00:00'))).toBe(1) // pondělí
    expect(dnesniDenVTydnu(new Date('2024-01-03T12:00:00'))).toBe(3) // středa
    expect(dnesniDenVTydnu(new Date('2024-01-07T12:00:00'))).toBe(7) // neděle
    expect(dnesniDenVTydnu(new Date('2024-01-06T12:00:00'))).toBe(6) // sobota
  })
})
