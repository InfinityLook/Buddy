import { describe, expect, it } from 'vitest'
import { CHRAMOVE_RUNY, dalsiRuna, lzeAktivovatRunu, lzeDokoncitPodzemi, overRuny } from '../../src/buddyworld/data/chramovePodzemi'
import { CHRAM_POZICE } from '../../src/buddyworld/data/chramStrazcu'
describe('Chrámové podzemí', () => {
  it('vyžaduje pořadí run', () => expect(dalsiRuna(['svetlo'])?.id).toBe('odvaha'))
  it('nepovolí aktivaci před průzkumem chrámu', () => expect(lzeAktivovatRunu('svetlo', [], CHRAMOVE_RUNY[0].pozice, false)).toBe(false))
  it('nepovolí aktivaci na dálku', () => expect(lzeAktivovatRunu('svetlo', [], { x: 0, z: 0 }, true)).toBe(false))
  it('povolí správnou runu zblízka', () => expect(lzeAktivovatRunu('svetlo', [], CHRAMOVE_RUNY[0].pozice, true)).toBe(true))
  it('vyžaduje všechny runy a návrat k oltáři', () => expect(lzeDokoncitPodzemi(['svetlo', 'odvaha', 'pamet'], false, CHRAM_POZICE)).toBe(true))
  it('nepovolí druhé dokončení', () => expect(lzeDokoncitPodzemi(['svetlo', 'odvaha', 'pamet'], true, CHRAM_POZICE)).toBe(false))
  it('opraví poškozené uložené pořadí', () => expect(overRuny(['svetlo', 'pamet'])).toEqual(['svetlo']))
})
