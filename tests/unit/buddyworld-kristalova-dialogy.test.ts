import { describe, expect, it } from 'vitest'
import { dialogElary } from '../../src/buddyworld/kristalovaDialogy'
import { novaKristalovaVyprava, zpracujVypravu } from '../../src/buddyworld/kristalovaVyprava'

describe('Elara quest dialogue', () => {
  it('offers start only in village', () => {
    const s = novaKristalovaVyprava()
    expect(dialogElary(s, 'buddy_vesnice').akce?.type).toBe('zahajit')
    expect(dialogElary(s, 'kristalova_mytina').akce).toBeNull()
  })
  it('offers reward only when return phase is reached', () => {
    let s = zpracujVypravu(novaKristalovaVyprava(), { type: 'zahajit' })
    for (const id of ['a', 'b', 'c']) s = zpracujVypravu(s, { type: 'sebrat_ulomek', id, region: 'kristalova_mytina' })
    for (const id of ['enemy1', 'enemy2']) s = zpracujVypravu(s, { type: 'porazit_nepritele', id, region: 'kristalova_mytina' })
    expect(dialogElary(s, 'buddy_vesnice').akce?.type).toBe('prevzit_odmenu')
    s = zpracujVypravu(s, { type: 'prevzit_odmenu', region: 'buddy_vesnice' })
    expect(dialogElary(s, 'buddy_vesnice').akce).toBeNull()
  })
})
