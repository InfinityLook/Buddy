import { describe, expect, it } from 'vitest'
import {
  aplikujZuriNaPoskozeni,
  krokAiBosse,
  melByProbuditBosse,
  obnovBosse,
  pokusUtokOtresemBosse,
  probuditBosse,
  vytvorBossRuntime,
} from '@/buddyworld/combat/bossEngine'
import type { BossDef } from '@/buddyworld/data/bossove'

const BOSS_DEF: BossDef = {
  id: 'test-boss',
  jmeno: 'Testovací strážce',
  ikona: '🌲',
  maxHp: 200,
  poskozeni: 16,
  dosahUtoku: 2,
  dosahDetekce: 9999,
  rychlost: 1.8,
  cooldownUtokuMs: 1500,
  odmenaXp: 150,
  model: null,
  barvaTela: '#4a3b2a',
  barvaHalo: '#ffd27a',
  meritko: 2.4,
  tvar: 'ostruha',
  jeBoss: true,
  zuriPodHp: 0.5,
  zuriNasobicPoskozeni: 2,
  dosahUtokuOtresu: 4,
  poskozeniOtresu: 14,
  cooldownUtokuOtresuMs: 4000,
  dosahProbuzeni: 3.5,
}

describe('vytvorBossRuntime', () => {
  it('vytvoří dormantního bosse na plném HP, bez zuřivosti, na dané pozici', () => {
    const boss = vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 5, z: -10 })
    expect(boss.hp).toBe(BOSS_DEF.maxHp)
    expect(boss.faze).toBe('klid')
    expect(boss.probuzen).toBe(false)
    expect(boss.zuri).toBe(false)
    expect(boss.pozice).toEqual({ x: 5, z: -10 })
    expect(boss.posledniOtresUtokuMs).toBe(-Infinity)
  })
})

describe('melByProbuditBosse', () => {
  it('je nepravda mimo dosah probuzení', () => {
    const boss = vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 })
    expect(melByProbuditBosse(boss, BOSS_DEF, BOSS_DEF.dosahProbuzeni + 0.1)).toBe(false)
  })

  it('je pravda uvnitř dosahu probuzení pro dormantního bosse', () => {
    const boss = vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 })
    expect(melByProbuditBosse(boss, BOSS_DEF, BOSS_DEF.dosahProbuzeni)).toBe(true)
  })

  it('je nepravda, pokud je boss už vzbuzený', () => {
    const boss = probuditBosse(vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 }))
    expect(melByProbuditBosse(boss, BOSS_DEF, 0)).toBe(false)
  })

  it('je nepravda pro mrtvého bosse, i uvnitř dosahu', () => {
    const mrtvy = { ...vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 }), faze: 'mrtvy' as const }
    expect(melByProbuditBosse(mrtvy, BOSS_DEF, 0)).toBe(false)
  })
})

describe('probuditBosse', () => {
  it('vzbudí dormantního bosse a přepne ho do fáze "honí"', () => {
    const boss = probuditBosse(vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 }))
    expect(boss.probuzen).toBe(true)
    expect(boss.faze).toBe('honi')
  })

  it('je no-op pro už vzbuzeného bosse — appka tím nemusí sama hlídat jedinou volání', () => {
    const vzbuzeny = probuditBosse(vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 }))
    expect(probuditBosse(vzbuzeny)).toBe(vzbuzeny)
  })
})

describe('krokAiBosse', () => {
  it('dormantního bosse vůbec nehýbe, i když je hráč blízko', () => {
    const dormantni = vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 })
    const vysledek = krokAiBosse(dormantni, BOSS_DEF, { x: 0.5, z: 0 }, 1)
    expect(vysledek).toBe(dormantni)
    expect(vysledek.faze).toBe('klid')
  })

  it('mrtvého bosse vůbec nezmění', () => {
    const mrtvy = { ...vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 }), faze: 'mrtvy' as const, probuzen: true }
    expect(krokAiBosse(mrtvy, BOSS_DEF, { x: 0, z: 0 }, 1)).toBe(mrtvy)
  })

  it('vzbuzeného bosse mimo útočný dosah honí směrem k hráči', () => {
    const vzbuzeny = probuditBosse(vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 }))
    const vysledek = krokAiBosse(vzbuzeny, BOSS_DEF, { x: 5, z: 0 }, 1)
    expect(vysledek.faze).toBe('honi')
    expect(vysledek.pozice.x).toBeGreaterThan(0)
  })

  it('vzbuzeného bosse uvnitř útočného dosahu přepne na "útočí", pozici nemění', () => {
    const vzbuzeny = probuditBosse(vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 1, z: 0 }))
    const vysledek = krokAiBosse(vzbuzeny, BOSS_DEF, { x: 0, z: 0 }, 1)
    expect(vysledek.faze).toBe('utoci')
    expect(vysledek.pozice).toEqual({ x: 1, z: 0 })
  })

  it('nastaví zuřivost, jakmile HP klesne pod zuriPodHp, a appka ji dál nevrátí zpátky i poté, co HP zase vzroste', () => {
    const vzbuzeny = probuditBosse(vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 }))
    const poskozeny = { ...vzbuzeny, hp: BOSS_DEF.maxHp * (BOSS_DEF.zuriPodHp - 0.01) }
    const vysledek = krokAiBosse(poskozeny, BOSS_DEF, { x: 100, z: 0 }, 1)
    expect(vysledek.zuri).toBe(true)

    // appka bosse teď "zacelí" zpátky na plné HP — zuřivost jednou nastavená zůstává pravdou dál
    const dal = krokAiBosse({ ...vysledek, hp: BOSS_DEF.maxHp }, BOSS_DEF, { x: 100, z: 0 }, 1)
    expect(dal.zuri).toBe(true)
  })
})

