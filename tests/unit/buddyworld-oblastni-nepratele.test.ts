import { describe, expect, it } from 'vitest'
import { oblastNaPozici } from '../../src/buddyworld/data/oblasti'
import { poziceVOblasti, vytvorOblastniSpawny } from '../../src/buddyworld/data/oblastniNepratele'

describe('Buddy World – nepřátelé podle oblastí', () => {
  it('vytváří protivníky jen ve Stínech lesa', () => {
    const spawny = vytvorOblastniSpawny(4, () => 0.5)
    expect(spawny).toHaveLength(4)
    expect(new Set(spawny.map(s => s.def.id)).size).toBe(4)
    expect(spawny.every(s => oblastNaPozici(s.pozice)?.id === 'stiny-lesa')).toBe(true)
  })
  it('neumístí nepřítele do bezpečné vesnice', () => {
    const spawny = vytvorOblastniSpawny(2, () => 0.1)
    expect(spawny.every(s => oblastNaPozici(s.pozice)?.id !== 'vesnice')).toBe(true)
  })
  it('náhodné body nepřekračují hranice oblasti', () => {
    for (const hodnota of [0, 0.1, 0.5, 0.99]) {
      expect(oblastNaPozici(poziceVOblasti('stiny-lesa', () => hodnota))?.id).toBe('stiny-lesa')
    }
  })
  it('neznámá oblast je chyba konfigurace', () => {
    expect(() => poziceVOblasti('neexistuje')).toThrow()
  })
})
