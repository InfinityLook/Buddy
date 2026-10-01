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
import { OSUD_POLE, jeOsudovePole } from '@/boardgame/osud'
import { KOLO_STESTI_POLE, jeKoloStestiPole } from '@/boardgame/kolostesti'
import { OBCHODY, klicPole } from '@/boardgame/obchody'
import { UDALOSTI } from '@/boardgame/data/udalosti'
import { VYSLEDKY_KOLA, vyberVysledekKola, stredovyUhelVysledku, conicGradientKola } from '@/boardgame/data/kolaStesti'

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

// ==========================================
// Fáze 2 — karty událostí (Osud). (0,0), (5,3) atd. jsou "Osud" pole
// podle src/boardgame/osud.ts — testy staví hráče tak, ať na ně
// doopravdy doběhnou, a druhý injektovaný `nahodne` argument
// krokPohybu vybere konkrétní kartu z UDALOSTI (viz index níž).
// ==========================================

describe('Osud pole — sanity (Fáze 2)', () => {
  it('se nikdy nepřekrývají s obchody', () => {
    const obchodKlice = new Set(OBCHODY.map((o) => o.klic))
    for (const p of OSUD_POLE) {
      expect(obchodKlice.has(klicPole(p))).toBe(false)
    }
  })

  it('jeOsudovePole pozná jen šest skutečných pozic', () => {
    for (const p of OSUD_POLE) expect(jeOsudovePole(p)).toBe(true)
    expect(jeOsudovePole({ x: 3, z: 3 })).toBe(false)
  })
})

describe('UDALOSTI — pevná sada karet (Fáze 2)', () => {
  it('má přesně 12 karet s unikátními id a všemi třemi typy efektu', () => {
    expect(UDALOSTI).toHaveLength(12)
    expect(new Set(UDALOSTI.map((u) => u.id)).size).toBe(12)
    expect(UDALOSTI.filter((u) => u.efekt.typ === 'penize').length).toBeGreaterThan(0)
    expect(UDALOSTI.filter((u) => u.efekt.typ === 'posun').length).toBeGreaterThan(0)
    expect(UDALOSTI.filter((u) => u.efekt.typ === 'preskoc-tah').length).toBeGreaterThan(0)
  })
})

describe('krokPohybu — vytažení karty na Osud poli (Fáze 2)', () => {
  it('doběhnutí na Osud pole vytáhne kartu a vyhodnotí peněžní efekt', () => {
    const h1 = vytvorHrace('a', 'Anna', 'gros', false, { x: 1, z: 0 })
    let stav = vytvorTrhStav([h1])
    stav = krokHodu(stav, () => 0) // hod 1
    stav = krokPohybu(stav, 'vlevo', () => 0) // (1,0) -> (0,0), karta index 0: +80 Kč
    expect(aktivniHrac(stav)!.penize).toBe(POCATECNI_PENIZE + 80)
    expect(stav.posledniUdalost).toContain('🔮')
    expect(stav.posledniUdalost).toContain('Výhodný nákup')
    expect(stav.nabidkaKoupe).toBeNull()
  })

  it('peněžní efekt nikdy nesrazí hráče pod 0 Kč', () => {
    const h1 = { ...vytvorHrace('a', 'Anna', 'gros', false, { x: 1, z: 0 }), penize: 20 }
    let stav = vytvorTrhStav([h1])
    stav = krokHodu(stav, () => 0)
    stav = krokPohybu(stav, 'vlevo', () => 0.3) // karta index 3 (zamecnik): -60 Kč
    expect(aktivniHrac(stav)!.penize).toBe(0)
  })

  it('posun efekt se zastaví na okraji mřížky, nepřeteče', () => {
    const h1 = vytvorHrace('a', 'Anna', 'gros', false, { x: 4, z: 3 })
    let stav = vytvorTrhStav([h1])
    stav = krokHodu(stav, () => 0) // hod 1
    stav = krokPohybu(stav, 'vpravo', () => 0.45) // (4,3) -> (5,3), karta index 5: posun vpravo 2
    // (5,3) -> (6,3) jde, (6,3) -> (7,3) je mimo mřížku (SIRKA_MRIZKY=7), zastaví se na (6,3)
    expect(aktivniHrac(stav)!.pozice).toEqual({ x: 6, z: 3 })
  })

  it('karta "přeskoč tah" nastaví příznak, krokHodu ho na příštím tahu spotřebuje', () => {
    const h1 = vytvorHrace('a', 'Anna', 'gros', false, { x: 1, z: 0 })
    let stav = vytvorTrhStav([h1])
    stav = krokHodu(stav, () => 0)
    stav = krokPohybu(stav, 'vlevo', () => 0.76) // karta index 9 (nachlazeni): přeskoč tah
    expect(aktivniHrac(stav)!.preskociTah).toBe(true)
    expect(stav.faze).toBe('konec-tahu')

    stav = ukonciTah(stav) // jediný hráč -> tah se vrátí zpátky na Annu, fáze 'hod'
    expect(stav.faze).toBe('hod')
    expect(aktivniHrac(stav)!.preskociTah).toBe(true)

    stav = krokHodu(stav) // teď by se mělo tahu vzdát, ne hodit kostkou
    expect(stav.posledniHod).toBeNull()
    expect(aktivniHrac(stav)!.preskociTah).toBe(false)
    expect(stav.posledniUdalost).toContain('vynechává tah')
  })

  it('krokHodu přeskočí tah hráče s preskociTah a posune tah na dalšího hráče', () => {
    const h1 = { ...vytvorHrace('a', 'Anna', 'gros', false, { x: 0, z: 1 }), preskociTah: true }
    const h2 = vytvorHrace('b', 'Bob', 'cihla', false, { x: 6, z: 6 })
    let stav = vytvorTrhStav([h1, h2])
    stav = krokHodu(stav)
    expect(stav.faze).toBe('hod')
    expect(stav.aktivniIndex).toBe(1)
    expect(stav.hraci.find((h) => h.id === 'a')!.preskociTah).toBe(false)
  })
})

