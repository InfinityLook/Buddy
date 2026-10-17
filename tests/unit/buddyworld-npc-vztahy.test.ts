import { describe, expect, it } from 'vitest'
import { urovenDůvěry, textDůvěry, lzeVyzvednoutOdmenuVztahu, overPrevzateOdmenyVztahu } from '../../src/buddyworld/npcVztahy'

describe('vztahy s obyvateli', () => {
  it('neznámá postava nemá důvěru ani odměnu', () => {
    expect(urovenDůvěry('neznamy', ['pomoc_stavitelce'])).toBe(0)
    expect(lzeVyzvednoutOdmenuVztahu('neznamy', [], [])).toBe(false)
  })
  it('důvěra se počítá pouze z úkolů dané postavy', () => {
    expect(urovenDůvěry('mira', ['lesni_hlidka'])).toBe(0)
    expect(urovenDůvěry('mira', ['pomoc_stavitelce'])).toBe(1)
    expect(urovenDůvěry('mira', ['pomoc_stavitelce', 'kamenny_most'])).toBe(2)
  })
  it('tajemství se odemyká podle důvěry', () => {
    expect(textDůvěry('mira', [])).toBeNull()
    expect(textDůvěry('mira', ['pomoc_stavitelce'])).toContain('základy')
  })
  it('odměnu lze vyzvednout jen jednou', () => {
    const hotovo = ['pomoc_stavitelce', 'kamenny_most']
    expect(lzeVyzvednoutOdmenuVztahu('mira', hotovo, [])).toBe(true)
    expect(lzeVyzvednoutOdmenuVztahu('mira', hotovo, ['mira'])).toBe(false)
  })
  it('načtení uložení odfiltruje neplatné a duplicitní záznamy', () => {
    expect(overPrevzateOdmenyVztahu(['mira', 'mira', 'cizi', 2])).toEqual(['mira'])
  })
})
