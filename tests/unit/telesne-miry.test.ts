import { describe, it, expect } from 'vitest'
import { spocitejGrafVahy, serazenoPodleData, formatujRozdilVahy } from '@/flagships/fitness-room/telesneMiryStats'
import { validateTelesneMiryData } from '@/core/utils/telesneMiryValidation'
import type { ZaznamMiry } from '@/flagships/fitness-room/useTelesneMiry'

const zaznam = (id: string, datum: string, vahaKg: number | null, obvodPasuCm: number | null = null): ZaznamMiry => ({
  id,
  datum,
  vahaKg,
  obvodPasuCm,
})

describe('serazenoPodleData', () => {
  it('seřadí záznamy chronologicky vzestupně bez ohledu na pořadí vstupu', () => {
    const zaznamy = [zaznam('a', '2024-03-01', 80), zaznam('b', '2024-01-01', 82), zaznam('c', '2024-02-01', 81)]
    expect(serazenoPodleData(zaznamy).map((z) => z.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('spocitejGrafVahy', () => {
  it('prázdné pole (žádná váha) vrátí prázdný graf', () => {
    expect(spocitejGrafVahy([])).toEqual([])
    expect(spocitejGrafVahy([zaznam('a', '2024-01-01', null, 80)])).toEqual([])
  })

  it('jediný bod dostane 50 % výšky, ne dělení nulou', () => {
    const graf = spocitejGrafVahy([zaznam('a', '2024-01-01', 75)])
    expect(graf).toHaveLength(1)
    expect(graf[0].vyskaProcent).toBe(50)
  })

  it('stejná váha ve všech záznamech taky dá 50 % pro každý', () => {
    const graf = spocitejGrafVahy([zaznam('a', '2024-01-01', 75), zaznam('b', '2024-01-02', 75)])
    expect(graf.every((b) => b.vyskaProcent === 50)).toBe(true)
  })

  it('nejnižší váha v okně dostane 10 %, nejvyšší 90 %, ne 0/100', () => {
    const graf = spocitejGrafVahy([
      zaznam('a', '2024-01-01', 70),
      zaznam('b', '2024-01-02', 80),
    ])
    expect(graf.find((b) => b.id === 'a')?.vyskaProcent).toBe(10)
    expect(graf.find((b) => b.id === 'b')?.vyskaProcent).toBe(90)
  })

  it('vezme jen posledních N záznamů s vyplněnou váhou', () => {
    const zaznamy = Array.from({ length: 20 }, (_, i) => zaznam(`z${i}`, `2024-01-${String(i + 1).padStart(2, '0')}`, 70 + i))
    const graf = spocitejGrafVahy(zaznamy, 5)
    expect(graf).toHaveLength(5)
    expect(graf[graf.length - 1].id).toBe('z19')
  })
})

describe('formatujRozdilVahy', () => {
  it('bez předchozího záznamu vrátí null', () => {
    expect(formatujRozdilVahy(75, null)).toBeNull()
  })

  it('nárůst se ukáže se znaménkem plus', () => {
    expect(formatujRozdilVahy(76, 75)).toBe('+1 kg od posledního záznamu')
  })

  it('pokles se ukáže se záporným znaménkem', () => {
    expect(formatujRozdilVahy(74, 75)).toBe('-1 kg od posledního záznamu')
  })

  it('beze změny má vlastní hlášku, ne "+0"', () => {
    expect(formatujRozdilVahy(75, 75)).toBe('beze změny od posledního záznamu')
  })
})

describe('validateTelesneMiryData', () => {
  it('platné pole projde beze změny', () => {
    const vysledek = validateTelesneMiryData([{ id: 'a', datum: '2024-01-01', vahaKg: 75, obvodPasuCm: 80 }])
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data).toHaveLength(1)
  })

  it('položka bez id se tiše vyřadí, zbytek zůstane', () => {
    const vysledek = validateTelesneMiryData([
      { id: 'a', datum: '2024-01-01', vahaKg: 75, obvodPasuCm: null },
      { datum: '2024-01-02', vahaKg: 76, obvodPasuCm: null },
    ])
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data).toHaveLength(1)
      expect(vysledek.data[0].id).toBe('a')
    }
  })

  it('záporná nebo nulová váha/obvod spadne na null, položka se nevyřadí', () => {
    const vysledek = validateTelesneMiryData([{ id: 'a', datum: '2024-01-01', vahaKg: -5, obvodPasuCm: 0 }])
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data[0].vahaKg).toBeNull()
      expect(vysledek.data[0].obvodPasuCm).toBeNull()
    }
  })

  it('úplně neplatný tvar dat (ne pole) se odmítne', () => {
    expect(validateTelesneMiryData('nesmysl').success).toBe(false)
    expect(validateTelesneMiryData(undefined).success).toBe(false)
  })
})
