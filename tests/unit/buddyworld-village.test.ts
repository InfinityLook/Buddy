import { describe, expect, it } from 'vitest'
import { VYCHOZI_OSADA, odmenaZaSouboj, cenaRozsireni, lzeRozsirit, rozsiritOsadu, overVillageProgress } from '../../src/buddyworld/villageProgress'

describe('Buddy World – rozvoj osady', () => {
  it('za běžného nepřítele připíše dřevo a kámen', () => {
    expect(odmenaZaSouboj(VYCHOZI_OSADA, false)).toMatchObject({ drevo: 2, kamen: 1, krystaly: 0, porazeniNepratele: 1 })
  })
  it('boss přidá i krystaly', () => {
    expect(odmenaZaSouboj(VYCHOZI_OSADA, true)).toMatchObject({ drevo: 8, kamen: 6, krystaly: 2, porazeniBossove: 1 })
  })
  it('rozšíření odečte správné náklady', () => {
    const stav = { ...VYCHOZI_OSADA, drevo: 9, kamen: 7 }
    expect(lzeRozsirit(stav)).toBe(true)
    expect(rozsiritOsadu(stav)).toMatchObject({ uroven: 2, drevo: 5, kamen: 4 })
  })
  it('nedovolí rozšíření bez materiálu ani nad maximální úroveň', () => {
    expect(rozsiritOsadu(VYCHOZI_OSADA)).toBe(VYCHOZI_OSADA)
    expect(lzeRozsirit({ ...VYCHOZI_OSADA, uroven: 5, drevo: 999, kamen: 999, krystaly: 999 })).toBe(false)
  })
  it('nepřevezme poškozené hodnoty z úložiště', () => {
    expect(overVillageProgress({ uroven: 99, drevo: -8, kamen: 'xxx' })).toMatchObject({ uroven: 1, drevo: 0, kamen: 0 })
  })
  it('cena rozšíření roste s úrovní', () => {
    expect(cenaRozsireni(3)).toEqual({ drevo: 12, kamen: 9, krystaly: 1 })
  })
})
