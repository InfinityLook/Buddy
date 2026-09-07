import { describe, expect, it } from 'vitest'
import {
  AKCE_DATA,
  BLOK_REDUKCE,
  MAX_HP,
  PARRY_OKNO_MS,
  RYCHLOST_POHYBU,
  efektivniAkceData,
  krokSouboje,
  vytvorBojovnika,
  vytvorSoubojStav,
} from '@/fighting/combat/engine'
import { POSTAVY, VSECHNY_POSTAVY, VYCHOZI_POSTAVA } from '@/fighting/combat/postavy'
import type { HracVstup, Pozice2D } from '@/fighting/combat/types'

// Vylepšení — volný pohyb, stejný jednoosý testovací pomocník jako
// fighting-combat.test.ts's vlastní P().
const P = (x: number): Pozice2D => ({ x, z: 400 })

const stat: HracVstup = { smer: null, blok: false, akce: null }

describe('POSTAVY (Fáze 2)', () => {
  it('má přesně čtyři postavy, žádná z nich RPG hrdiny', () => {
    expect(VSECHNY_POSTAVY).toHaveLength(4)
    const ids = VSECHNY_POSTAVY.map((p) => p.id).sort()
    expect(ids).toEqual(['bulwark', 'onyx', 'pyra', 'volt'])
  })

  it('výchozí postava (Onyx) má neutrální násobiče kromě dosahu', () => {
    const onyx = POSTAVY[VYCHOZI_POSTAVA]
    expect(onyx.maxHpNasobic).toBe(1)
    expect(onyx.rychlostNasobic).toBe(1)
    expect(onyx.poskozeniNasobic).toBe(1)
    expect(onyx.obranaNasobic).toBe(1)
    expect(onyx.cenaManyNasobic).toBe(1)
    expect(onyx.dosahNasobic).not.toBe(1) // dlouhý dosah je jeho jediný styl
  })
})

describe('efektivniAkceData', () => {
  it('u výchozí postavy vrátí přesně základní čísla akce (kromě dosahu)', () => {
    const data = efektivniAkceData(VYCHOZI_POSTAVA, 'kop')
    expect(data.poskozeni).toBe(AKCE_DATA.kop.poskozeni)
    expect(data.trvaniMs).toBe(AKCE_DATA.kop.trvaniMs)
    expect(data.cenaMany).toBe(AKCE_DATA.kop.cenaMany)
  })

  it('u Volta zkrátí trvání akce a zlevní speciál podle jeho násobičů', () => {
    const data = efektivniAkceData('volt', 'specialni')
    expect(data.trvaniMs).toBeCloseTo(AKCE_DATA.specialni.trvaniMs / POSTAVY.volt.rychlostNasobic)
    expect(data.cenaMany).toBeCloseTo(AKCE_DATA.specialni.cenaMany * POSTAVY.volt.cenaManyNasobic)
    expect(data.trvaniMs).toBeLessThan(AKCE_DATA.specialni.trvaniMs)
    expect(data.cenaMany).toBeLessThan(AKCE_DATA.specialni.cenaMany)
  })
})

describe('vytvorBojovnika s postavou', () => {
  it('Bulwark má vyšší maximální HP než výchozí postava', () => {
    const bulwark = vytvorBojovnika(P(0), 'bulwark')
    const onyx = vytvorBojovnika(P(0))
    expect(bulwark.maxHp).toBeGreaterThan(onyx.maxHp)
    expect(bulwark.hp).toBe(bulwark.maxHp)
    expect(bulwark.postavaId).toBe('bulwark')
  })

  it('Pyra má nižší maximální HP než výchozí postava', () => {
    const pyra = vytvorBojovnika(P(0), 'pyra')
    const onyx = vytvorBojovnika(P(0))
    expect(pyra.maxHp).toBeLessThan(onyx.maxHp)
  })
})

