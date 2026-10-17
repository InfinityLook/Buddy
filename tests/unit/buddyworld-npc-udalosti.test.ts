import { describe, expect, it } from 'vitest'
import { NPC_UDALOSTI, jeNpcUdalostId, lzeZaznamenatUdalost, overZaznamenaneUdalosti, udalostProObyvatele } from '../../src/buddyworld/npcUdalosti'
import { vedlejsiUkolyObyvatele } from '../../src/buddyworld/npcInteractions'

describe('NPC příběhové události', () => {
  it('obsahuje právě tři jedinečné epizody', () => {
    expect(Object.keys(NPC_UDALOSTI)).toEqual(['elara', 'kael', 'mira'])
  })
  it('nedovolí epizodu bez získané důvěry', () => {
    expect(lzeZaznamenatUdalost('elara', [], [])).toBe(false)
    expect(udalostProObyvatele('elara', [])).toBeNull()
  })
  it('odemkne epizodu po dvou úkolech daného NPC', () => {
    const hotove = vedlejsiUkolyObyvatele('mira').slice(0, 2).map(u => u.id)
    expect(lzeZaznamenatUdalost('mira', hotove, [])).toBe(true)
    expect(udalostProObyvatele('mira', hotove)?.nazev).toBe('Ztracená stezka stavitelů')
  })
  it('zabrání opakovanému zapsání', () => {
    const hotove = vedlejsiUkolyObyvatele('kael').slice(0, 2).map(u => u.id)
    expect(lzeZaznamenatUdalost('kael', hotove, ['kael'])).toBe(false)
  })
  it('při obnově uložené hry odstraní neplatné hodnoty a duplicity', () => {
    expect(overZaznamenaneUdalosti(['mira', 'mira', 'hack', 7, 'elara'])).toEqual(['mira', 'elara'])
    expect(overZaznamenaneUdalosti(null)).toEqual([])
    expect(jeNpcUdalostId('x')).toBe(false)
  })
})
