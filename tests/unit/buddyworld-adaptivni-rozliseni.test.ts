import { describe, expect, it } from 'vitest'
import { dalsiRozliseni, novyStavRozliseni } from '../../src/buddyworld/scene/adaptivniRozliseni'

describe('adaptivní rozlišení', () => {
  it('při trvale pomalém FPS sníží DPR', () => {
    let s = novyStavRozliseni(1.5)
    for (let i = 0; i < 90; i++) s = dalsiRozliseni(s, 33, 4000 + i * 33, 1.5)
    expect(s.pomer).toBeLessThan(1.5)
  })
  it('nepřekročí minimum', () => {
    let s = novyStavRozliseni(0.75)
    for (let i = 0; i < 90; i++) s = dalsiRozliseni(s, 40, 4000 + i * 40, 1.5)
    expect(s.pomer).toBe(0.75)
  })
  it('rychlé snímky postupně obnovují kvalitu, nikoliv nad maximum', () => {
    let s = novyStavRozliseni(1.4)
    for (let i = 0; i < 90; i++) s = dalsiRozliseni(s, 12, 4000 + i * 12, 1.5)
    expect(s.pomer).toBe(1.5)
  })
  it('ignoruje neplatné časování', () => {
    const s = novyStavRozliseni(1.5)
    expect(dalsiRozliseni(s, Number.NaN, 4000, 1.5)).toBe(s)
  })
})
