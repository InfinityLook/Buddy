import { describe, it, expect } from 'vitest'
import { VYCHOZI_OSADA, pridejSurovinu } from '../../src/buddyworld/villageProgress'

describe('Buddy World – sběr surovin', () => {
  it('přidá dřevo', () => expect(pridejSurovinu(VYCHOZI_OSADA, 'drevo').drevo).toBe(1))
  it('přidá kámen', () => expect(pridejSurovinu(VYCHOZI_OSADA, 'kamen').kamen).toBe(1))
  it('odmítne záporné hodnoty', () => expect(pridejSurovinu(VYCHOZI_OSADA, 'drevo', -1)).toEqual(VYCHOZI_OSADA))
  it('omezí kapacitu', () => expect(pridejSurovinu({ ...VYCHOZI_OSADA, kamen: 999999 }, 'kamen', 10).kamen).toBe(1000000))
})
