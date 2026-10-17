import { describe, it, expect } from 'vitest'
import { novaKristalovaVyprava, zpracujVypravu, nactiKristalovouVypravu } from '../../src/buddyworld/kristalovaVyprava'

describe('Ztracené světlo', () => {
  it('vyžaduje sběr, boj a návrat v daném pořadí', () => {
    let s = zpracujVypravu(novaKristalovaVyprava(), { type: 'zahajit' })
    for (const id of ['a', 'b', 'c']) s = zpracujVypravu(s, { type: 'sebrat_ulomek', id, region: 'kristalova_mytina' })
    expect(s.faze).toBe('boj')
    for (const id of ['e1', 'e2']) s = zpracujVypravu(s, { type: 'porazit_nepritele', id, region: 'kristalova_mytina' })
    expect(s.faze).toBe('navrat')
    s = zpracujVypravu(s, { type: 'prevzit_odmenu', region: 'buddy_vesnice' })
    expect(s.faze).toBe('dokoncena')
    expect(zpracujVypravu(s, { type: 'prevzit_odmenu', region: 'buddy_vesnice' })).toBe(s)
  })
  it('nepočítá opakované ID ani cizí region', () => {
    let s = zpracujVypravu(novaKristalovaVyprava(), { type: 'zahajit' })
    s = zpracujVypravu(s, { type: 'sebrat_ulomek', id: 'a', region: 'kristalova_mytina' })
    s = zpracujVypravu(s, { type: 'sebrat_ulomek', id: 'a', region: 'kristalova_mytina' })
    s = zpracujVypravu(s, { type: 'sebrat_ulomek', id: 'b', region: 'les_stinu' })
    expect(s.ulomky).toEqual(['a'])
  })
  it('nepřijme falešné dokončení z uložených dat', () => {
    expect(nactiKristalovouVypravu({ faze: 'dokoncena', odmenaPrevzata: true }).faze).toBe('sber')
  })
})
