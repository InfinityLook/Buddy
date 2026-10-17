import { describe, expect, it } from 'vitest'
import { OBLASTI_SVETA } from '../../src/buddyworld/data/oblasti'
import { mytinaMaBytViditelna, rozmisteniKrystalu } from '../../src/buddyworld/scene/kristalovaMytina'
const mytina = OBLASTI_SVETA.find(o => o.id === 'kristalova-mytina')!
describe('Křišťálová mýtina', () => {
  it('vytváří stabilní rozmístění instancí', () => {
    expect(rozmisteniKrystalu()).toEqual(rozmisteniKrystalu())
    expect(rozmisteniKrystalu()).toHaveLength(24)
  })
  it('načítá oblast při vstupu', () => {
    expect(mytinaMaBytViditelna(mytina.stred, false)).toBe(true)
  })
  it('používá hysterezi, aby se na hranici nepřepínala', () => {
    const p = { x: mytina.stred.x + mytina.polomer + 15, z: mytina.stred.z }
    expect(mytinaMaBytViditelna(p, false)).toBe(false)
    expect(mytinaMaBytViditelna(p, true)).toBe(true)
  })
})
