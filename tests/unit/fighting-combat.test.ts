import { describe, expect, it } from 'vitest'
import {
  AKCE_DATA,
  ARENA_SIRKA,
  BLOK_REDUKCE,
  CAS_LIMIT_MS,
  COMEBACK_NASOBIC,
  COMEBACK_PRAH,
  HITSTUN_MS,
  KOMBO_BONUS_ZA_UDER,
  KOMBO_OKNO_MS,
  MAX_HP,
  PARRY_OKNO_MS,
  PARRY_TREST_MS,
  PARRY_ZABLESK_MS,
  SUDDEN_DEATH_NASOBIC_ZACATEK,
  HAZARD_OKRAJE_PRAH,
  HAZARD_OKRAJE_POSKOZENI,
  PICKUP_DOSTUPNY_OD_MS,
  VYCHOZI_MOZNOSTI,
  VZTEK_MAX,
  VZTEK_NASOBIC,
  UDALOST_PERIODA_MS,
  UDALOST_POSKOZENI,
  cyklusUdalostiAreny,
  stredUdalostiBalvan,
  krokSouboje,
  vytvorBojovnika,
  vytvorSoubojStav,
} from '@/fighting/combat/engine'
import type { HracVstup, SoubojMoznosti } from '@/fighting/combat/types'

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
    // Vylepšení — parry: blok, co za útokem NEZAOSTÁVÁ vůbec (stejný
    // tik jako útok, čerstvě zvednutý), je od parry mechaniky "perfektní"
    // (viz vlastní sekce níž), ne obyčejný. Tenhle test chce ověřit
    // OBYČEJNÝ blok, appka proto nechá obránce blokovat už DŘÍV, mimo
    // parry okno, přesně jak "obyčejný blok" v praxi vypadá.
    // Obránce zvedne blok TEĎ (deltaMs 0 — ustaví blokuje: true) a pak
    // ho drží dost dlouho, aby přestal být "perfektní" — jeden krok s
    // velkým deltaMs by první tik držení vždycky ukázal jako 0ms (appka
    // neví, jak dlouho PŘED koncem tiku k držení došlo), skutečné
    // nabíhání potřebuje aspoň dva kroky, přesně jak by to na 60 Hz
    // vypadalo v praxi.
    stav = krokSouboje(stav, [stat, { ...stat, blok: true }], 0)
    stav = krokSouboje(stav, [stat, { ...stat, blok: true }], PARRY_OKNO_MS + 50)
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

  // Osmé kolo vylepšení — přesná shoda HP při vypršení limitu už
  // neznamená remízu, ale start náhlé smrti (viz vlastní describe níž).
  it('přesná shoda HP při vypršení spustí náhlou smrt, kolo nekončí', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [stat, stat], CAS_LIMIT_MS) // oba mají plné HP
    expect(stav.stavKola).toBe('probiha')
    expect(stav.suddenDeath).toBe(true)
    expect(stav.suddenDeathOd).toBe(CAS_LIMIT_MS)
  })

  it('skutečný KO má přednost i přesně na hranici časového limitu', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav.hraci[1] = { ...stav.hraci[1], hp: 5 }
    stav = krokSouboje(stav, [{ ...stat, akce: 'kop' }, stat], CAS_LIMIT_MS) // kop dá 10, KO i limit ve stejném tiku
    expect(stav.stavKola).toBe('konec')
    expect(stav.vitez).toBe(0) // KO logika (kdo je na nule), ne HP-porovnání
  })
})

