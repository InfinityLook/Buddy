import { describe, expect, it } from 'vitest'
import { vyberAnimaciHrace, prubehAnimace } from '../../src/buddyworld/scene/pohyboveAnimace'
const stav = { mrtvy: false, zasahDoMs: 0, uhybDoMs: 0, utokDoMs: 0 }
describe('Buddy World v5.3 – bojové reakce', () => {
  it('smrt má nejvyšší prioritu', () => expect(vyberAnimaciHrace(6, 100, { ...stav, mrtvy: true, zasahDoMs: 300 })).toBe('death'))
  it('zásah má přednost před úhybem', () => expect(vyberAnimaciHrace(6, 100, { ...stav, zasahDoMs: 300, uhybDoMs: 300 })).toBe('hit'))
  it('úhyb má přednost před útokem', () => expect(vyberAnimaciHrace(6, 100, { ...stav, uhybDoMs: 300, utokDoMs: 300 })).toBe('dodge'))
  it('útok má přednost před během', () => expect(vyberAnimaciHrace(6, 100, { ...stav, utokDoMs: 300 })).toBe('attack'))
  it('běh se obnoví po reakci', () => expect(vyberAnimaciHrace(6, 400, { ...stav, zasahDoMs: 300 })).toBe('run'))
  it('průběh animace je omezen na 0–1', () => { expect(prubehAnimace(0, 500, 500)).toBe(0); expect(prubehAnimace(250, 500, 500)).toBe(.5); expect(prubehAnimace(600, 500, 500)).toBe(1) })
})
