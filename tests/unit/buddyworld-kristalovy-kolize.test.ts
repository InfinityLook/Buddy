import { describe, it, expect } from 'vitest'
import { hracDosahneNaBosse, oddelTelesa, vZasahoveZone, novyKristalovySouboj, tikKristalovehoStrazce, uhniKristalovemuStrazci, KRYSTALOVY_TELO_BOSSE, KRYSTALOVY_TELO_HRACE } from '../../src/buddyworld/data/kristalovyStrazce'

describe('v7.0 – prostorové kolize a úhyb', () => {
  it('melee uses the actual moving boss position', () => {
    expect(hracDosahneNaBosse({x: 0,z: 4}, {x: 3,z: 4})).toBe(true)
    expect(hracDosahneNaBosse({x: 0,z: 4}, {x: 7,z: 4})).toBe(false)
  })
  it('separates overlapping player and boss bodies', () => {
    const result = oddelTelesa({x: 0,z: 4}, {x: 0,z: 4})
    expect(Math.hypot(result.x, result.z - 4)).toBeCloseTo(KRYSTALOVY_TELO_BOSSE + KRYSTALOVY_TELO_HRACE)
  })
  it('adds player body radius to telegraph edge', () => {
    expect(vZasahoveZone({x: 3.3,z: 4}, {x: 0,z: 4}, 3.1)).toBe(true)
    expect(vZasahoveZone({x: 4,z: 4}, {x: 0,z: 4}, 3.1)).toBe(false)
  })
  it('dodge protects only during its active window', () => {
    const s = novyKristalovySouboj(1000)
    // dalsiUtokMs je 3600 — útok se doopravdy vyhodnotí až tam, nikdy dřív
    // (tikKristalovehoStrazce před ním vrací jen pohybový stav). uhybDoMs
    // skončí v 3100, tedy dřív, než útok vůbec dorazí — appka proto testuje
    // na 3700 (po skutečném vyhodnocení útoku, s úhybem už promlčeným),
    // ne na 3200, kde appka před odpraveným útokem nikdy nic neodečte.
    const dodge = uhniKristalovemuStrazci(s, 2500)
    expect(tikKristalovehoStrazce(dodge, 2600, {x:0,z:4}).hracHp).toBe(s.hracHp)
    expect(tikKristalovehoStrazce(dodge, 3700, {x:0,z:4}).hracHp).toBeLessThan(s.hracHp)
  })
})
