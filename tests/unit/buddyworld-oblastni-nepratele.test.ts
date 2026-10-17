import { describe, expect, it } from 'vitest'
import { oblastNaPozici } from '../../src/buddyworld/data/oblasti'
import { poziceVOblasti, vytvorOblastniSpawny } from '../../src/buddyworld/data/oblastniNepratele'

describe('Buddy World – nepřátelé podle oblastí', () => {
  it('vytváří protivníky jen v nebezpečných oblastech', () => {
    const spawny = vytvorOblastniSpawny(4, () => 0.5)
    expect(spawny).toHaveLength(4)
    expect(new Set(spawny.map(s => s.def.id)).size).toBe(4)
    expect(spawny.every(s => oblastNaPozici(s.pozice)?.id === s.oblastId)).toBe(true)
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

describe('Buddy World – Křišťálová mýtina', () => {
  it('obsahuje tři odlišné typy nepřátel s platnými parametry', async () => {
    const { NEPRATELE } = await import('../../src/buddyworld/data/nepratele')
    const ids = ['krystalovy-sliz', 'magicka-mura', 'krystalovy-skorpion']
    const definice = ids.map(id => NEPRATELE.find(n => n.id === id))
    expect(definice.every(Boolean)).toBe(true)
    expect(definice.every(n => n!.maxHp > 0 && n!.rychlost > 0 && n!.odmenaXp > 0)).toBe(true)
  })
  it('všechny tři typy mají spawn na mýtině', async () => {
    const { OBLASTNI_NEPRATELE } = await import('../../src/buddyworld/data/oblastniNepratele')
    expect(OBLASTNI_NEPRATELE.filter(n => n.oblastId === 'kristalova-mytina')).toHaveLength(3)
  })
})
