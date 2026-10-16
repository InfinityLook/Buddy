import { describe, expect, it } from 'vitest'
import { VYCHOZI_OSADA, pridejSurovinu } from '../../src/buddyworld/villageProgress'

describe('Sběr krystalů', () => {
  it('přidá krystal do zásob vesnice', () => {
    expect(pridejSurovinu(VYCHOZI_OSADA, 'krystaly').krystaly).toBe(1)
  })
  it('nezmění jiné zásoby', () => {
    const stav = pridejSurovinu(VYCHOZI_OSADA, 'krystaly')
    expect(stav.drevo).toBe(0)
    expect(stav.kamen).toBe(0)
  })
  it('odmítne neplatné množství', () => {
    expect(pridejSurovinu(VYCHOZI_OSADA, 'krystaly', -1)).toBe(VYCHOZI_OSADA)
  })
})