describe('pokusUtokOtresemBosse', () => {
  it('neudeří dormantního bosse, i uvnitř dosahu', () => {
    const dormantni = vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 })
    const vysledek = pokusUtokOtresemBosse(dormantni, BOSS_DEF, 0, 1000)
    expect(vysledek.provedeno).toBe(false)
  })

  it('neudeří mimo dosah otřesu', () => {
    const vzbuzeny = probuditBosse(vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 }))
    const vysledek = pokusUtokOtresemBosse(vzbuzeny, BOSS_DEF, BOSS_DEF.dosahUtokuOtresu + 0.1, 1000)
    expect(vysledek.provedeno).toBe(false)
  })

  it('neudeří dřív, než appka uplyne cooldown otřesu', () => {
    const vzbuzeny = {
      ...probuditBosse(vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 })),
      posledniOtresUtokuMs: 1000,
    }
    const vysledek = pokusUtokOtresemBosse(vzbuzeny, BOSS_DEF, 0, 1000 + BOSS_DEF.cooldownUtokuOtresuMs - 1)
    expect(vysledek.provedeno).toBe(false)
  })

  it('udeří uvnitř dosahu a cooldownu, a aktualizuje čas posledního otřesu', () => {
    const vzbuzeny = probuditBosse(vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 }))
    const casUtoku = 2000
    const vysledek = pokusUtokOtresemBosse(vzbuzeny, BOSS_DEF, BOSS_DEF.dosahUtokuOtresu, casUtoku)
    expect(vysledek.provedeno).toBe(true)
    expect(vysledek.poskozeni).toBe(BOSS_DEF.poskozeniOtresu)
    expect(vysledek.boss.posledniOtresUtokuMs).toBe(casUtoku)
  })

  it('funguje bez ohledu na fázi "útočí" prvního melee útoku — cooldown otřesu je úplně nezávislý', () => {
    const vzbuzeny = { ...probuditBosse(vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 })), faze: 'honi' as const }
    const vysledek = pokusUtokOtresemBosse(vzbuzeny, BOSS_DEF, BOSS_DEF.dosahUtokuOtresu, 1000)
    expect(vysledek.provedeno).toBe(true)
  })

  it('zuřivost násobí i poškození otřesu', () => {
    const zuricí = { ...probuditBosse(vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 })), zuri: true }
    const vysledek = pokusUtokOtresemBosse(zuricí, BOSS_DEF, 0, 1000)
    expect(vysledek.poskozeni).toBe(Math.round(BOSS_DEF.poskozeniOtresu * BOSS_DEF.zuriNasobicPoskozeni))
  })
})

describe('aplikujZuriNaPoskozeni', () => {
  it('nezmění poškození, pokud boss není zuřivý', () => {
    const boss = vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 })
    expect(aplikujZuriNaPoskozeni(10, boss, BOSS_DEF)).toBe(10)
  })

  it('vynásobí poškození appčiným násobičem, pokud je boss zuřivý', () => {
    const zuricí = { ...vytvorBossRuntime(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 0, z: 0 }), zuri: true }
    expect(aplikujZuriNaPoskozeni(10, zuricí, BOSS_DEF)).toBe(Math.round(10 * BOSS_DEF.zuriNasobicPoskozeni))
  })
})

describe('obnovBosse', () => {
  it('vrátí bosse na plné HP a dormantní stav, ne do fáze, kde byl poražen', () => {
    const obnoveny = obnovBosse(BOSS_DEF.id, BOSS_DEF.maxHp, { x: 3, z: 3 })
    expect(obnoveny.hp).toBe(BOSS_DEF.maxHp)
    expect(obnoveny.faze).toBe('klid')
    expect(obnoveny.probuzen).toBe(false)
    expect(obnoveny.zuri).toBe(false)
    expect(obnoveny.pozice).toEqual({ x: 3, z: 3 })
  })
})
