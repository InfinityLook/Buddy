import { describe, expect, it } from 'vitest'
import { oblastUkolu, cilNavigace, navigacniUdaje } from '@/buddyworld/data/navigace'

// Přesunuto z src/buddyworld/data/navigace.test.ts — mimo
// tests/unit/**/*.test.ts (viz vitest.config.ts) by appka tenhle
// soubor nikdy nespustila, jen by tiše seděl nevyužitý.
describe('navigace', () => {
  it('směr na sever je 0°', () => expect(navigacniUdaje({ x: 0, z: 0 }, { x: 0, z: -10 }).stupne).toBe(0))
  it('směr na východ je 90°', () => expect(navigacniUdaje({ x: 0, z: 0 }, { x: 10, z: 0 }).stupne).toBe(90))
  it('blízký cíl je dosažen', () => expect(navigacniUdaje({ x: 0, z: 0 }, { x: 1, z: 1 }).dosazeno).toBe(true))
  it('úkol bosse ukazuje na háj', () => expect(oblastUkolu('zkouska_odvahy')).toBe('haj-strazce'))
  it('neznámý cíl je null', () => expect(cilNavigace('neexistuje')).toBeNull())
})
