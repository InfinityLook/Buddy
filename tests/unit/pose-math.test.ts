import { describe, it, expect } from 'vitest'
import {
  bodyStrany,
  jePrknoSpravne,
  jeZadaNarovnana,
  krokOpakovani,
  odklonTrupu,
  POCATECNI_STAV,
  PRAHY_OPAKOVANI,
  uhelVeVrcholu,
  vyberViditelnejsiStranu,
} from '@/miniapps/form-check/poseMath'
import { Bod, LM } from '@/miniapps/form-check/types'

const bod = (x: number, y: number, visibility = 1): Bod => ({ x, y, z: 0, visibility })

describe('uhelVeVrcholu', () => {
  it('propnutá noha (body v přímce) dá 180°', () => {
    expect(uhelVeVrcholu(bod(0, 0), bod(0, 1), bod(0, 2))).toBeCloseTo(180, 5)
  })

  it('pravoúhlé pokrčení dá 90°', () => {
    expect(uhelVeVrcholu(bod(0, 0), bod(0, 1), bod(1, 1))).toBeCloseTo(90, 5)
  })

  it('shodné body (nulová délka úsečky) vrátí 180° místo NaN', () => {
    expect(uhelVeVrcholu(bod(0, 0), bod(0, 0), bod(1, 1))).toBe(180)
  })
})

describe('krokOpakovani — obecný stavový automat', () => {
  it('s výchozími prahy (dřep) napočítá jedno opakování na cyklus nahoře→dole→nahoře', () => {
    let stav = POCATECNI_STAV
    stav = krokOpakovani(stav, 90) // pod 110 = dole
    expect(stav.faze).toBe('dole')
    stav = krokOpakovani(stav, 170) // nad 160 = zpátky nahoře, +1
    expect(stav).toEqual({ faze: 'nahore', pocet: 1 })
  })

  it('chvění úhlu kolem jedné hranice bez skutečného cyklu nic nepřipočítá', () => {
    let stav = POCATECNI_STAV
    stav = krokOpakovani(stav, 90)
    stav = krokOpakovani(stav, 95) // pořád "dole", žádný přechod
    stav = krokOpakovani(stav, 100)
    expect(stav.pocet).toBe(0)
  })

  it('s vlastními prahy (klik) počítá stejně, jen z jiných hodnot', () => {
    const prahy = PRAHY_OPAKOVANI.klik
    let stav = POCATECNI_STAV
    stav = krokOpakovani(stav, 80, prahy.dole, prahy.nahore) // pod 100 = dole
    expect(stav.faze).toBe('dole')
    stav = krokOpakovani(stav, 170, prahy.dole, prahy.nahore) // nad 155 = nahoře, +1
    expect(stav).toEqual({ faze: 'nahore', pocet: 1 })
  })

  it('dřepové prahy klik nezapočítají, pokud úhel nepřekročí klikové hranice', () => {
    // 120° je pod dřepovým PRAH_NAHORE (160), ale nad klikovým (155) —
    // ukazuje, že prahy obou cviků jsou opravdu nezávislé.
    let stav = krokOpakovani(POCATECNI_STAV, 80, PRAHY_OPAKOVANI.klik.dole, PRAHY_OPAKOVANI.klik.nahore)
    stav = krokOpakovani(stav, 120, PRAHY_OPAKOVANI.dřep.dole, PRAHY_OPAKOVANI.dřep.nahore)
    expect(stav.faze).toBe('dole') // dřepový práh 160 ještě nepřekročen
  })

  it('s vlastními prahy (výpad) počítá stejnou geometrii jako dřep, jen hlubší práh dole', () => {
    const prahy = PRAHY_OPAKOVANI.výpad
    let stav = POCATECNI_STAV
    stav = krokOpakovani(stav, 80, prahy.dole, prahy.nahore) // pod 95 = dole
    expect(stav.faze).toBe('dole')
    stav = krokOpakovani(stav, 170, prahy.dole, prahy.nahore) // nad 165 = nahoře, +1
    expect(stav).toEqual({ faze: 'nahore', pocet: 1 })
  })
})

describe('PRAHY_OPAKOVANI', () => {
  it('drží mezeru mezi dole/nahoře pro všechny tři cviky (hystereze)', () => {
    expect(PRAHY_OPAKOVANI.dřep.nahore).toBeGreaterThan(PRAHY_OPAKOVANI.dřep.dole)
    expect(PRAHY_OPAKOVANI.klik.nahore).toBeGreaterThan(PRAHY_OPAKOVANI.klik.dole)
    expect(PRAHY_OPAKOVANI.výpad.nahore).toBeGreaterThan(PRAHY_OPAKOVANI.výpad.dole)
  })
})

describe('vyberViditelnejsiStranu', () => {
  it('vybere stranu s vyšším součtem viditelnosti boku/kolena/kotníku', () => {
    const body: Bod[] = Array.from({ length: 33 }, () => bod(0, 0, 0))
    body[LM.LEVY_BOK] = bod(0, 0, 1)
    body[LM.LEVE_KOLENO] = bod(0, 0, 1)
    body[LM.LEVY_KOTNIK] = bod(0, 0, 1)
    body[LM.PRAVY_BOK] = bod(0, 0, 0.1)
    body[LM.PRAVE_KOLENO] = bod(0, 0, 0.1)
    body[LM.PRAVY_KOTNIK] = bod(0, 0, 0.1)
    expect(vyberViditelnejsiStranu(body)).toBe('levá')
  })
})

describe('bodyStrany', () => {
  it('vrátí i body pro klik (rameno/loket/zápěstí), ne jen pro dřep', () => {
    const b = bodyStrany('levá')
    expect(b).toMatchObject({
      rameno: LM.LEVE_RAMENO,
      loket: LM.LEVY_LOKET,
      zapesti: LM.LEVE_ZAPESTI,
      bok: LM.LEVY_BOK,
      koleno: LM.LEVE_KOLENO,
      kotnik: LM.LEVY_KOTNIK,
    })
  })
})

describe('jePrknoSpravne', () => {
  it('rovné tělo (úhel blízko 180°) je správná poloha', () => {
    expect(jePrknoSpravne(178)).toBe(true)
    expect(jePrknoSpravne(150)).toBe(true) // přesně na hranici
  })

  it('prohnutá/zvednutá pánev (úhel výrazně pod 150°) správná poloha není', () => {
    expect(jePrknoSpravne(120)).toBe(false)
  })
})

describe('jeZadaNarovnana / odklonTrupu', () => {
  it('svislý trup (rameno přímo nad bokem) je narovnaný', () => {
    expect(jeZadaNarovnana(odklonTrupu(bod(0, 0), bod(0, 1)))).toBe(true)
  })

  it('výrazný předklon narovnaný není', () => {
    // dx=2, dy=1 → atan2(2,1) ≈ 63,4°, jasně nad PRAH_NAROVNANI (45°).
    expect(jeZadaNarovnana(odklonTrupu(bod(2, 0), bod(0, 1)))).toBe(false)
  })
})
