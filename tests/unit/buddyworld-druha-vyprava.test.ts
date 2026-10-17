import { describe, expect, it } from 'vitest'
import { novaDruhaVyprava, dalsiDruhaVyprava, nactiDruhouVypravu } from '../../src/buddyworld/druhaVyprava'
describe('Ozvěny krystalů', () => {
  it('requires unlocking and acceptance', () => {
    const a = novaDruhaVyprava()
    expect(dalsiDruhaVyprava(a, { type: 'zahajit' })).toBe(a)
    expect(dalsiDruhaVyprava(a, { type: 'odemknout' }).faze).toBe('pripravena')
  })
  it('counts only unique enemies in the right region', () => {
    let s = dalsiDruhaVyprava(dalsiDruhaVyprava(novaDruhaVyprava(), { type: 'odemknout' }), { type: 'zahajit' })
    s = dalsiDruhaVyprava(s, { type: 'porazit', id: 'e1', region: 'kristalova_mytina' })
    expect(dalsiDruhaVyprava(s, { type: 'porazit', id: 'e1', region: 'kristalova_mytina' })).toBe(s)
    expect(dalsiDruhaVyprava(s, { type: 'porazit', id: 'e2', region: 'jiny' })).toBe(s)
    expect(dalsiDruhaVyprava(s, { type: 'porazit', id: 'e2', region: 'kristalova_mytina' }).faze).toBe('navrat')
  })
  it('requires return to village and only grants once', () => {
    let s = nactiDruhouVypravu({ faze: 'navrat', porazeni: ['e1', 'e2'] })
    expect(dalsiDruhaVyprava(s, { type: 'prevzit', region: 'kristalova_mytina' })).toBe(s)
    s = dalsiDruhaVyprava(s, { type: 'prevzit', region: 'buddy_vesnice' })
    expect(s.odmenaPrevzata).toBe(true)
    expect(dalsiDruhaVyprava(s, { type: 'prevzit', region: 'buddy_vesnice' })).toBe(s)
  })
  it('sanitizes untrusted saved progress', () => {
    expect(nactiDruhouVypravu({ faze: 'dokoncena', odmenaPrevzata: true, porazeni: ['a', 'a'] }).faze).toBe('boj')
  })
})
