import { describe, expect, it } from 'vitest'
import {
  AKCE_DATA,
  ARENA_SIRKA,
  BLOK_REDUKCE,
  HITSTUN_MS,
  MAX_HP,
  krokSouboje,
  vytvorBojovnika,
  vytvorSoubojStav,
} from '@/fighting/combat/engine'
import type { HracVstup } from '@/fighting/combat/types'

const stat: HracVstup = { smer: null, blok: false, akce: null }

describe('vytvorBojovnika', () => {
  it('nastaví plné HP, nulovou manu a zadanou pozici', () => {
    const b = vytvorBojovnika(123)
    expect(b.hp).toBe(MAX_HP)
    expect(b.mana).toBe(0)
    expect(b.pozice).toBe(123)
  })
})

describe('pohyb', () => {
  it('posune pozici o očekávanou vzdálenost za daný čas', () => {
    let stav = vytvorSoubojStav(400, 700)
    stav = krokSouboje(stav, [{ ...stat, smer: 'vpravo' }, stat], 500)
    expect(stav.hraci[0].pozice).toBeCloseTo(400 + (220 * 500) / 1000)
  })

  it('respektuje horní hranici arény', () => {
    let stav = vytvorSoubojStav(ARENA_SIRKA - 10, 0)
    stav = krokSouboje(stav, [{ ...stat, smer: 'vpravo' }, stat], 5000)
    expect(stav.hraci[0].pozice).toBe(ARENA_SIRKA)
  })

  it('respektuje dolní hranici arény', () => {
    let stav = vytvorSoubojStav(5, ARENA_SIRKA)
    stav = krokSouboje(stav, [{ ...stat, smer: 'vlevo' }, stat], 5000)
    expect(stav.hraci[0].pozice).toBe(0)
  })
})

describe('útoky', () => {
  it('útok mimo dosah nezasáhne, ale útočník má i tak cooldown', () => {
    let stav = vytvorSoubojStav(0, 200) // 200 > dosah kopu (110)
    stav = krokSouboje(stav, [{ ...stat, akce: 'kop' }, stat], 0)
    expect(stav.hraci[1].hp).toBe(MAX_HP)
    expect(stav.hraci[1].zranitelnostKonci).toBe(0)
    expect(stav.hraci[0].utokKonci).toBe(AKCE_DATA.kop.trvaniMs)
  })

  it('útok v dosahu způsobí poškození, hitstun obránci a manu útočníkovi', () => {
    let stav = vytvorSoubojStav(0, 80) // 80 <= dosah úderu (90)
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, stat], 0)
    expect(stav.hraci[1].hp).toBe(MAX_HP - AKCE_DATA.udar.poskozeni)
    expect(stav.hraci[1].zranitelnostKonci).toBe(HITSTUN_MS)
    expect(stav.hraci[0].mana).toBe(15)
  })

  it('blokovaný útok sníží poškození podle BLOK_REDUKCE a neudělí hitstun', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, { ...stat, blok: true }], 0)
    const ocekavane = AKCE_DATA.udar.poskozeni * (1 - BLOK_REDUKCE)
    expect(stav.hraci[1].hp).toBeCloseTo(MAX_HP - ocekavane)
    expect(stav.hraci[1].zranitelnostKonci).toBe(0)
  })

  it('speciální útok bez dostatku many se vůbec neprovede', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [{ ...stat, akce: 'specialni' }, stat], 0)
    expect(stav.hraci[1].hp).toBe(MAX_HP)
    expect(stav.hraci[0].utokKonci).toBe(0)
  })

  it('speciální útok s manou ji spotřebuje, poškodí obránce a přidá manu za zásah', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav.hraci[0] = { ...stav.hraci[0], mana: 100 }
    stav = krokSouboje(stav, [{ ...stat, akce: 'specialni' }, stat], 0)
    expect(stav.hraci[1].hp).toBe(MAX_HP - AKCE_DATA.specialni.poskozeni)
    expect(stav.hraci[0].mana).toBe(100 - AKCE_DATA.specialni.cenaMany + 15)
  })
})

describe('busy stav (hitstun / probíhající útok)', () => {
  it('bojovník uprostřed útoku ignoruje další vstupy, dokud čas nevyprší', () => {
    let stav = vytvorSoubojStav(0, 300)
    stav = krokSouboje(stav, [{ ...stat, akce: 'kop' }, stat], 0)
    expect(stav.hraci[0].utokKonci).toBe(AKCE_DATA.kop.trvaniMs)

    const pozicePred = stav.hraci[0].pozice
    stav = krokSouboje(stav, [{ ...stat, smer: 'vpravo' }, stat], 100)
    expect(stav.hraci[0].pozice).toBe(pozicePred) // pohyb ignorován, útočník je busy
    expect(stav.hraci[0].utokKonci).toBe(AKCE_DATA.kop.trvaniMs - 100)

    stav = krokSouboje(stav, [{ ...stat, smer: 'vpravo' }, stat], AKCE_DATA.kop.trvaniMs - 100)
    expect(stav.hraci[0].utokKonci).toBe(0)

    stav = krokSouboje(stav, [{ ...stat, smer: 'vpravo' }, stat], 100)
    expect(stav.hraci[0].pozice).toBeGreaterThan(pozicePred)
  })
})

describe('konec kola (KO)', () => {
  it('nastaví vítěze a zamrzne stav po zásahu, který sníží hp na 0', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav.hraci[1] = { ...stav.hraci[1], hp: 5 }
    stav = krokSouboje(stav, [{ ...stat, akce: 'kop' }, stat], 0) // kop dá 10 poškození
    expect(stav.hraci[1].hp).toBe(0)
    expect(stav.vitez).toBe(0)
    expect(stav.stavKola).toBe('konec')

    const dalsi = krokSouboje(stav, [{ ...stat, smer: 'vpravo' }, stat], 1000)
    expect(dalsi).toBe(stav) // po konci kola je stav zamrzlý, žádný přepočet
  })
})