describe('vylepšení — náhlá smrt (suddenDeath)', () => {
  it('jakmile HP jakkoli rozejdou, rozhodne se hned i mimo časový limit', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [stat, stat], CAS_LIMIT_MS) // spustí náhlou smrt
    expect(stav.suddenDeath).toBe(true)
    // Neblokovaný kop hráče 0 rozhodne hned na dalším tiku.
    stav = krokSouboje(stav, [{ ...stat, akce: 'kop' }, stat], 50)
    expect(stav.stavKola).toBe('konec')
    expect(stav.vitez).toBe(0)
  })

  it('poškození v náhlé smrti je násobené (aspoň SUDDEN_DEATH_NASOBIC_ZACATEK)', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [stat, stat], CAS_LIMIT_MS)
    const hpPred = stav.hraci[1].hp
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, stat], 50)
    const poskozeni = hpPred - stav.hraci[1].hp
    // Obyčejný úder (AKCE_DATA.udar) dá 6 — v náhlé smrti musí dát
    // aspoň 6 × SUDDEN_DEATH_NASOBIC_ZACATEK.
    expect(poskozeni).toBeGreaterThanOrEqual(6 * SUDDEN_DEATH_NASOBIC_ZACATEK - 0.01)
  })

  it('dokud HP zůstávají shodná, kolo dál pokračuje (žádné vynucené rozhodnutí)', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [stat, stat], CAS_LIMIT_MS)
    stav = krokSouboje(stav, [stat, stat], 500) // nikdo neútočí
    expect(stav.stavKola).toBe('probiha')
    expect(stav.suddenDeath).toBe(true)
  })
})

