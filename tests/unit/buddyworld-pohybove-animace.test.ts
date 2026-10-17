import { describe, expect, it } from 'vitest'
import { fazeKroku, typAnimacePohybu, vyberAnimaciPohybu } from '../../src/buddyworld/scene/pohyboveAnimace'
describe('Buddy World v5.2 – pohybové animace', () => {
  it('stání při nulové rychlosti', () => expect(typAnimacePohybu(0)).toBe('idle'))
  it('chůze při pomalém pohybu', () => expect(typAnimacePohybu(2)).toBe('walk'))
  it('běh při vysoké rychlosti', () => expect(typAnimacePohybu(6)).toBe('run'))
  it('útok má přednost před pohybem', () => expect(vyberAnimaciPohybu(6, true)).toBe('attack'))
  it('neplatná rychlost nevytvoří běh', () => expect(typAnimacePohybu(NaN)).toBe('idle'))
  it('fáze kroku se při pohybu posouvá', () => expect(fazeKroku(0, 4, 0.016)).toBeGreaterThan(0))
  it('nulové dt neposune fázi', () => expect(fazeKroku(1, 4, 0)).toBe(1))
})
