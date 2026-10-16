import { describe, it, expect } from 'vitest'
import { mossUzdraveni, frostNasobicRychlosti, FROST_ZPOMALENI_MS } from '@/buddyworld/combat/buddySkills'

describe('Elementální efekty Buddyho', () => {
  it('Moss vyléčí 12 % maximálního HP', () => {
    expect(mossUzdraveni({ hp: 30, maxHp: 100 }).hp).toBe(42)
  })
  it('Moss nepřekročí maximální HP', () => {
    expect(mossUzdraveni({ hp: 98, maxHp: 100 }).hp).toBe(100)
  })
  it('Frost zpomalí na čtyři sekundy', () => {
    expect(frostNasobicRychlosti(1000, 1000 + FROST_ZPOMALENI_MS)).toBe(0.4)
    expect(frostNasobicRychlosti(5000, 5000)).toBe(1)
  })
})