describe('rozdílné styly hry v reálném souboji', () => {
  it('Bulwarkova obrana sníží přijaté poškození oproti neutrální postavě', () => {
    let stavBulwark = vytvorSoubojStav(P(0), P(80), 'onyx', 'bulwark')
    const maxHpBulwark = stavBulwark.hraci[1].maxHp
    stavBulwark = krokSouboje(stavBulwark, [{ ...stat, akce: 'udar' }, stat], 0)
    const poskozeniBulwark = maxHpBulwark - stavBulwark.hraci[1].hp

    let stavOnyx = vytvorSoubojStav(P(0), P(80), 'onyx', 'onyx')
    stavOnyx = krokSouboje(stavOnyx, [{ ...stat, akce: 'udar' }, stat], 0)
    const poskozeniOnyx = MAX_HP - stavOnyx.hraci[1].hp

    expect(poskozeniBulwark).toBeLessThan(poskozeniOnyx)
    expect(poskozeniBulwark).toBeCloseTo(AKCE_DATA.udar.poskozeni * POSTAVY.bulwark.obranaNasobic)
  })

  it('Pyřin úder dá víc poškození než neutrální postavy stejný úder', () => {
    let stavPyra = vytvorSoubojStav(P(0), P(80), 'pyra', 'onyx')
    stavPyra = krokSouboje(stavPyra, [{ ...stat, akce: 'udar' }, stat], 0)
    const poskozeniPyra = MAX_HP - stavPyra.hraci[1].hp

    let stavOnyx = vytvorSoubojStav(P(0), P(80), 'onyx', 'onyx')
    stavOnyx = krokSouboje(stavOnyx, [{ ...stat, akce: 'udar' }, stat], 0)
    const poskozeniOnyx = MAX_HP - stavOnyx.hraci[1].hp

    expect(poskozeniPyra).toBeGreaterThan(poskozeniOnyx)
  })

  it('blok a postavina obrana se kombinují (obrana nejdřív, blok navrch)', () => {
    let stav = vytvorSoubojStav(P(0), P(80), 'onyx', 'bulwark')
    const maxHpBulwark = stav.hraci[1].maxHp
    // Vylepšení — parry: blok, co za útokem nezaostává, je "perfektní"
    // (nulové poškození, viz fighting-combat.test.ts's vlastní sekce),
    // ne obyčejný — appka tu proto obránce nechá blok držet už DŘÍV,
    // mimo parry okno, ať tenhle test doopravdy měří obyčejné
    // obrana×blok skládání, ne parry.
    stav = krokSouboje(stav, [stat, { ...stat, blok: true }], 0)
    stav = krokSouboje(stav, [stat, { ...stat, blok: true }], PARRY_OKNO_MS + 50)
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, { ...stat, blok: true }], 0)
    const ocekavane = AKCE_DATA.udar.poskozeni * POSTAVY.bulwark.obranaNasobic * (1 - BLOK_REDUKCE)
    expect(stav.hraci[1].hp).toBeCloseTo(maxHpBulwark - ocekavane)
  })

  it('Volt se pohybuje rychleji než neutrální postava za stejný čas', () => {
    let stavVolt = vytvorSoubojStav(P(400), P(700), 'volt', 'onyx')
    stavVolt = krokSouboje(stavVolt, [{ ...stat, smer: { x: 1, z: 0 } }, stat], 500)
    const posunVolt = stavVolt.hraci[0].pozice.x - 400

    let stavOnyx = vytvorSoubojStav(P(400), P(700), 'onyx', 'onyx')
    stavOnyx = krokSouboje(stavOnyx, [{ ...stat, smer: { x: 1, z: 0 } }, stat], 500)
    const posunOnyx = stavOnyx.hraci[0].pozice.x - 400

    expect(posunVolt).toBeGreaterThan(posunOnyx)
    expect(posunVolt).toBeCloseTo((RYCHLOST_POHYBU * POSTAVY.volt.rychlostNasobic * 500) / 1000)
  })

  it('Volt se ze svého útoku zotaví dřív než neutrální postava (kratší cooldown)', () => {
    let stavVolt = vytvorSoubojStav(P(0), P(300), 'volt', 'onyx')
    stavVolt = krokSouboje(stavVolt, [{ ...stat, akce: 'kop' }, stat], 0)

    let stavOnyx = vytvorSoubojStav(P(0), P(300), 'onyx', 'onyx')
    stavOnyx = krokSouboje(stavOnyx, [{ ...stat, akce: 'kop' }, stat], 0)

    expect(stavVolt.hraci[0].utokKonci).toBeLessThan(stavOnyx.hraci[0].utokKonci)
  })
})
