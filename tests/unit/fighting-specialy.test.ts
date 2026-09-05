import { describe, expect, it } from 'vitest'
import {
  AKCE_DATA,
  BLOK_REDUKCE,
  KOMBO_BONUS_ZA_UDER,
  MANA_ZA_ZASAH,
  MAX_HP,
  PARRY_OKNO_MS,
  efektivniAkceData,
  krokSouboje,
  vytvorSoubojStav,
} from '@/fighting/combat/engine'
import { POSTAVY } from '@/fighting/combat/postavy'
import type { HracVstup } from '@/fighting/combat/types'

// ==========================================
// Vylepšení — čtyři vlastní efekty speciálu (postavy.ts's TypSpecialu),
// místo dřívějšího "speciál je jen silnější úder se stejným tvarem
// pro všechny". Stejná disciplína jako Fáze 1/2 vlastních testů:
// čisté funkce, žádný browser, deterministické (Math.random() se
// enginu pořád netýká).
// ==========================================

const stat: HracVstup = { smer: null, blok: false, akce: null }
const plnaMana: HracVstup = { ...stat, akce: 'specialni' }

describe('Pyřin speciál — bonus poškození (poskozeni)', () => {
  it('efektivniAkceData dá speciálu navíc specialniSila násobič, ale jen speciálu', () => {
    const specialni = efektivniAkceData('pyra', 'specialni')
    const ocekavane = AKCE_DATA.specialni.poskozeni * POSTAVY.pyra.poskozeniNasobic * POSTAVY.pyra.specialniSila
    expect(specialni.poskozeni).toBeCloseTo(ocekavane)

    const udar = efektivniAkceData('pyra', 'udar')
    expect(udar.poskozeni).toBeCloseTo(AKCE_DATA.udar.poskozeni * POSTAVY.pyra.poskozeniNasobic)
  })

  it('Pyřin speciál dá v boji reálně víc poškození než neutrální postava', () => {
    let stav = vytvorSoubojStav(0, 80, 'pyra', 'onyx')
    stav.hraci[0] = { ...stav.hraci[0], mana: 100 }
    stav = krokSouboje(stav, [plnaMana, stat], 0)
    const poskozeniPyra = MAX_HP - stav.hraci[1].hp

    let stavNeutral = vytvorSoubojStav(0, 80, 'onyx', 'onyx')
    stavNeutral.hraci[0] = { ...stavNeutral.hraci[0], mana: 100 }
    stavNeutral = krokSouboje(stavNeutral, [plnaMana, stat], 0)
    const poskozeniNeutral = MAX_HP - stavNeutral.hraci[1].hp

    expect(poskozeniPyra).toBeGreaterThan(poskozeniNeutral)
  })
})

describe('Bulwarkův speciál — štít (stit)', () => {
  it('zahájení speciálu udělí štít i bez zásahu (mimo dosah)', () => {
    let stav = vytvorSoubojStav(0, 780, 'bulwark', 'onyx') // daleko mimo dosah speciálu
    stav.hraci[0] = { ...stav.hraci[0], mana: 100 }
    stav = krokSouboje(stav, [plnaMana, stat], 0)
    expect(stav.hraci[0].stitAktivni).toBe(true)
    expect(stav.hraci[1].hp).toBe(stav.hraci[1].maxHp) // netrefil se
  })

  it('štít pohltí další zásah úplně (nulové poškození, žádný hitstun) a spotřebuje se', () => {
    let stav = vytvorSoubojStav(0, 80, 'bulwark', 'onyx')
    stav.hraci[0] = { ...stav.hraci[0], stitAktivni: true }
    const hpPred = stav.hraci[0].hp

    stav = krokSouboje(stav, [stat, { ...stat, akce: 'udar' }], 0)

    expect(stav.hraci[0].hp).toBe(hpPred)
    expect(stav.hraci[0].zranitelnostKonci).toBe(0)
    expect(stav.hraci[0].stitAktivni).toBe(false)
  })

  it('po spotřebování štítu už další zásah dopadne normálně', () => {
    let stav = vytvorSoubojStav(0, 80, 'bulwark', 'onyx')
    stav.hraci[0] = { ...stav.hraci[0], stitAktivni: false }
    stav = krokSouboje(stav, [stat, { ...stat, akce: 'udar' }], 0)
    const ocekavane = AKCE_DATA.udar.poskozeni * POSTAVY.bulwark.obranaNasobic
    expect(stav.hraci[0].hp).toBeCloseTo(stav.hraci[0].maxHp - ocekavane)
  })
})

