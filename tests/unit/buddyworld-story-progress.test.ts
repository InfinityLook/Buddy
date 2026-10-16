import { describe, expect, it } from 'vitest'
import { UKOLY } from '../../src/buddyworld/quests'
import { zjistiPribeh } from '../../src/buddyworld/storyProgress'

describe('postup příběhem', () => {
  it('začíná prvním úkolem', () => {
    const stav = zjistiPribeh([])
    expect(stav.dokonceno).toBe(0)
    expect(stav.dalsiUkol).toBe(UKOLY[0].id)
    expect(stav.dokoncenaHra).toBe(false)
  })
  it('ignoruje přeskočené úkoly', () => {
    const stav = zjistiPribeh([UKOLY[2].id, UKOLY[3].id])
    expect(stav.dokonceno).toBe(0)
    expect(stav.dokoncenaHra).toBe(false)
  })
  it('přechází na druhou kapitolu', () => {
    const stav = zjistiPribeh(UKOLY.slice(0, 8).map(u => u.id))
    expect(stav.kapitola).toBe(2)
    expect(stav.dalsiUkol).toBe(UKOLY[8].id)
  })
  it('zobrazí konec až po všech úkolech', () => {
    const stav = zjistiPribeh(UKOLY.map(u => u.id))
    expect(stav.procent).toBe(100)
    expect(stav.dalsiUkol).toBeNull()
    expect(stav.dokoncenaHra).toBe(true)
  })
})
