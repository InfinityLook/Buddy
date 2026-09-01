import { describe, expect, it } from 'vitest'
import { AI_SANCE_BLOKU, AI_SANCE_SPECIALU, AI_SANCE_UTOKU, nahodnaPostava, pripravAkciAi } from '@/fighting/combat/ai'
import { vytvorBojovnika } from '@/fighting/combat/engine'
import { VSECHNY_POSTAVY } from '@/fighting/combat/postavy'

// Fronta pevných hodnot pro `nahodne` — vrací je popořadě, ať test
// řídí přesně to, co bot "vylosuje", bez skutečné náhody.
const fronta = (hodnoty: number[]): (() => number) => {
  let i = 0
  return () => hodnoty[Math.min(i++, hodnoty.length - 1)]
}

describe('pripravAkciAi — pohyb', () => {
  it('mimo dosah se pohne směrem k soupeři (soupeř vpravo)', () => {
    const ja = vytvorBojovnika(0)
    const souper = vytvorBojovnika(700)
    const vstup = pripravAkciAi(ja, souper, fronta([0.99]))
    expect(vstup.smer).toBe('vpravo')
    expect(vstup.akce).toBeNull()
    expect(vstup.blok).toBe(false)
  })

  it('mimo dosah se pohne směrem k soupeři (soupeř vlevo)', () => {
    const ja = vytvorBojovnika(700)
    const souper = vytvorBojovnika(0)
    const vstup = pripravAkciAi(ja, souper, fronta([0.99]))
    expect(vstup.smer).toBe('vlevo')
  })
})

describe('pripravAkciAi — útok', () => {
  it('v dosahu a náhoda pod prahem útoku zahájí kop', () => {
    const ja = vytvorBojovnika(0)
    const souper = vytvorBojovnika(50)
    const vstup = pripravAkciAi(ja, souper, fronta([AI_SANCE_UTOKU - 0.01, 0.99]))
    expect(vstup.akce).toBe('kop')
    expect(vstup.smer).toBeNull()
  })

  it('v dosahu, náhoda pod prahem útoku i speciálu, a dost many, zahájí speciál', () => {
    const ja = { ...vytvorBojovnika(0), mana: 100 }
    const souper = vytvorBojovnika(50)
    const vstup = pripravAkciAi(ja, souper, fronta([AI_SANCE_UTOKU - 0.01, AI_SANCE_SPECIALU - 0.01]))
    expect(vstup.akce).toBe('specialni')
  })

  it('chce speciál, ale nemá manu — spadne zpátky na kop', () => {
    const ja = { ...vytvorBojovnika(0), mana: 0 }
    const souper = vytvorBojovnika(50)
    const vstup = pripravAkciAi(ja, souper, fronta([AI_SANCE_UTOKU - 0.01, AI_SANCE_SPECIALU - 0.01]))
    expect(vstup.akce).toBe('kop')
  })

  it('v dosahu, ale náhoda nad prahem útoku — nic nedělá (žádný spam)', () => {
    const ja = vytvorBojovnika(0)
    const souper = vytvorBojovnika(50)
    const vstup = pripravAkciAi(ja, souper, fronta([AI_SANCE_UTOKU + 0.5]))
    expect(vstup.akce).toBeNull()
    expect(vstup.smer).toBeNull()
  })
})

describe('pripravAkciAi — reaktivní blok', () => {
  it('soupeř zrovna útočí a je v dosahu své akce, náhoda pod prahem bloku — zablokuje', () => {
    const ja = vytvorBojovnika(0)
    const souper = { ...vytvorBojovnika(50), utokKonci: 200, posledniAkce: 'kop' as const }
    const vstup = pripravAkciAi(ja, souper, fronta([AI_SANCE_BLOKU - 0.01]))
    expect(vstup.blok).toBe(true)
    expect(vstup.akce).toBeNull()
  })

  it('soupeř útočí, ale mimo dosah své akce — blok se vůbec nezvažuje', () => {
    const ja = vytvorBojovnika(0)
    const souper = { ...vytvorBojovnika(500), utokKonci: 200, posledniAkce: 'udar' as const }
    const vstup = pripravAkciAi(ja, souper, fronta([0]))
    expect(vstup.blok).toBe(false)
  })

  it('soupeř neútočí (utokKonci 0) — blok se nezvažuje, i když by náhoda vyšla', () => {
    const ja = vytvorBojovnika(0)
    const souper = vytvorBojovnika(50)
    const vstup = pripravAkciAi(ja, souper, fronta([0]))
    expect(vstup.blok).toBe(false)
  })
})

describe('nahodnaPostava', () => {
  it('vrátí platné id ze VSECHNY_POSTAVY', () => {
    const id = nahodnaPostava(() => 0.5)
    expect(VSECHNY_POSTAVY.map((p) => p.id)).toContain(id)
  })

  it('nahodne() === 0 vrátí první postavu, nahodne() těsně pod 1 vrátí poslední', () => {
    expect(nahodnaPostava(() => 0)).toBe(VSECHNY_POSTAVY[0].id)
    expect(nahodnaPostava(() => 0.999999)).toBe(VSECHNY_POSTAVY[VSECHNY_POSTAVY.length - 1].id)
  })
})