// ==========================================
// Fáze 3 — kolo štěstí. Jediné pole {3,3} (přesný střed 7×7 mřížky) —
// testy staví hráče na {2,3} (sousední, prázdné pole) a hází kostkou
// tak, ať na kolo doopravdy dojdou (hod 1 = jeden krok vpravo). Druhý
// injektovaný `nahodne` argument krokPohybu vybere konkrétní výsledek
// z VYSLEDKY_KOLA (viz přesné hranice vah v komentáři u testů níž).
// ==========================================

describe('Kolo štěstí pole — sanity (Fáze 3)', () => {
  it('se nekryje s žádným obchodem ani Osud polem', () => {
    const obchodKlice = new Set(OBCHODY.map((o) => o.klic))
    expect(obchodKlice.has(klicPole(KOLO_STESTI_POLE))).toBe(false)
    expect(jeOsudovePole(KOLO_STESTI_POLE)).toBe(false)
  })

  it('jeKoloStestiPole pozná jen tu jednu pozici', () => {
    expect(jeKoloStestiPole(KOLO_STESTI_POLE)).toBe(true)
    expect(jeKoloStestiPole({ x: 2, z: 3 })).toBe(false)
    expect(jeKoloStestiPole({ x: 0, z: 0 })).toBe(false)
  })
})

describe('VYSLEDKY_KOLA — pevná sada výsledků (Fáze 3)', () => {
  it('má sedm výsledků s unikátními id, kladnými vahami a všemi třemi typy efektu', () => {
    expect(VYSLEDKY_KOLA).toHaveLength(7)
    expect(new Set(VYSLEDKY_KOLA.map((v) => v.id)).size).toBe(7)
    for (const v of VYSLEDKY_KOLA) expect(v.vaha).toBeGreaterThan(0)
    expect(VYSLEDKY_KOLA.filter((v) => v.efekt.typ === 'penize').length).toBeGreaterThan(0)
    expect(VYSLEDKY_KOLA.filter((v) => v.efekt.typ === 'bonusovy-hod').length).toBeGreaterThan(0)
    expect(VYSLEDKY_KOLA.filter((v) => v.efekt.typ === 'nic').length).toBeGreaterThan(0)
  })
})

describe('vyberVysledekKola — vážená náhoda (Fáze 3)', () => {
  // Celková váha je 21 (1+2+4+3+5+4+2); hranice segmentů v kumulativních
  // vahách jsou 1, 3, 7, 10, 15, 19, 21 — každý test volí nahodne() těsně
  // uvnitř příslušného rozsahu.
  it.each([
    [0, 'jackpot'],
    [0.1, 'velka-vyhra'],
    [0.2, 'mala-vyhra'],
    [0.4, 'bonus-hod'],
    [0.6, 'nic'],
    [0.8, 'mala-smula'],
    [0.95, 'velka-smula'],
  ])('nahodne() = %s vybere výsledek %s', (hod, ocekavaneId) => {
    expect(vyberVysledekKola(() => hod).id).toBe(ocekavaneId)
  })
})

