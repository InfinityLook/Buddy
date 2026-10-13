import { describe, expect, it } from 'vitest'
import {
  MAX_LEVEL,
  MAX_HP_ZA_UROVEN,
  ZAKLADNI_MAX_HP,
  hracStavZUrovne,
  jeMrtvyHrac,
  plneUzdravit,
  pripocistXp,
  utrzetPoskozeni,
  vychoziHracStav,
  xpProDalsiUroven,
} from '@/buddyworld/leveling'

describe('xpProDalsiUroven', () => {
  it('spočítá lineární rampu — 25 na první level, +12 za každý další', () => {
    expect(xpProDalsiUroven(1)).toBe(25)
    expect(xpProDalsiUroven(2)).toBe(37)
    expect(xpProDalsiUroven(5)).toBe(25 + 4 * 12)
  })
})

describe('vychoziHracStav', () => {
  it('vrátí level 1, nulové XP a plné HP na základní hodnotě', () => {
    const stav = vychoziHracStav()
    expect(stav.level).toBe(1)
    expect(stav.xp).toBe(0)
    expect(stav.maxHp).toBe(ZAKLADNI_MAX_HP)
    expect(stav.hp).toBe(ZAKLADNI_MAX_HP)
  })
})

describe('pripocistXp', () => {
  it('přičte XP bez postupu o úroveň, pokud odměna nestačí', () => {
    const stav = pripocistXp(vychoziHracStav(), 10)
    expect(stav.level).toBe(1)
    expect(stav.xp).toBe(10)
    expect(stav.hp).toBe(ZAKLADNI_MAX_HP)
  })

  it('postoupí o jednu úroveň, zvětší maxHp a plně uzdraví', () => {
    const stav = pripocistXp(vychoziHracStav(), 25)
    expect(stav.level).toBe(2)
    expect(stav.xp).toBe(0)
    expect(stav.maxHp).toBe(ZAKLADNI_MAX_HP + MAX_HP_ZA_UROVEN)
    expect(stav.hp).toBe(stav.maxHp)
  })

  it('postoupí o víc úrovní najednou, když je odměna velká', () => {
    // level 1→2 stojí 25, 2→3 stojí 37 — 70 XP musí stihnout obě.
    const stav = pripocistXp(vychoziHracStav(), 70)
    expect(stav.level).toBe(3)
    expect(stav.xp).toBe(70 - 25 - 37)
  })

  it('nepostoupí nad MAX_LEVEL a vynuluje XP na stropu', () => {
    let stav = vychoziHracStav()
    for (let i = 0; i < 30; i++) stav = pripocistXp(stav, 10000)
    expect(stav.level).toBe(MAX_LEVEL)
    expect(stav.xp).toBe(0)
  })

  it('zápornou nebo necelou odměnu ořeže na nulu/dolů', () => {
    const stav = pripocistXp(vychoziHracStav(), -50)
    expect(stav.xp).toBe(0)
    expect(stav.level).toBe(1)
  })

  it('zachová aktuální HP, dokud hráč nepostoupí o úroveň', () => {
    const poskozeny = utrzetPoskozeni(vychoziHracStav(), 20)
    const stav = pripocistXp(poskozeny, 5)
    expect(stav.hp).toBe(ZAKLADNI_MAX_HP - 20)
  })
})

describe('utrzetPoskozeni', () => {
  it('sníží HP o poškození', () => {
    const stav = utrzetPoskozeni(vychoziHracStav(), 15)
    expect(stav.hp).toBe(ZAKLADNI_MAX_HP - 15)
  })

  it('nepustí HP pod nulu', () => {
    const stav = utrzetPoskozeni(vychoziHracStav(), ZAKLADNI_MAX_HP + 999)
    expect(stav.hp).toBe(0)
  })

  it('záporné poškození ořeže na nulu, nikdy hráče neuzdraví', () => {
    const stav = utrzetPoskozeni(vychoziHracStav(), -20)
    expect(stav.hp).toBe(ZAKLADNI_MAX_HP)
  })
})

describe('jeMrtvyHrac', () => {
  it('je pravda jen při HP 0 nebo níž', () => {
    expect(jeMrtvyHrac(vychoziHracStav())).toBe(false)
    expect(jeMrtvyHrac(utrzetPoskozeni(vychoziHracStav(), ZAKLADNI_MAX_HP))).toBe(true)
  })
})

describe('plneUzdravit', () => {
  it('nastaví HP zpátky na maxHp', () => {
    const poskozeny = utrzetPoskozeni(vychoziHracStav(), 40)
    expect(plneUzdravit(poskozeny).hp).toBe(poskozeny.maxHp)
  })
})

describe('hracStavZUrovne', () => {
  it('spočítá maxHp z levelu a nastaví plné HP', () => {
    const stav = hracStavZUrovne(3, 7)
    expect(stav.level).toBe(3)
    expect(stav.xp).toBe(7)
    expect(stav.maxHp).toBe(ZAKLADNI_MAX_HP + 2 * MAX_HP_ZA_UROVEN)
    expect(stav.hp).toBe(stav.maxHp)
  })

  it('ořeže level do rozsahu 1..MAX_LEVEL a XP nikdy nepustí pod nulu', () => {
    expect(hracStavZUrovne(0, -5).level).toBe(1)
    expect(hracStavZUrovne(0, -5).xp).toBe(0)
    expect(hracStavZUrovne(999, 0).level).toBe(MAX_LEVEL)
  })

  it('zaokrouhlí necelý level dolů', () => {
    expect(hracStavZUrovne(2.9, 0).level).toBe(2)
  })
})