describe('vylepšení — volby zápasu (SoubojMoznosti)', () => {
  it('trénink nikdy neukončí kolo a HP nikdy nespadne pod 1', () => {
    const moznosti: SoubojMoznosti = { ...VYCHOZI_MOZNOSTI, treninkovyRezim: true }
    let stav = vytvorSoubojStav(0, 80, undefined, undefined, moznosti)
    // Spousta silných útoků + dlouhý čas, co by jinak dávno KO'lo i
    // vyčerpalo časový limit několikrát.
    for (let i = 0; i < 50; i++) {
      stav = krokSouboje(
        stav,
        [
          { smer: null, blok: false, akce: 'specialni' },
          { smer: null, blok: false, akce: 'specialni' },
        ],
        2000
      )
    }
    expect(stav.stavKola).toBe('probiha')
    expect(stav.hraci[0].hp).toBeGreaterThanOrEqual(1)
    expect(stav.hraci[1].hp).toBeGreaterThanOrEqual(1)
  })

  it('handicap (handicapManaRegen) zrychlí nabíjení many jen zvýhodněnému hráči', () => {
    const moznosti: SoubojMoznosti = { ...VYCHOZI_MOZNOSTI, handicapManaRegen: [2, 1] }
    let stav = vytvorSoubojStav(0, 80, undefined, undefined, moznosti)
    stav = krokSouboje(stav, [stat, stat], 1000)
    expect(stav.hraci[0].mana).toBeGreaterThan(stav.hraci[1].mana)
  })

  it('hazard okraje dá dodatečné poškození, jen když odražení skončí u kraje arény', () => {
    const moznosti: SoubojMoznosti = { ...VYCHOZI_MOZNOSTI, hazardOkraju: true }
    // Cíl už stojí těsně u pravého kraje (HAZARD_OKRAJE_PRAH) — kop ho
    // odstrčí ještě blíž, resp. na hranu, takže hazard sepne.
    let stav = vytvorSoubojStav(ARENA_SIRKA - HAZARD_OKRAJE_PRAH - 5, ARENA_SIRKA - 2, undefined, undefined, moznosti)
    const hpPred = stav.hraci[1].hp
    stav = krokSouboje(stav, [{ ...stat, akce: 'kop' }, stat], 50)
    const poskozeni = hpPred - stav.hraci[1].hp
    // AKCE_DATA.kop dá 10 — s hazardem navíc HAZARD_OKRAJE_POSKOZENI (8).
    expect(poskozeni).toBeCloseTo(10 + HAZARD_OKRAJE_POSKOZENI, 5)
  })

  it('bez hazardu stejné odražení ke kraji žádné dodatečné poškození nedá', () => {
    let stav = vytvorSoubojStav(ARENA_SIRKA - HAZARD_OKRAJE_PRAH - 5, ARENA_SIRKA - 2)
    const hpPred = stav.hraci[1].hp
    stav = krokSouboje(stav, [{ ...stat, akce: 'kop' }, stat], 50)
    const poskozeni = hpPred - stav.hraci[1].hp
    expect(poskozeni).toBeCloseTo(10, 5)
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

    // Vylepšení — parry: viz komentář u "blokovaný útok sníží poškození"
    // výš — obyčejný (ne perfektní) blok musí zaostávat za útokem, ne
    // začínat na stejném tiku.
    let stavBlok = vytvorSoubojStav(0, 80)
    stavBlok = krokSouboje(stavBlok, [stat, { ...stat, blok: true }], 0)
    stavBlok = krokSouboje(stavBlok, [stat, { ...stat, blok: true }], PARRY_OKNO_MS + 50)
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

describe('vylepšení — parry (perfektní blok)', () => {
  it('zásah proti čerstvě zvednutému bloku (ve stejném tiku) je perfektní — nulové poškození, nulové odražení', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, { ...stat, blok: true }], 0)
    expect(stav.hraci[1].hp).toBe(MAX_HP)
    expect(stav.hraci[1].pozice).toBe(80) // žádné odražení, na rozdíl od obyčejného bloku
    expect(stav.hraci[1].zranitelnostKonci).toBe(0) // obránce sám žádný hitstun nedostal
  })

  it('perfektní blok potrestá útočníka delším omráčením než obyčejný neblokovaný zásah', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, { ...stat, blok: true }], 0)
    expect(stav.hraci[0].zranitelnostKonci).toBe(PARRY_TREST_MS)
    expect(PARRY_TREST_MS).toBeGreaterThan(HITSTUN_MS)
  })

  it('perfektní blok rozsvítí parryZablesk na obránci, ne na útočníkovi', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, { ...stat, blok: true }], 0)
    expect(stav.hraci[1].parryZablesk).toBe(PARRY_ZABLESK_MS)
    expect(stav.hraci[0].parryZablesk).toBe(0)
  })

  it('perfektní blok útočníkovi nepřidá kombo ani manu za zásah — trefa vůbec neprošla', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, { ...stat, blok: true }], 0)
    expect(stav.hraci[0].komboPocet).toBe(0)
    expect(stav.hraci[0].mana).toBe(0)
  })

  it('blok držený už DÉLE než PARRY_OKNO_MS před zásahem je obyčejný blok, ne perfektní', () => {
    let stav = vytvorSoubojStav(0, 80)
    // Obránce drží blok bez přerušení, dřív než útočník vůbec udeří.
    // Obránce zvedne blok TEĎ (deltaMs 0 — ustaví blokuje: true) a pak
    // ho drží dost dlouho, aby přestal být "perfektní" — jeden krok s
    // velkým deltaMs by první tik držení vždycky ukázal jako 0ms (appka
    // neví, jak dlouho PŘED koncem tiku k držení došlo), skutečné
    // nabíhání potřebuje aspoň dva kroky, přesně jak by to na 60 Hz
    // vypadalo v praxi.
    stav = krokSouboje(stav, [stat, { ...stat, blok: true }], 0)
    stav = krokSouboje(stav, [stat, { ...stat, blok: true }], PARRY_OKNO_MS + 50)
    expect(stav.hraci[1].blokDrzenMs).toBeGreaterThan(PARRY_OKNO_MS)

    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, { ...stat, blok: true }], 0)
    const ocekavane = AKCE_DATA.udar.poskozeni * (1 - BLOK_REDUKCE)
    expect(stav.hraci[1].hp).toBeCloseTo(MAX_HP - ocekavane)
    expect(stav.hraci[0].zranitelnostKonci).toBe(0) // útočník nebyl potrestán
    expect(stav.hraci[1].parryZablesk).toBe(0)
  })
})

