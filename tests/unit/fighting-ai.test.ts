import { describe, expect, it } from 'vitest'
import {
  AI_SANCE_BLOKU,
  AI_SANCE_SPECIALU,
  AI_SANCE_UTOKU,
  nahodnaPostava,
  pripravAkciAi,
} from '@/fighting/combat/ai'
import { vytvorBojovnika } from '@/fighting/combat/engine'
import { VSECHNY_POSTAVY } from '@/fighting/combat/postavy'
import type { Pozice2D } from '@/fighting/combat/types'

// Vylepšení — volný pohyb, stejný jednoosý testovací pomocník jako
// fighting-combat.test.ts's vlastní P().
const P = (x: number): Pozice2D => ({ x, z: 400 })

// Fronta pevných hodnot pro `nahodne` — vrací je popořadě, ať test
// řídí přesně to, co bot "vylosuje", bez skutečné náhody.
const fronta = (hodnoty: number[]): (() => number) => {
  let i = 0
  return () => hodnoty[Math.min(i++, hodnoty.length - 1)]
}

describe('pripravAkciAi — pohyb', () => {
  it('mimo dosah se pohne směrem k soupeři (soupeř vpravo)', () => {
    const ja = vytvorBojovnika(P(0))
    const souper = vytvorBojovnika(P(700))
    const vstup = pripravAkciAi(ja, souper, 'normalni', fronta([0.99]))
    // Vylepšení — volný pohyb. pripravAkciAi teď vrací skutečný 2D
    // směrový vektor (smerMezi), ne diskrétní string — se stejným z u
    // obou bojovníků (viz P() výš) vyjde přesně jednotkový vektor na
    // ose x, stejný "kam by ukázalo 'vpravo'" výsledek jako dřív.
    expect(vstup.smer).toEqual({ x: 1, z: 0 })
    expect(vstup.akce).toBeNull()
    expect(vstup.blok).toBe(false)
  })

  it('mimo dosah se pohne směrem k soupeři (soupeř vlevo)', () => {
    const ja = vytvorBojovnika(P(700))
    const souper = vytvorBojovnika(P(0))
    const vstup = pripravAkciAi(ja, souper, 'normalni', fronta([0.99]))
    expect(vstup.smer).toEqual({ x: -1, z: 0 })
  })
})

describe('pripravAkciAi — útok', () => {
  it('v dosahu a náhoda pod prahem útoku zahájí kop', () => {
    const ja = vytvorBojovnika(P(0))
    const souper = vytvorBojovnika(P(50))
    const vstup = pripravAkciAi(ja, souper, 'normalni', fronta([AI_SANCE_UTOKU - 0.01, 0.99]))
    expect(vstup.akce).toBe('kop')
    expect(vstup.smer).toBeNull()
  })

  it('v dosahu, náhoda pod prahem útoku i speciálu, a dost many, zahájí speciál', () => {
    const ja = { ...vytvorBojovnika(P(0)), mana: 100 }
    const souper = vytvorBojovnika(P(50))
    const vstup = pripravAkciAi(ja, souper, 'normalni', fronta([AI_SANCE_UTOKU - 0.01, AI_SANCE_SPECIALU - 0.01]))
    expect(vstup.akce).toBe('specialni')
  })

  it('chce speciál, ale nemá manu — spadne zpátky na kop', () => {
    const ja = { ...vytvorBojovnika(P(0)), mana: 0 }
    const souper = vytvorBojovnika(P(50))
    const vstup = pripravAkciAi(ja, souper, 'normalni', fronta([AI_SANCE_UTOKU - 0.01, AI_SANCE_SPECIALU - 0.01]))
    expect(vstup.akce).toBe('kop')
  })

  it('v dosahu, ale náhoda nad prahem útoku — nic nedělá (žádný spam)', () => {
    const ja = vytvorBojovnika(P(0))
    const souper = vytvorBojovnika(P(50))
    const vstup = pripravAkciAi(ja, souper, 'normalni', fronta([AI_SANCE_UTOKU + 0.5]))
    expect(vstup.akce).toBeNull()
    expect(vstup.smer).toBeNull()
  })
})

describe('pripravAkciAi — reaktivní blok', () => {
  it('soupeř zrovna útočí a je v dosahu své akce, náhoda pod prahem bloku — zablokuje', () => {
    const ja = vytvorBojovnika(P(0))
    const souper = { ...vytvorBojovnika(P(50)), utokKonci: 200, posledniAkce: 'kop' as const }
    const vstup = pripravAkciAi(ja, souper, 'normalni', fronta([AI_SANCE_BLOKU - 0.01]))
    expect(vstup.blok).toBe(true)
    expect(vstup.akce).toBeNull()
  })

  it('soupeř útočí, ale mimo dosah své akce — blok se vůbec nezvažuje', () => {
    const ja = vytvorBojovnika(P(0))
    const souper = { ...vytvorBojovnika(P(500)), utokKonci: 200, posledniAkce: 'udar' as const }
    const vstup = pripravAkciAi(ja, souper, 'normalni', fronta([0]))
    expect(vstup.blok).toBe(false)
  })

  it('soupeř neútočí (utokKonci 0) — blok se nezvažuje, i když by náhoda vyšla', () => {
    const ja = vytvorBojovnika(P(0))
    const souper = vytvorBojovnika(P(50))
    const vstup = pripravAkciAi(ja, souper, 'normalni', fronta([0]))
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

describe('Jedenácté kolo vylepšení — obtížnost bota', () => {
  it('lehká obtížnost útočí méně ochotně než normální — stejná náhoda, jiný výsledek', () => {
    const ja = vytvorBojovnika(P(0))
    const souper = vytvorBojovnika(P(50))
    // Přesně mezi lehkou (0.6×) a normální (1×) škálou AI_SANCE_UTOKU.
    const hodnota = AI_SANCE_UTOKU * 0.8
    const naNormalni = pripravAkciAi(ja, souper, 'normalni', fronta([hodnota]))
    const naLehke = pripravAkciAi(ja, souper, 'lehka', fronta([hodnota]))
    expect(naNormalni.akce).not.toBeNull()
    expect(naLehke.akce).toBeNull()
  })

  it('těžká obtížnost blokuje ochotněji než normální', () => {
    const ja = vytvorBojovnika(P(0))
    const souper = { ...vytvorBojovnika(P(50)), utokKonci: 200, posledniAkce: 'kop' as const }
    // Mezi normální (0.5) a těžkou (0.5×1.7 = 0.85) skutečnou hranicí
    // šance na blok — appka nechce hodnotu pod OBĚMA hranicemi (viz
    // dřívější verze týhle úvahy nahoře v souboru, co tohle spletla).
    const hodnota = 0.65
    const naNormalni = pripravAkciAi(ja, souper, 'normalni', fronta([hodnota]))
    const naTezke = pripravAkciAi(ja, souper, 'tezka', fronta([hodnota]))
    expect(naNormalni.blok).toBe(false)
    expect(naTezke.blok).toBe(true)
  })

  it('výchozí obtížnost (bez třetího argumentu) je normální', () => {
    const ja = vytvorBojovnika(P(0))
    const souper = vytvorBojovnika(P(50))
    const hodnota = AI_SANCE_UTOKU - 0.01
    expect(pripravAkciAi(ja, souper, undefined, fronta([hodnota])).akce).toBe(
      pripravAkciAi(ja, souper, 'normalni', fronta([hodnota])).akce
    )
  })
})
