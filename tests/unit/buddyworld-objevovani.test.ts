import { describe, expect, it } from 'vitest'
import { noveObjevenaOblast, overObjeveneOblasti, ODMENY_ZA_OBJEVENTI } from '../../src/buddyworld/data/objevovani'

describe('Průzkum světa', () => {
  it('rozpozná první návštěvu vesnice', () => expect(noveObjevenaOblast({ x: 0, z: 13 }, [])).toBe('vesnice'))
  it('již objevené místo neodmění znovu', () => expect(noveObjevenaOblast({ x: 0, z: 13 }, ['vesnice'])).toBeNull())
  it('mimo oblasti neodměňuje', () => expect(noveObjevenaOblast({ x: 20, z: 20 }, [])).toBeNull())
  it('sanitizuje uložená data', () => expect(overObjeveneOblasti(['vesnice','vesnice','fake', 5])).toEqual(['vesnice']))
  it('každá oblast má definované odměny', () => expect(Object.keys(ODMENY_ZA_OBJEVENTI)).toHaveLength(6))
})