describe('vylepšení — comeback', () => {
  it('útočník pod COMEBACK_PRAH dá víc poškození než stejný útočník s plným HP', () => {
    let stavPlne = vytvorSoubojStav(0, 80)
    stavPlne = krokSouboje(stavPlne, [{ ...stat, akce: 'udar' }, stat], 0)
    const dmgPlne = MAX_HP - stavPlne.hraci[1].hp

    let stavComeback = vytvorSoubojStav(0, 80)
    stavComeback.hraci[0] = { ...stavComeback.hraci[0], hp: MAX_HP * COMEBACK_PRAH } // přesně na hranici (<=)
    stavComeback = krokSouboje(stavComeback, [{ ...stat, akce: 'udar' }, stat], 0)
    const dmgComeback = MAX_HP - stavComeback.hraci[1].hp

    expect(dmgComeback).toBeGreaterThan(dmgPlne)
    expect(dmgComeback).toBeCloseTo(dmgPlne * COMEBACK_NASOBIC)
  })

  it('útočník TĚSNĚ nad prahem žádný bonus nedostane', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav.hraci[0] = { ...stav.hraci[0], hp: MAX_HP * COMEBACK_PRAH + 5 }
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, stat], 0)
    const dmg = MAX_HP - stav.hraci[1].hp
    expect(dmg).toBeCloseTo(AKCE_DATA.udar.poskozeni)
  })

  it('comeback platí i na blokovaný zásah, na rozdíl od komba', () => {
    // Obránce musí blok držet už DŘÍV, ne od stejného tiku jako útok —
    // jinak by šlo o perfektní blok (viz sekce výš), který dá nulové
    // poškození bez ohledu na cokoliv, comeback bonus by tak nešlo
    // vůbec pozorovat.
    let stavPlne = vytvorSoubojStav(0, 80)
    stavPlne = krokSouboje(stavPlne, [stat, { ...stat, blok: true }], 0)
    stavPlne = krokSouboje(stavPlne, [stat, { ...stat, blok: true }], PARRY_OKNO_MS + 50)
    stavPlne = krokSouboje(stavPlne, [{ ...stat, akce: 'udar' }, { ...stat, blok: true }], 0)
    const dmgBlokPlne = MAX_HP - stavPlne.hraci[1].hp

    let stavComeback = vytvorSoubojStav(0, 80)
    stavComeback.hraci[0] = { ...stavComeback.hraci[0], hp: 10 }
    stavComeback = krokSouboje(stavComeback, [stat, { ...stat, blok: true }], 0)
    stavComeback = krokSouboje(stavComeback, [stat, { ...stat, blok: true }], PARRY_OKNO_MS + 50)
    stavComeback = krokSouboje(stavComeback, [{ ...stat, akce: 'udar' }, { ...stat, blok: true }], 0)
    const dmgBlokComeback = MAX_HP - stavComeback.hraci[1].hp

    expect(dmgBlokComeback).toBeGreaterThan(dmgBlokPlne)
  })

  it('comeback a kombo bonus se násobí dohromady, ne že by jeden ten druhý ignoroval', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav.hraci[0] = { ...stav.hraci[0], hp: 10, komboPocet: 2, komboKonci: 500 }
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, stat], 0)
    const dmg = MAX_HP - stav.hraci[1].hp
    const ocekavane = AKCE_DATA.udar.poskozeni * (1 + 2 * KOMBO_BONUS_ZA_UDER) * COMEBACK_NASOBIC
    expect(dmg).toBeCloseTo(ocekavane)
  })
})

