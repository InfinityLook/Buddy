import { describe, expect, it } from 'vitest'
import { novaTretiVyprava, dalsiTretiVyprava, nactiTretiVypravu } from '../../src/buddyworld/tretiVyprava'
const start = () => dalsiTretiVyprava(dalsiTretiVyprava(novaTretiVyprava(), { type: 'odemknout' }), { type: 'zahajit' })
describe('Srdce mýtiny', () => {
  it('cannot start without unlocking', () => expect(dalsiTretiVyprava(novaTretiVyprava(), { type: 'zahajit' }).faze).toBe('zamcena'))
  it('counts only distinct enemies from the meadow', () => {
    let s = start()
    for (const id of ['a', 'a', 'b', 'c']) s = dalsiTretiVyprava(s, { type: 'porazit', id, region: 'kristalova_mytina' })
    expect(s.porazeni).toHaveLength(3)
    expect(s.faze).toBe('pruzkum')
  })
  it('requires exploration and village return', () => {
    let s = nactiTretiVypravu({ faze: 'pruzkum', porazeni: ['a', 'b', 'c'] })
    expect(dalsiTretiVyprava(s, { type: 'prevzit', region: 'buddy_vesnice' })).toBe(s)
    s = dalsiTretiVyprava(s, { type: 'prozkoumat', region: 'kristalova_mytina' })
    expect(s.faze).toBe('navrat')
    expect(dalsiTretiVyprava(s, { type: 'prevzit', region: 'buddy_vesnice' }).odmenaPrevzata).toBe(true)
  })
  it('rejects forged completion without three kills', () => expect(nactiTretiVypravu({ faze: 'dokoncena', odmenaPrevzata: true, porazeni: ['a'] }).faze).toBe('lov'))
})