describe('Voltův speciál — dvojitý zásah (dvojity-zasah)', () => {
  it('landne-li speciál, druhý zásah dostane kombo bonus z prvního (Druhé kolo vylepšení), mana je čistý dvojnásobek', () => {
    let stav = vytvorSoubojStav(0, 80, 'volt', 'onyx')
    stav.hraci[0] = { ...stav.hraci[0], mana: 100 }
    const manaPredUtokem = 100 - AKCE_DATA.specialni.cenaMany * POSTAVY.volt.cenaManyNasobic

    stav = krokSouboje(stav, [plnaMana, stat], 0)

    // Oba zásahy sdílejí stejný poskozeniZaklad, ale druhý už vidí
    // útočníkovo kombo navýšené prvním (viz engine.ts's
    // aplikujJedenZasah) — 1. zásah bez bonusu, 2. s +KOMBO_BONUS_ZA_UDER.
    const jedenZasah = efektivniAkceData('volt', 'specialni').poskozeni * POSTAVY.onyx.obranaNasobic
    expect(MAX_HP - stav.hraci[1].hp).toBeCloseTo(jedenZasah * (2 + KOMBO_BONUS_ZA_UDER))
    expect(stav.hraci[0].mana).toBeCloseTo(manaPredUtokem + MANA_ZA_ZASAH * 2)
    expect(stav.hraci[0].komboPocet).toBe(2)
  })

  it('štít cíle pohltí jen první z obou zásahů, druhý projde normálně', () => {
    let stav = vytvorSoubojStav(0, 80, 'volt', 'onyx')
    stav.hraci[0] = { ...stav.hraci[0], mana: 100 }
    stav.hraci[1] = { ...stav.hraci[1], stitAktivni: true }

    stav = krokSouboje(stav, [plnaMana, stat], 0)

    const jedenZasah = efektivniAkceData('volt', 'specialni').poskozeni * POSTAVY.onyx.obranaNasobic
    expect(MAX_HP - stav.hraci[1].hp).toBeCloseTo(jedenZasah) // jen jeden ze dvou prošel
    expect(stav.hraci[1].stitAktivni).toBe(false)
  })
})

describe('Onyxův speciál — vysátí (vysati)', () => {
  it('vyléčí útočníka o specialniSila podíl skutečně způsobeného poškození', () => {
    let stav = vytvorSoubojStav(0, 80, 'onyx', 'bulwark')
    stav.hraci[0] = { ...stav.hraci[0], mana: 100, hp: 40 }
    const maxHpCile = stav.hraci[1].maxHp // Bulwark má maxHpNasobic 1.25, ne 100

    stav = krokSouboje(stav, [plnaMana, stat], 0)

    const poskozeni = maxHpCile - stav.hraci[1].hp // co doopravdy dostal cíl
    expect(stav.hraci[0].hp).toBeCloseTo(40 + poskozeni * POSTAVY.onyx.specialniSila)
  })

  it('vysátí nepřeteče přes maxHp', () => {
    let stav = vytvorSoubojStav(0, 80, 'onyx', 'onyx')
    stav.hraci[0] = { ...stav.hraci[0], mana: 100, hp: stav.hraci[0].maxHp - 1 }

    stav = krokSouboje(stav, [plnaMana, stat], 0)

    expect(stav.hraci[0].hp).toBe(stav.hraci[0].maxHp)
  })

  it('blokovaný speciál vysaje jen tolik, kolik po bloku doopravdy prošlo', () => {
    let stav = vytvorSoubojStav(0, 80, 'onyx', 'onyx')
    stav.hraci[0] = { ...stav.hraci[0], mana: 100, hp: 40 }

    // Vylepšení — parry: obránce musí blok držet už DŘÍV, mimo parry
    // okno (fighting-combat.test.ts's vlastní sekce), jinak by šlo o
    // perfektní blok s nulovým poškozením, a test by nezměřil to, co
    // chce (obyčejné vysátí po zeslabeném zásahu).
    stav = krokSouboje(stav, [stat, { ...stat, blok: true }], 0)
    stav = krokSouboje(stav, [stat, { ...stat, blok: true }], PARRY_OKNO_MS + 50)
    stav = krokSouboje(stav, [plnaMana, { ...stat, blok: true }], 0)

    const poskozeni = 100 - stav.hraci[1].hp
    expect(poskozeni).toBeCloseTo(efektivniAkceData('onyx', 'specialni').poskozeni * (1 - BLOK_REDUKCE))
    expect(stav.hraci[0].hp).toBeCloseTo(40 + poskozeni * POSTAVY.onyx.specialniSila)
  })
})
