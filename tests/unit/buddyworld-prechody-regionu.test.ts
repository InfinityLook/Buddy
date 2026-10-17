import { describe, expect, it } from 'vitest'
import { BRANY_REGIONU, branaVDosahu } from '../../src/buddyworld/data/prechodyRegionu'

describe('cestovní brány regionů', () => {
  it('má unikátní identifikátory', () => expect(new Set(BRANY_REGIONU.map(b => b.id)).size).toBe(BRANY_REGIONU.length))
  it('umožní přechod jen v dosahu', () => {
    const brana = BRANY_REGIONU[0]
    expect(branaVDosahu(brana.pozice, brana.id)?.kam).toBe(brana.kam)
    expect(branaVDosahu({ x: 100, z: 100 }, brana.id)).toBeNull()
  })
  it('odmítne neexistující bránu', () => expect(branaVDosahu({ x: 0, z: 0 }, 'nic')).toBeNull())
})