describe('vylepšení — pickup v aréně', () => {
  it('pickup (mana) doplní manu bojovníkovi, co se k němu dostane první, po zpřístupnění', () => {
    const nahodne = () => 0 // pozice = 200 (ARENA_SIRKA*0.25), typ 'mana' (0 < 0.5)
    let stav = vytvorSoubojStav(200, 700, undefined, undefined, VYCHOZI_MOZNOSTI, nahodne)
    expect(stav.pickupTyp).toBe('mana')
    expect(stav.pickupSebran).toBe(false)
    stav = krokSouboje(stav, [stat, stat], PICKUP_DOSTUPNY_OD_MS)
    expect(stav.pickupSebran).toBe(true)
    expect(stav.hraci[0].mana).toBe(stav.hraci[0].maxMana)
    // Hráč 1 je daleko od pickupu — jeho mana je jen z pasivní regenerace
    // za uplynulý čas (MANA_REGEN_ZA_S), ne z pickupu.
    expect(stav.hraci[1].mana).toBeLessThan(stav.hraci[1].maxMana)
  })

  it('pickup se nesebere před PICKUP_DOSTUPNY_OD_MS, i když je bojovník v dosahu', () => {
    const nahodne = () => 0
    let stav = vytvorSoubojStav(200, 700, undefined, undefined, VYCHOZI_MOZNOSTI, nahodne)
    stav = krokSouboje(stav, [stat, stat], PICKUP_DOSTUPNY_OD_MS - 100)
    expect(stav.pickupSebran).toBe(false)
  })

  it('pickup (štít) dá stitAktivni, ne manu', () => {
    const nahodne = () => 0.9 // pozice = 560, typ 'stit' (0.9 >= 0.5)
    let stav = vytvorSoubojStav(560, 10, undefined, undefined, VYCHOZI_MOZNOSTI, nahodne)
    expect(stav.pickupTyp).toBe('stit')
    stav = krokSouboje(stav, [stat, stat], PICKUP_DOSTUPNY_OD_MS)
    expect(stav.pickupSebran).toBe(true)
    expect(stav.hraci[0].stitAktivni).toBe(true)
  })

  it('mimo dosah pickupu ho nikdo nesebere', () => {
    const nahodne = () => 0 // pozice 200
    let stav = vytvorSoubojStav(0, ARENA_SIRKA, undefined, undefined, VYCHOZI_MOZNOSTI, nahodne)
    stav = krokSouboje(stav, [stat, stat], PICKUP_DOSTUPNY_OD_MS)
    expect(stav.pickupSebran).toBe(false)
  })
})

describe('desáté kolo vylepšení — vztek (rage)', () => {
  it('doručené poškození navyšuje CÍLŮV vztek', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, stat], 0)
    expect(stav.hraci[1].vztek).toBe(AKCE_DATA.udar.poskozeni)
    expect(stav.hraci[1].vztekPripraven).toBe(false)
  })

  it('vztek se capne na VZTEK_MAX a natrvalo nastaví vztekPripraven', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav.hraci[1] = { ...stav.hraci[1], vztek: VZTEK_MAX - 2 }
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, stat], 0) // 6 poškození, 98+6 > 100
    expect(stav.hraci[1].vztek).toBe(VZTEK_MAX)
    expect(stav.hraci[1].vztekPripraven).toBe(true)
  })

  it('nabitý vztek znásobí poškození PRVNÍHO dalšího zásahu a spotřebuje se', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav.hraci[0] = { ...stav.hraci[0], vztekPripraven: true, vztek: VZTEK_MAX }
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, stat], 0)
    const ocekavane = AKCE_DATA.udar.poskozeni * VZTEK_NASOBIC
    expect(stav.hraci[1].hp).toBeCloseTo(MAX_HP - ocekavane)
    expect(stav.hraci[0].vztek).toBe(0)
    expect(stav.hraci[0].vztekPripraven).toBe(false)
  })

  it('nabitý vztek platí i na BLOKOVANÝ zásah, stejná šíře jako comeback', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav.hraci[0] = { ...stav.hraci[0], vztekPripraven: true }
    stav = krokSouboje(stav, [stat, { ...stat, blok: true }], 0)
    stav = krokSouboje(stav, [stat, { ...stat, blok: true }], PARRY_OKNO_MS + 50)
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, { ...stat, blok: true }], 0)
    const ocekavane = AKCE_DATA.udar.poskozeni * (1 - BLOK_REDUKCE) * VZTEK_NASOBIC
    expect(stav.hraci[1].hp).toBeCloseTo(MAX_HP - ocekavane)
    expect(stav.hraci[0].vztekPripraven).toBe(false)
  })

  it('nenabitý vztek žádný bonus nedává', () => {
    let stav = vytvorSoubojStav(0, 80)
    stav = krokSouboje(stav, [{ ...stat, akce: 'udar' }, stat], 0)
    expect(stav.hraci[1].hp).toBe(MAX_HP - AKCE_DATA.udar.poskozeni)
  })
})

