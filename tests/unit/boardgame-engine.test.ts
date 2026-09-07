import { describe, it, expect } from 'vitest'
import {
  vytvorHrace,
  vytvorTrhStav,
  krokHodu,
  krokPohybu,
  ukonciTah,
  aktivniHrac,
  platneSmery,
  startovniPozice,
  SIRKA_MRIZKY,
  VYSKA_MRIZKY,
  POCATECNI_PENIZE,
} from '@/boardgame/engine'

// ==========================================
// Buddyho Trh — Fáze 0. Stejná "žádný React, žádná síť, jen pravidla
// hry" disciplína jako tests/unit/fighting-combat.test.ts.
// ==========================================

const stred = { x: Math.floor(SIRKA_MRIZKY / 2), z: Math.floor(VYSKA_MRIZKY / 2) }

const noveDva = () => {
  const h1 = vytvorHrace('a', 'Anna', 'gros', false, stred)
  const h2 = vytvorHrace('b', 'Bob', 'cihla', false, { x: stred.x + 1, z: stred.z })
  return vytvorTrhStav([h1, h2])
}

describe('vytvorHrace', () => {
  it('nastaví počáteční peníze a jeBot podle argumentu', () => {
    const h = vytvorHrace('x', 'X', 'gros', true, { x: 0, z: 0 })
    expect(h.penize).toBe(POCATECNI_PENIZE)
    expect(h.jeBot).toBe(true)
  })
})

describe('startovniPozice', () => {
  it('vrátí pozici uvnitř mřížky pro libovolné pořadí', () => {
    for (let i = 0; i < 6; i++) {
      const p = startovniPozice(i, 6)
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThan(SIRKA_MRIZKY)
      expect(p.z).toBeGreaterThanOrEqual(0)
      expect(p.z).toBeLessThan(VYSKA_MRIZKY)
    }
  })
})

describe('vytvorTrhStav', () => {
  it('začíná na prvním hráči ve fázi hodu', () => {
    const stav = noveDva()
    expect(stav.aktivniIndex).toBe(0)
    expect(stav.faze).toBe('hod')
    expect(aktivniHrac(stav)?.id).toBe('a')
  })
})

describe('krokHodu', () => {
  it('hodí číslo 1–6 a přejde do fáze pohybu', () => {
    const stav = krokHodu(noveDva(), () => 0.999)
    expect(stav.posledniHod).toBe(6)
    expect(stav.zbyvaKroku).toBe(6)
    expect(stav.faze).toBe('pohyb')
  })

  it('mimo fázi hod je no-op', () => {
    const stav = krokHodu(noveDva(), () => 0.999)
    const znovu = krokHodu(stav, () => 0.1)
    expect(znovu).toBe(stav)
  })
})

describe('krokPohybu', () => {
  it('posune aktivního hráče a ubere krok', () => {
    let stav = krokHodu(noveDva(), () => 0.5) // hod 4
    const pred = aktivniHrac(stav)!.pozice
    stav = krokPohybu(stav, 'dolu')
    const po = aktivniHrac(stav)!.pozice
    expect(po).toEqual({ x: pred.x, z: pred.z + 1 })
    expect(stav.zbyvaKroku).toBe(3)
    expect(stav.faze).toBe('pohyb')
  })

  it('krok mimo mřížku se tiše zahodí, kroky se nespotřebují', () => {
    const h1 = vytvorHrace('a', 'Anna', 'gros', false, { x: 0, z: 0 })
    let stav = vytvorTrhStav([h1])
    stav = krokHodu(stav, () => 0.5)
    const zbyvaPred = stav.zbyvaKroku
    stav = krokPohybu(stav, 'nahoru') // z=0, nahoru by šlo na z=-1
    expect(aktivniHrac(stav)!.pozice).toEqual({ x: 0, z: 0 })
    expect(stav.zbyvaKroku).toBe(zbyvaPred)
  })

  it('po vyčerpání všech kroků přejde do konce tahu', () => {
    let stav = krokHodu(noveDva(), () => 0) // hod 1
    expect(stav.zbyvaKroku).toBe(1)
    stav = krokPohybu(stav, 'dolu')
    expect(stav.faze).toBe('konec-tahu')
    expect(stav.zbyvaKroku).toBe(0)
  })

  it('mimo fázi pohyb je no-op', () => {
    const stav = noveDva()
    expect(krokPohybu(stav, 'dolu')).toBe(stav)
  })
})

describe('ukonciTah', () => {
  it('posune tah na dalšího hráče a vrátí fázi na hod', () => {
    let stav = krokHodu(noveDva(), () => 0.5)
    stav = ukonciTah(stav)
    expect(stav.aktivniIndex).toBe(1)
    expect(stav.faze).toBe('hod')
    expect(stav.zbyvaKroku).toBe(0)
    expect(stav.posledniHod).toBeNull()
  })

  it('od posledního hráče se vrátí zpátky na prvního', () => {
    let stav = noveDva()
    stav = { ...krokHodu(stav, () => 0.5), aktivniIndex: 1 }
    stav = ukonciTah(stav)
    expect(stav.aktivniIndex).toBe(0)
  })

  it('lze ukončit tah dřív, i když ještě zbývají kroky', () => {
    let stav = krokHodu(noveDva(), () => 0.999) // hod 6
    stav = krokPohybu(stav, 'dolu')
    expect(stav.zbyvaKroku).toBe(5)
    stav = ukonciTah(stav)
    expect(stav.aktivniIndex).toBe(1)
    expect(stav.faze).toBe('hod')
  })

  it('ve fázi hod (ještě se nehodilo) je no-op', () => {
    const stav = noveDva()
    expect(ukonciTah(stav)).toBe(stav)
  })
})

describe('platneSmery', () => {
  it('v rohu mřížky vrátí jen dva směry', () => {
    const smery = platneSmery({ x: 0, z: 0 }, noveDva())
    expect(smery.sort()).toEqual(['dolu', 'vpravo'].sort())
  })

  it('uprostřed mřížky vrátí všechny čtyři', () => {
    const smery = platneSmery(stred, noveDva())
    expect(smery).toHaveLength(4)
  })
})
