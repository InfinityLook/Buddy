import { describe, expect, it } from 'vitest'
import { OBLASTI_SVETA, oblastNaPozici } from '../../src/buddyworld/data/oblasti'

describe('Buddy World – oblasti mapy', () => {
  it('má šest unikátních oblastí s platnými poloměry', () => {
    expect(OBLASTI_SVETA).toHaveLength(6)
    expect(new Set(OBLASTI_SVETA.map(o => o.id)).size).toBe(6)
    expect(OBLASTI_SVETA.every(o => o.polomer > 0)).toBe(true)
  })
  it('najde vesnici v jejím středu', () => {
    expect(oblastNaPozici({ x: 0, z: 13 })?.id).toBe('vesnice')
  })
  it('upřednostní menší oblast krystalu při překryvu', () => {
    expect(oblastNaPozici({ x: 0, z: 4 })?.id).toBe('kristalova-mytina')
  })
  it('mimo mapu vrací null', () => {
    expect(oblastNaPozici({ x: 100, z: 100 })).toBeNull()
  })
})