describe('desáté kolo vylepšení — chyt (grab, poskozeniPresBlok)', () => {
  it('chyt ignoruje obyčejný blok úplně — plné poškození, skutečný hitstun', () => {
    let stav = vytvorSoubojStav(0, 60) // <= dosah chytu (70)
    stav = krokSouboje(stav, [{ ...stat, akce: 'chyt' }, { ...stat, blok: true }], 0)
    expect(stav.hraci[1].hp).toBe(MAX_HP - AKCE_DATA.chyt.poskozeni)
    expect(stav.hraci[1].zranitelnostKonci).toBe(HITSTUN_MS)
  })

  it('chyt obchází i perfektní blok — útočník není potrestán, i když je blok čerstvě zvednutý', () => {
    let stav = vytvorSoubojStav(0, 60)
    // Blok zvednutý přesně tenhle tik (blokDrzenMs by u obyčejného
    // útoku znamenalo "perfektní blok") — chyt to nemá jak zaznamenat,
    // protože zasahBlokovan je vynucené na false.
    stav = krokSouboje(stav, [{ ...stat, akce: 'chyt' }, { ...stat, blok: true }], 0)
    expect(stav.hraci[0].zranitelnostKonci).toBe(0)
  })

  it('chyt mimo svůj (kratší) dosah netrefí', () => {
    let stav = vytvorSoubojStav(0, 100) // > dosah chytu (70), <= dosah kopu
    stav = krokSouboje(stav, [{ ...stat, akce: 'chyt' }, stat], 0)
    expect(stav.hraci[1].hp).toBe(MAX_HP)
  })
})

describe('desáté kolo vylepšení — interaktivní událost arény (balvan)', () => {
  it('dopad přesně na hranici cyklu zasáhne jen bojovníka v zóně, ne toho mimo ni', () => {
    const stred = stredUdalostiBalvan(0)
    let stav = vytvorSoubojStav(stred, ARENA_SIRKA - 10, undefined, undefined, {
      ...VYCHOZI_MOZNOSTI,
      udalostAreny: 'balvan',
    })
    stav = krokSouboje(stav, [stat, stat], UDALOST_PERIODA_MS)
    expect(stav.hraci[0].hp).toBe(MAX_HP - UDALOST_POSKOZENI)
    expect(stav.hraci[1].hp).toBe(MAX_HP)
  })

  it('dopad se neuplatní dřív, než hranice cyklu doopravdy nastane', () => {
    const stred = stredUdalostiBalvan(0)
    let stav = vytvorSoubojStav(stred, ARENA_SIRKA - 10, undefined, undefined, {
      ...VYCHOZI_MOZNOSTI,
      udalostAreny: 'balvan',
    })
    stav = krokSouboje(stav, [stat, stat], UDALOST_PERIODA_MS - 100)
    expect(stav.hraci[0].hp).toBe(MAX_HP)
  })

  it("'zatmeni' je čistě vizuální — engine žádné poškození neuplatní", () => {
    const stred = stredUdalostiBalvan(0)
    let stav = vytvorSoubojStav(stred, stred, undefined, undefined, {
      ...VYCHOZI_MOZNOSTI,
      udalostAreny: 'zatmeni',
    })
    stav = krokSouboje(stav, [stat, stat], UDALOST_PERIODA_MS)
    expect(stav.hraci[0].hp).toBe(MAX_HP)
    expect(stav.hraci[1].hp).toBe(MAX_HP)
  })

  it('hazard platí i v tréninku, ale HP zůstává podlahou na 1, kolo neskončí', () => {
    const stred = stredUdalostiBalvan(0)
    let stav = vytvorSoubojStav(stred, ARENA_SIRKA - 10, undefined, undefined, {
      ...VYCHOZI_MOZNOSTI,
      udalostAreny: 'balvan',
      treninkovyRezim: true,
    })
    stav.hraci[0] = { ...stav.hraci[0], hp: 5 } // méně než UDALOST_POSKOZENI
    stav = krokSouboje(stav, [stat, stat], UDALOST_PERIODA_MS)
    expect(stav.hraci[0].hp).toBe(1)
    expect(stav.stavKola).toBe('probiha')
  })

  it('cyklusUdalostiAreny/stredUdalostiBalvan jsou čistě deterministické funkce', () => {
    expect(cyklusUdalostiAreny(0)).toBe(0)
    expect(cyklusUdalostiAreny(UDALOST_PERIODA_MS)).toBe(1)
    expect(stredUdalostiBalvan(0)).toBe(stredUdalostiBalvan(0))
  })
})
