import { describe, expect, it } from 'vitest'
import { jeObyvatelId, vedlejsiUkolyObyvatele, rozhovorObyvatele, stavVedlejsihoUkolu } from '../../src/buddyworld/npcInteractions'
import { VYCHOZI_OSADA } from '../../src/buddyworld/villageProgress'

describe('NPC interakce v3.5', () => {
  it('rozpozná jen skutečné obyvatele', () => {
    expect(jeObyvatelId('mira')).toBe(true)
    expect(jeObyvatelId('__proto__')).toBe(false)
  })
  it('přiřadí všech osm úkolů právě jednomu obyvateli', () => {
    const vsechny = ['mira','kael','elara'].flatMap(vedlejsiUkolyObyvatele)
    expect(vsechny).toHaveLength(8)
    expect(new Set(vsechny.map(u => u.id)).size).toBe(8)
  })
  it('změní dialog po dokončení všech úkolů zadavatele', () => {
    const pred = rozhovorObyvatele('mira', [])
    const po = rozhovorObyvatele('mira', vedlejsiUkolyObyvatele('mira').map(u => u.id))
    expect(pred).not.toBe(po)
  })
  it('neumožní předčasné vyzvednutí odměny', () => {
    expect(stavVedlejsihoUkolu('pomoc_stavitelce', [], VYCHOZI_OSADA)).toBe('aktivni')
    expect(stavVedlejsihoUkolu('pomoc_stavitelce', ['pomoc_stavitelce'], VYCHOZI_OSADA)).toBe('splneno')
  })
})
