import { describe, expect, it } from 'vitest'
import {
  detekujAkci,
  hpProcenta,
  manaProcenta,
  maNaSpecial,
  poziceProcenta,
  sestavVstup,
  vizualniStavBojovnika,
} from '@/fighting/combat/loop'
import { AKCE_DATA, ARENA_SIRKA, vytvorBojovnika } from '@/fighting/combat/engine'
import type { Tlacitko } from '@/fighting/types'

const PRAZDNA: Record<Tlacitko, boolean> = { udar: false, kop: false, blok: false, specialni: false }

describe('detekujAkci', () => {
  it('vrátí null, když nic nepřešlo z nedrženo na drženo', () => {
    expect(detekujAkci(PRAZDNA, PRAZDNA)).toBeNull()
  })

  it('vrátí null, když bylo tlačítko drženo už předchozí tik (ne čerstvý stisk)', () => {
    const drzeno = { ...PRAZDNA, udar: true }
    expect(detekujAkci(drzeno, drzeno)).toBeNull()
  })

  it('detekuje čerstvý stisk úderu', () => {
    expect(detekujAkci(PRAZDNA, { ...PRAZDNA, udar: true })).toBe('udar')
  })

  it('při simultánním stisku více tlačítek vrátí podle pevného pořadí (udar > kop > specialni)', () => {
    const aktualni = { ...PRAZDNA, kop: true, specialni: true }
    expect(detekujAkci(PRAZDNA, aktualni)).toBe('kop')
  })

  it('puštění tlačítka (drženo -> nedrženo) není akce', () => {
    const drzeno = { ...PRAZDNA, kop: true }
    expect(detekujAkci(drzeno, PRAZDNA)).toBeNull()
  })
})

describe('sestavVstup', () => {
  it('poskládá HracVstup se směrem, blokem a hranově detekovanou akcí', () => {
    const vstup = sestavVstup('vpravo', PRAZDNA, { ...PRAZDNA, blok: true, specialni: true })
    expect(vstup.smer).toBe('vpravo')
    expect(vstup.blok).toBe(true)
    expect(vstup.akce).toBe('specialni')
  })

  it('null směr a žádná čerstvá akce dá čistý "nic se neděje" vstup', () => {
    const drzeno = { ...PRAZDNA, blok: true }
    const vstup = sestavVstup(null, drzeno, drzeno)
    expect(vstup).toEqual({ smer: null, blok: true, akce: null })
  })
})

describe('hpProcenta / manaProcenta', () => {
  it('plné HP a plná mana dají 100 %', () => {
    const b = vytvorBojovnika(0)
    expect(hpProcenta(b)).toBe(100)
    expect(manaProcenta(b)).toBe(0) // mana startuje na nule (viz engine.ts)
  })

  it('poloviční HP dá 50 %', () => {
    const b = { ...vytvorBojovnika(0), hp: 50 }
    expect(hpProcenta(b)).toBe(50)
  })

  it('nikdy nevrátí záporné procento ani přes 100 %', () => {
    const zaporne = { ...vytvorBojovnika(0), hp: -20 }
    expect(hpProcenta(zaporne)).toBe(0)
    const pres = { ...vytvorBojovnika(0), mana: 999 }
    expect(manaProcenta(pres)).toBe(100)
  })
})

describe('poziceProcenta', () => {
  it('pozice na začátku arény je 0 %, uprostřed 50 %, na konci 100 %', () => {
    expect(poziceProcenta(vytvorBojovnika(0), ARENA_SIRKA)).toBe(0)
    expect(poziceProcenta(vytvorBojovnika(ARENA_SIRKA / 2), ARENA_SIRKA)).toBe(50)
    expect(poziceProcenta(vytvorBojovnika(ARENA_SIRKA), ARENA_SIRKA)).toBe(100)
  })
})

describe('vizualniStavBojovnika', () => {
  it('hp<=0 má přednost před vším ostatním (ko)', () => {
    const b = { ...vytvorBojovnika(0), hp: 0, zranitelnostKonci: 100, blokuje: true, utokKonci: 100 }
    expect(vizualniStavBojovnika(b)).toBe('ko')
  })

  it('hitstun má přednost před blokem', () => {
    const b = { ...vytvorBojovnika(0), zranitelnostKonci: 100, blokuje: true }
    expect(vizualniStavBojovnika(b)).toBe('hitstun')
  })

  it('blok má přednost před útokem', () => {
    const b = { ...vytvorBojovnika(0), blokuje: true, utokKonci: 100 }
    expect(vizualniStavBojovnika(b)).toBe('blok')
  })

  it('bez ničeho z výše je idle', () => {
    expect(vizualniStavBojovnika(vytvorBojovnika(0))).toBe('idle')
  })
})

describe('maNaSpecial', () => {
  it('false, když mana nestačí na cenu speciálu', () => {
    const b = { ...vytvorBojovnika(0), mana: 10 }
    expect(maNaSpecial(b, AKCE_DATA.specialni)).toBe(false)
  })

  it('true, když mana stačí přesně na cenu', () => {
    const b = { ...vytvorBojovnika(0), mana: AKCE_DATA.specialni.cenaMany }
    expect(maNaSpecial(b, AKCE_DATA.specialni)).toBe(true)
  })
})
