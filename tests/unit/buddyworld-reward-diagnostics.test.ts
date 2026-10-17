import { describe, expect, it } from 'vitest'
import { diagnostikaOdmen, KONTROLOVANE_ODMENY } from '../../src/buddyworld/rewardDiagnostics'
const [quest, marker] = KONTROLOVANE_ODMENY[0]
const storage = (data: Record<string,string>) => ({ getItem: (k:string) => data[k] ?? null })
describe('Reward consistency diagnostics (read-only)', () => {
  it('reports completed quest with missing claim marker', () => {
    expect(diagnostikaOdmen(storage({ [quest]: JSON.stringify({ odmenaPrevzata:true }) }))).toContainEqual({ vyprava:quest, druh:'dokonceno-bez-rezervace' })
  })
  it('reports marker without completed quest', () => {
    expect(diagnostikaOdmen(storage({ [marker]:'claimed' }))).toContainEqual({ vyprava:quest, druh:'rezervovano-bez-dokonceni' })
  })
  it('accepts consistent completed quest', () => {
    expect(diagnostikaOdmen(storage({ [quest]:JSON.stringify({ odmenaPrevzata:true }), [marker]:'claimed' }))).toEqual([])
  })
  it('reports malformed quest without modifying storage', () => {
    expect(diagnostikaOdmen(storage({ [quest]:'{' }))[0].druh).toBe('neplatny-zaznam')
  })
  it('accepts untouched progress', () => expect(diagnostikaOdmen(storage({}))).toEqual([]))
})
