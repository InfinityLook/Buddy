import { describe, expect, it } from 'vitest'
import {
  AKCE_DATA,
  ARENA_SIRKA,
  BLOK_REDUKCE,
  CAS_LIMIT_MS,
  HITSTUN_MS,
  KOMBO_OKNO_MS,
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

describe('vylepšení — časový limit kola (CAS_LIMIT_MS)', () => {
  it('kolo pokračuje, dokud čas nedosáhl limitu', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [stat, stat], CAS_LIMIT_MS - 100)
    expect(stav.stavKola).toBe('probiha')
    expect(stav.vitez).toBeNull()
  })

  it('po vypršení vyhraje bojovník s víc HP, nikdo nedostal KO', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav.hraci[1] = { ...stav.hraci[1], hp: 40 } // hráč 0 má plné HP, hráč 1 míň
    stav = krokSouboje(stav, [stat, stat], CAS_LIMIT_MS)
    expect(stav.stavKola).toBe('konec')
    expect(stav.vitez).toBe(0)
  })

  it('přesná shoda HP při vypršení je remíza', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [stat, stat], CAS_LIMIT_MS) // oba mají plné HP
    expect(stav.stavKola).toBe('konec')
    expect(stav.vitez).toBeNull()
  })

  it('skutečný KO má přednost i přesně na hranici časového limitu', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav.hraci[1] = { ...stav.hraci[1], hp: 5 }
    stav = krokSouboje(stav, [{ ...stat, akce: 'kop' }, stat], CAS_LIMIT_MS) // kop dá 10, KO i limit ve stejném tiku
    expect(stav.stavKola).toBe('konec')
    expect(stav.vitez).toBe(0) // KO logika (kdo je na nule), ne HP-porovnání
  })
})

describe('vylepšení — odražení (knockback)', () => {
  it('neblokovaný zásah odstrčí cíl pryč od útočníka, směrem od něj', () => {
    let stav = vytvorSoubojStav(0, 80) // útočník vlevo, cíl vpravo
    const pozicePred = stav.hraci[1].pozice
    stav = krokSouboje(stav, [{ ...stat, akce: 'kop' }, stat], 0)
    expect(stav.hraci[1].pozice).toBeGreaterThan(pozicePred) // odstrčen dál doprava
  })

  it('odstrčení funguje i opačným směrem, když je útočník vpravo', () => {
    let stav = vytvorSoubojStav(780, 700) // útočník vpravo (index 0), cíl vlevo od něj, ale s prostorem k okraji
    const pozicePred = stav.hraci[1].pozice
    stav = krokSouboje(stav, [{ ...stat, akce: 'kop' }, stat], 0)
    expect(stav.hraci[1].pozice).toBeLessThan(pozicePred) // odstrčen dál doleva
  })

  it('blokovaný zásah odstrčí méně než neblokovaný', () => {
    let stavNeblok = vytvorSoubojStav(0, 80)
    stavNeblok = krokSouboje(stavNeblok, [{ ...stat, akce: 'kop' }, stat], 0)
    const posunNeblok = stavNeblok.hraci[1].pozice - 80

    let stavBlok = vytvorSoubojStav(0, 80)
    stavBlok = krokSouboje(stavBlok, [{ ...stat, akce: 'kop' }, { ...stat, blok: true }], 0)
    const posunBlok = stavBlok.hraci[1].pozice - 80

    expect(posunBlok).toBeGreaterThan(0) // pořád nějaké odstrčení, ne nulové
    expect(posunBlok).toBeLessThan(posunNeblok)
  })

  it('respektuje hranice arény — cíl na kraji se dál neodstrčí, než kam aréna sahá', () => {
    let stav = vytvorSoubojStav(0, ARENA_SIRKA) // cíl už úplně u pravého okraje
    stav = krokSouboje(stav, [{ ...stat, akce: 'kop' }, stat], 0)
    expect(stav.hraci[1].pozice).toBe(ARENA_SIRKA)
  })

  it('plně pohlcený zásah štítem (Bulwark) neodstrčí cíl vůbec', () => {
    let stav = vytvorSoubojStav(0, 80, 'onyx', 'bulwark')
    stav.hraci[1] = { ...stav.hraci[1], stitAktivni: true }
    const pozicePred = stav.hraci[1].pozice
    stav = krokSouboje(stav, [{ ...stat, akce: 'kop' }, stat], 0)
    expect(stav.hraci[1].pozice).toBe(pozicePred)
  })
})

describe('vylepšení — kombo (komboPocet/komboKonci)', () => {
  it('druhý neblokovaný zásah v rychlém sledu dá víc poškození než první (kombo bonus)', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, stat], 0) // 1. zásah
    const dmg1 = MAX_HP - stav.hraci[1].hp
    expect(stav.hraci[0].komboPocet).toBe(1)

    stav = krokSouboje(stav, [stat, stat], AKCE_DATA.udar.trvaniMs) // ať doběhne zotavení z úderu
    const hpPred2 = stav.hraci[1].hp
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, stat], 0) // 2. zásah, pořád v okně
    const dmg2 = hpPred2 - stav.hraci[1].hp

    expect(dmg2).toBeGreaterThan(dmg1)
    expect(stav.hraci[0].komboPocet).toBe(2)
  })

  it('kombo se promlčí, pokud další zásah nepřijde do KOMBO_OKNO_MS', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, stat], 0)
    const dmg1 = MAX_HP - stav.hraci[1].hp

    stav = krokSouboje(stav, [stat, stat], KOMBO_OKNO_MS) // celé okno uplyne bez dalšího zásahu
    expect(stav.hraci[0].komboKonci).toBe(0)

    const hpPred2 = stav.hraci[1].hp
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, stat], 0)
    const dmg2 = hpPred2 - stav.hraci[1].hp

    expect(dmg2).toBeCloseTo(dmg1) // žádný bonus, série byla promlčená
  })

  it('blokovaný zásah kombo nerozjede ani neprodlouží', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, { ...stat, blok: true }], 0)
    expect(stav.hraci[0].komboKonci).toBe(0)
    expect(stav.hraci[0].komboPocet).toBe(0)
  })
})
