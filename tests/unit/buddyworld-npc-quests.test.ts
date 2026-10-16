import { describe, expect, it } from 'vitest'
import { ukolProObyvatele, stavUkolu } from '../../src/buddyworld/npcQuests'
import { VYCHOZI_OSADA } from '../../src/buddyworld/villageProgress'

describe('NPC quest dialog', () => {
  it('offers only the first unfinished quest to its owner', () => {
    expect(ukolProObyvatele('Elara', [])?.id).toBe('prvni_kroky')
    expect(ukolProObyvatele('Kael', [])).toBeNull()
    expect(ukolProObyvatele('Kael', ['prvni_kroky'])?.id).toBe('obrana_osady')
  })
  it('does not allow claiming unfinished objective', () => {
    const q = ukolProObyvatele('Elara', [])!
    expect(stavUkolu(q, VYCHOZI_OSADA)).toBe('probíhá')
    expect(stavUkolu(q, { ...VYCHOZI_OSADA, drevo: 3, kamen: 2 })).toBe('pripraveno')
  })
})
