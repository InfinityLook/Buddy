import { describe, expect, it } from 'vitest'
import { ULOMKY_MYTINY, nejblizsiUlomek, validujSebraneUlomky } from '../../src/buddyworld/data/ulomkyMytiny'

describe('sběratelské úlomky Křišťálové mýtiny', () => {
  it('má tři unikátní úlomky', () => expect(new Set(ULOMKY_MYTINY.map(u => u.id)).size).toBe(3))
  it('umožní sebrat blízký úlomek', () => expect(nejblizsiUlomek(ULOMKY_MYTINY[0].pozice, [])?.id).toBe(ULOMKY_MYTINY[0].id))
  it('neumožní opětovný sběr', () => expect(nejblizsiUlomek(ULOMKY_MYTINY[0].pozice, [ULOMKY_MYTINY[0].id])?.id).not.toBe(ULOMKY_MYTINY[0].id))
  it('odmítne vzdálené úlomky', () => expect(nejblizsiUlomek({ x: 100, z: 100 }, [])).toBeNull())
  it('filtruje neplatná a duplicitní ID', () => expect(validujSebraneUlomky([ULOMKY_MYTINY[0].id, ULOMKY_MYTINY[0].id, 'cizi'])).toEqual([ULOMKY_MYTINY[0].id]))
})
