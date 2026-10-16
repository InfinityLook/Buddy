import { describe, expect, it } from 'vitest'
import { POKLADY, lzeOtevritPoklad, overOtevrenePoklady } from '../../src/buddyworld/data/poklady'

describe('Jednorázové poklady', () => {
  it('každý poklad má unikátní ID', () => expect(new Set(POKLADY.map(p => p.id)).size).toBe(POKLADY.length))
  it('otevřený poklad nejde otevřít znovu', () => expect(lzeOtevritPoklad(POKLADY[0].id, [POKLADY[0].id])).toBe(false))
  it('neznámé ID nelze otevřít', () => expect(lzeOtevritPoklad('hack', [])).toBe(false))
  it('poškozená uložená data jsou filtrována', () => expect(overOtevrenePoklady([POKLADY[0].id, POKLADY[0].id, 'hack', 123])).toEqual([POKLADY[0].id]))
})
