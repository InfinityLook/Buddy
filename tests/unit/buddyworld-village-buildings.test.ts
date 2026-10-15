import { describe, expect, it } from 'vitest'
import { odemceneStavby, VESNICKE_STAVBY } from '../../src/buddyworld/villageBuildings'

describe('Buddy World – odemykání 3D budov', () => {
  it('na první úrovni se nové stavby ještě neobjeví', () => {
    expect(odemceneStavby(1)).toHaveLength(0)
  })
  it('druhá úroveň odemyká farmu a sklad', () => {
    expect(odemceneStavby(2).map((s) => s.id)).toEqual(['farma', 'sklad'])
  })
  it('pátá úroveň odemyká všech osm budov', () => {
    expect(odemceneStavby(5)).toHaveLength(8)
  })
  it('každá stavba má jedinečné ID a bezpečné souřadnice', () => {
    expect(new Set(VESNICKE_STAVBY.map((s) => s.id)).size).toBe(VESNICKE_STAVBY.length)
    for (const s of VESNICKE_STAVBY) {
      expect(Math.abs(s.x)).toBeLessThan(24)
      expect(Math.abs(s.z)).toBeLessThan(24)
      expect(s.sirka).toBeGreaterThan(0)
    }
  })
})
