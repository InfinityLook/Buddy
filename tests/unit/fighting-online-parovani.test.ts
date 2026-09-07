import { describe, expect, it } from 'vitest'
import { jeHostem, odvodKodMistnosti, vyberDvojici } from '@/fighting/onlineParovani'
import type { PritomnostVLobby } from '@/fighting/network'

// ==========================================
// Dvanácté kolo vylepšení — online matchmaking, čisté párovací
// funkce. Stejná disciplína jako combat/engine.ts's vlastní testy —
// žádný React, žádná síť, obě strany volají tyhle funkce na stejných
// vstupních datech a musí dojít ke stejnému závěru bez centrálního
// rozhodčího (viz onlineParovani.ts's vlastní komentář).
// ==========================================

const hrac = (hracId: string, od: number): PritomnostVLobby => ({
  hracId,
  jmeno: hracId,
  postavaId: 'onyx',
  od,
})

describe('vyberDvojici', () => {
  it('vrátí null, když je přítomen jen jeden nebo nikdo', () => {
    expect(vyberDvojici([])).toBeNull()
    expect(vyberDvojici([hrac('a', 1)])).toBeNull()
  })

  it('spáruje dva nejdéle čekající, ne poslední příchozí', () => {
    const pritomni = [hrac('c', 300), hrac('a', 100), hrac('b', 200)]
    const dvojice = vyberDvojici(pritomni)
    expect(dvojice).not.toBeNull()
    expect(dvojice?.map((p) => p.hracId)).toEqual(['a', 'b'])
  })

  it('při shodném "od" rozhodne abecedně podle hracId — appka musí dojít ke stejnému pořadí nezávisle na kterékoli straně', () => {
    const pritomni = [hrac('z', 100), hrac('a', 100)]
    const dvojice = vyberDvojici(pritomni)
    expect(dvojice?.map((p) => p.hracId)).toEqual(['a', 'z'])
  })

  it('nemutuje vstupní pole', () => {
    const pritomni = [hrac('b', 200), hrac('a', 100)]
    const kopie = [...pritomni]
    vyberDvojici(pritomni)
    expect(pritomni).toEqual(kopie)
  })
})

describe('jeHostem', () => {
  it('hostem je vždycky ten s abecedně menším ID, nezávisle na tom, kdo se ptá', () => {
    expect(jeHostem('abc', 'xyz')).toBe(true)
    expect(jeHostem('xyz', 'abc')).toBe(false)
  })
})

describe('odvodKodMistnosti', () => {
  it('vrátí stejný kód bez ohledu na pořadí argumentů — obě strany volají s opačným pořadím', () => {
    expect(odvodKodMistnosti('hrac-aaa', 'hrac-bbb')).toBe(odvodKodMistnosti('hrac-bbb', 'hrac-aaa'))
  })

  it('dvě různé dvojice dostanou různý kód', () => {
    expect(odvodKodMistnosti('a', 'b')).not.toBe(odvodKodMistnosti('a', 'c'))
  })
})
