import { describe, it, expect } from 'vitest'
import { pozdravPodleCasu } from '@/core/utils/pozdrav'

describe('pozdravPodleCasu', () => {
  it('5:00–11:59 vrátí ranní pozdrav', () => {
    expect(pozdravPodleCasu(5)).toBe('Dobré ráno')
    expect(pozdravPodleCasu(8)).toBe('Dobré ráno')
    expect(pozdravPodleCasu(11)).toBe('Dobré ráno')
  })

  it('12:00–17:59 vrátí odpolední pozdrav', () => {
    expect(pozdravPodleCasu(12)).toBe('Dobré odpoledne')
    expect(pozdravPodleCasu(15)).toBe('Dobré odpoledne')
    expect(pozdravPodleCasu(17)).toBe('Dobré odpoledne')
  })

  it('18:00–21:59 vrátí večerní pozdrav', () => {
    expect(pozdravPodleCasu(18)).toBe('Dobrý večer')
    expect(pozdravPodleCasu(20)).toBe('Dobrý večer')
    expect(pozdravPodleCasu(21)).toBe('Dobrý večer')
  })

  it('22:00–4:59 vrátí noční pozdrav', () => {
    expect(pozdravPodleCasu(22)).toBe('Dobrou noc')
    expect(pozdravPodleCasu(23)).toBe('Dobrou noc')
    expect(pozdravPodleCasu(0)).toBe('Dobrou noc')
    expect(pozdravPodleCasu(4)).toBe('Dobrou noc')
  })
})
