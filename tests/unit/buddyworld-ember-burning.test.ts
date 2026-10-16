import { describe, expect, it } from 'vitest'
import { zacniHoreni, krokHoreni } from '@/buddyworld/combat/buddySkills'

describe('Ember — hoření', () => {
  it('nepoškozuje před první sekundou', () => {
    expect(krokHoreni(zacniHoreni(0), 999, 20).hp).toBe(20)
  })
  it('odečte tři HP každou sekundu a správně dohání zpožděné snímky', () => {
    const r = krokHoreni(zacniHoreni(0), 3000, 20)
    expect(r.hp).toBe(11)
    expect(krokHoreni(r.stav!, 4000, r.hp).hp).toBe(8)
  })
  it('nikdy nezabije nepřítele bez vyhodnocení vítězství', () => {
    expect(krokHoreni(zacniHoreni(0), 5000, 2).hp).toBe(1)
  })
  it('po vypršení efekt skončí', () => {
    expect(krokHoreni(zacniHoreni(0), 6000, 20).stav).toBeNull()
  })
})
