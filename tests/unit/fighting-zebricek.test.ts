import { describe, expect, it } from 'vitest'
import { obtiznostProVlnu } from '@/fighting/zebricek'

// ==========================================
// Dvanácté kolo vylepšení — Žebříček proti botům, křivka obtížnosti
// jako čistá funkce (viz zebricek.ts's vlastní komentář).
// ==========================================

describe('obtiznostProVlnu', () => {
  it('první tři vlny jsou lehké', () => {
    expect(obtiznostProVlnu(1)).toBe('lehka')
    expect(obtiznostProVlnu(3)).toBe('lehka')
  })

  it('vlny 4-6 jsou normální', () => {
    expect(obtiznostProVlnu(4)).toBe('normalni')
    expect(obtiznostProVlnu(6)).toBe('normalni')
  })

  it('od sedmé vlny je to těžké, a zůstává těžké i mnohem dál', () => {
    expect(obtiznostProVlnu(7)).toBe('tezka')
    expect(obtiznostProVlnu(50)).toBe('tezka')
  })
})