describe('stredovyUhelVysledku a conicGradientKola (Fáze 3)', () => {
  it('vrátí úhel mezi 0 a 360 pro každý skutečný výsledek', () => {
    for (const v of VYSLEDKY_KOLA) {
      const uhel = stredovyUhelVysledku(v.id)
      expect(uhel).toBeGreaterThanOrEqual(0)
      expect(uhel).toBeLessThan(360)
    }
  })

  it('pro neznámé id vrátí 0', () => {
    expect(stredovyUhelVysledku('neexistuje')).toBe(0)
  })

  it('conicGradientKola sestaví platný CSS gradient se všemi barvami', () => {
    const gradient = conicGradientKola()
    expect(gradient).toMatch(/^conic-gradient\(/)
    for (const v of VYSLEDKY_KOLA) expect(gradient).toContain(v.barva)
  })
})

describe('krokPohybu — vytažení výsledku kola štěstí (Fáze 3)', () => {
  it('doběhnutí na kolo štěstí vyhodnotí peněžní efekt', () => {
    const h1 = vytvorHrace('a', 'Anna', 'gros', false, { x: 2, z: 3 })
    let stav = vytvorTrhStav([h1])
    stav = krokHodu(stav, () => 0) // hod 1
    stav = krokPohybu(stav, 'vpravo', () => 0.1) // (2,3) -> (3,3), výsledek index 1: velka-vyhra +150
    expect(aktivniHrac(stav)!.penize).toBe(POCATECNI_PENIZE + 150)
    expect(stav.posledniUdalost).toContain('🎡')
    expect(stav.posledniUdalost).toContain('Velká výhra')
    expect(stav.posledniVysledekKolaId).toBe('velka-vyhra')
    expect(stav.kolostestiPocet).toBe(1)
    expect(stav.nabidkaKoupe).toBeNull()
  })

  it('"nic" výsledek nezmění peníze, jen zaznamená událost', () => {
    const h1 = vytvorHrace('a', 'Anna', 'gros', false, { x: 2, z: 3 })
    let stav = vytvorTrhStav([h1])
    stav = krokHodu(stav, () => 0)
    stav = krokPohybu(stav, 'vpravo', () => 0.6) // index 4: nic
    expect(aktivniHrac(stav)!.penize).toBe(POCATECNI_PENIZE)
    expect(stav.posledniVysledekKolaId).toBe('nic')
    expect(stav.kolostestiPocet).toBe(1)
  })

  it('"bonusový hod" nastaví vlajku maBonusovyHod, ukonciTah ji hned spotřebuje a nepostoupí index', () => {
    const h1 = vytvorHrace('a', 'Anna', 'gros', false, { x: 2, z: 3 })
    const h2 = vytvorHrace('b', 'Bob', 'cihla', false, { x: 6, z: 6 })
    let stav = vytvorTrhStav([h1, h2])
    stav = krokHodu(stav, () => 0)
    stav = krokPohybu(stav, 'vpravo', () => 0.4) // index 3: bonusovy-hod
    expect(aktivniHrac(stav)!.maBonusovyHod).toBe(true)
    expect(stav.faze).toBe('konec-tahu')

    stav = ukonciTah(stav)
    expect(stav.aktivniIndex).toBe(0) // zůstává na Anně, nepostoupí na Boba
    expect(stav.faze).toBe('hod')
    expect(aktivniHrac(stav)!.maBonusovyHod).toBe(false)
  })

  it('normální hráč (bez maBonusovyHod) se v ukonciTah chová jako dřív — postoupí index', () => {
    let stav = noveDva()
    stav = krokHodu(stav, () => 0.5)
    expect(aktivniHrac(stav)!.maBonusovyHod).toBe(false)
    stav = ukonciTah(stav)
    expect(stav.aktivniIndex).toBe(1)
    expect(stav.faze).toBe('hod')
  })

  it('dvouhráčová scéna: hráč A odehraje bonusový hod, teprve pak ukonciTah předá tah hráči B', () => {
    const h1 = vytvorHrace('a', 'Anna', 'gros', false, { x: 2, z: 3 })
    const h2 = vytvorHrace('b', 'Bob', 'cihla', false, { x: 6, z: 6 })
    let stav = vytvorTrhStav([h1, h2])

    stav = krokHodu(stav, () => 0)
    stav = krokPohybu(stav, 'vpravo', () => 0.4) // Anna doběhne na kolo štěstí, bonusový hod
    stav = ukonciTah(stav)
    expect(stav.aktivniIndex).toBe(0)
    expect(stav.faze).toBe('hod')

    // Anna hraje svůj bonusový hod — tentokrát na obyčejné pole, žádná
    // další událost.
    stav = krokHodu(stav, () => 0)
    stav = krokPohybu(stav, 'vlevo') // (3,3) -> (2,3), obyčejné pole
    expect(stav.faze).toBe('konec-tahu')
    expect(stav.nabidkaKoupe).toBeNull()
    expect(aktivniHrac(stav)!.maBonusovyHod).toBe(false)

    stav = ukonciTah(stav)
    expect(stav.aktivniIndex).toBe(1) // teprve teď se tah doopravdy předá Bobovi
  })
})
