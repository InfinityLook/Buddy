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
  koupitPole,
  odmitnoutKoupi,
  zkontrolujCas,
  vitezovePodleStavu,
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

// ==========================================
// Fáze 1 — obchody, nájem a časový limit. (1,1) je "Pekárna"
// (cena 150, nájem 20) podle src/boardgame/obchody.ts — testy staví
// hráče vždy jedno pole od ní a hází kostkou tak, ať na ni doopravdy
// dojdou (hod 1 = jeden krok).
// ==========================================

describe('koupitPole a odmitnoutKoupi (Fáze 1 — obchody)', () => {
  it('doběhnutí na neprodané pole otevře nabídku koupě', () => {
    const h1 = vytvorHrace('a', 'Anna', 'gros', false, { x: 0, z: 1 })
    let stav = vytvorTrhStav([h1])
    stav = krokPohybu(krokHodu(stav, () => 0), 'vpravo') // (0,1) -> (1,1)
    expect(stav.faze).toBe('konec-tahu')
    expect(stav.nabidkaKoupe).toBe('1,1')
  })

  it('koupě strhne cenu a zapíše vlastnictví', () => {
    const h1 = vytvorHrace('a', 'Anna', 'gros', false, { x: 0, z: 1 })
    let stav = vytvorTrhStav([h1])
    stav = krokPohybu(krokHodu(stav, () => 0), 'vpravo')
    stav = koupitPole(stav)
    expect(stav.vlastnictvi['1,1']).toBe('a')
    expect(aktivniHrac(stav)!.penize).toBe(POCATECNI_PENIZE - 150)
    expect(stav.nabidkaKoupe).toBeNull()
  })

  it('koupě bez dostatku peněz je no-op', () => {
    const h1 = { ...vytvorHrace('a', 'Anna', 'gros', false, { x: 0, z: 1 }), penize: 50 }
    let stav = vytvorTrhStav([h1])
    stav = krokPohybu(krokHodu(stav, () => 0), 'vpravo')
    const pred = stav
    stav = koupitPole(stav)
    expect(stav).toBe(pred)
  })

  it('odmítnutí koupě uvolní nabídku, obchod zůstává bance', () => {
    const h1 = vytvorHrace('a', 'Anna', 'gros', false, { x: 0, z: 1 })
    let stav = vytvorTrhStav([h1])
    stav = krokPohybu(krokHodu(stav, () => 0), 'vpravo')
    stav = odmitnoutKoupi(stav)
    expect(stav.nabidkaKoupe).toBeNull()
    expect(stav.vlastnictvi['1,1']).toBeUndefined()
  })

  it('ukonciTah odmítne, dokud čeká nabídka koupě', () => {
    const h1 = vytvorHrace('a', 'Anna', 'gros', false, { x: 0, z: 1 })
    const h2 = vytvorHrace('b', 'Bob', 'cihla', false, { x: 6, z: 6 })
    let stav = vytvorTrhStav([h1, h2])
    stav = krokPohybu(krokHodu(stav, () => 0), 'vpravo')
    expect(stav.nabidkaKoupe).toBe('1,1')
    const pred = stav
    stav = ukonciTah(stav)
    expect(stav).toBe(pred)
  })
})

describe('nájem (Fáze 1)', () => {
  it('doběhnutí na cizí obchod strhne nájem ve prospěch majitele', () => {
    const h1 = vytvorHrace('a', 'Anna', 'gros', false, { x: 0, z: 1 })
    const h2 = vytvorHrace('b', 'Bob', 'cihla', false, { x: 2, z: 1 })
    let stav = vytvorTrhStav([h1, h2])

    stav = koupitPole(krokPohybu(krokHodu(stav, () => 0), 'vpravo')) // Anna koupí Pekárnu
    expect(stav.vlastnictvi['1,1']).toBe('a')
    stav = ukonciTah(stav) // na tahu Bob

    stav = krokPohybu(krokHodu(stav, () => 0), 'vlevo') // (2,1) -> (1,1), Bobův tah

    const anna = stav.hraci.find((h) => h.id === 'a')!
    const bob = stav.hraci.find((h) => h.id === 'b')!
    expect(bob.penize).toBe(POCATECNI_PENIZE - 20)
    expect(anna.penize).toBe(POCATECNI_PENIZE - 150 + 20)
    expect(stav.nabidkaKoupe).toBeNull()
  })

  it('doběhnutí na vlastní obchod nic neúčtuje', () => {
    const h1 = vytvorHrace('a', 'Anna', 'gros', false, { x: 0, z: 1 })
    let stav = vytvorTrhStav([h1])
    stav = koupitPole(krokPohybu(krokHodu(stav, () => 0), 'vpravo')) // koupě (0,1)->(1,1)
    stav = ukonciTah(stav) // jediný hráč, tah se vrátí zpátky na Annu
    stav = krokPohybu(krokHodu(stav, () => 0), 'vlevo') // (1,1) -> (0,1)
    stav = ukonciTah(stav)
    stav = krokPohybu(krokHodu(stav, () => 0), 'vpravo') // (0,1) -> (1,1), vlastní pole

    expect(aktivniHrac(stav)!.penize).toBe(POCATECNI_PENIZE - 150)
    expect(stav.nabidkaKoupe).toBeNull()
  })
})

describe('zkontrolujCas a vitezovePodleStavu (Fáze 1 — časový limit)', () => {
  it('před vypršením limitu je no-op', () => {
    const stav = noveDva()
    const znovu = zkontrolujCas(stav, stav.konecCasuMs - 1000)
    expect(znovu).toBe(stav)
  })

  it('po vypršení limitu ukončí hru', () => {
    const stav = noveDva()
    const znovu = zkontrolujCas(stav, stav.konecCasuMs + 1)
    expect(znovu.konec).toBe(true)
  })

  it('po konci hry je no-op', () => {
    let stav = noveDva()
    stav = zkontrolujCas(stav, stav.konecCasuMs + 1)
    const znovu = zkontrolujCas(stav, stav.konecCasuMs + 5000)
    expect(znovu).toBe(stav)
  })

  it('vrátí hráče s nejvíc penězi', () => {
    const h1 = { ...vytvorHrace('a', 'Anna', 'gros', false, stred), penize: 1200 }
    const h2 = vytvorHrace('b', 'Bob', 'cihla', false, { x: stred.x + 1, z: stred.z })
    const stav = vytvorTrhStav([h1, h2])
    const vitezove = vitezovePodleStavu(stav)
    expect(vitezove).toHaveLength(1)
    expect(vitezove[0].id).toBe('a')
  })

  it('remíza vrátí víc hráčů', () => {
    const stav = noveDva()
    const vitezove = vitezovePodleStavu(stav)
    expect(vitezove).toHaveLength(2)
  })
})
