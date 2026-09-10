import { describe, it, expect } from 'vitest'
import {
  HodinaRozvrhu,
  PRAH_RIZIKA_DOCHAZKY,
  denVTydnuZDatumu,
  hodinyDnes,
  klicDochazky,
  serazenoPodleCasu,
  sestavIcsRozvrhu,
  spocitejDochazkuPodlePredmetu,
} from '@/miniapps/rozvrh/types'
import { validateRozvrhData } from '@/core/utils/rozvrhValidation'

// ==========================================
// Pure funkce Rozvrhu — řazení, docházka, .ics export a ověření
// uložených dat, stejná "žádný store, testovatelné bez komponenty"
// disciplína jako Kalendář vedle něj.
// ==========================================

const hodina = (over: Partial<HodinaRozvrhu> = {}): HodinaRozvrhu => ({
  id: 'h1',
  den: 1,
  casOd: '08:00',
  casDo: '09:40',
  predmet: 'Matematika',
  mistnost: 'A1',
  vyucujici: 'Dr. Novák',
  ...over,
})

describe('serazenoPodleCasu', () => {
  it('řadí podle dne a uvnitř dne podle času', () => {
    const hodiny = [
      hodina({ id: 'a', den: 2, casOd: '08:00' }),
      hodina({ id: 'b', den: 1, casOd: '10:00' }),
      hodina({ id: 'c', den: 1, casOd: '08:00' }),
    ]
    expect(serazenoPodleCasu(hodiny).map((h) => h.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('denVTydnuZDatumu', () => {
  it('vrátí 1–5 pro všední den, null o víkendu', () => {
    expect(denVTydnuZDatumu(new Date('2024-01-01T12:00:00'))).toBe(1) // pondělí
    expect(denVTydnuZDatumu(new Date('2024-01-06T12:00:00'))).toBeNull() // sobota
    expect(denVTydnuZDatumu(new Date('2024-01-07T12:00:00'))).toBeNull() // neděle
  })
})

describe('hodinyDnes', () => {
  it('vrátí jen hodiny odpovídající dnešnímu dni, seřazené', () => {
    const hodiny = [hodina({ id: 'a', den: 1 }), hodina({ id: 'b', den: 2 })]
    expect(hodinyDnes(hodiny, new Date('2024-01-01T12:00:00')).map((h) => h.id)).toEqual(['a'])
  })

  it('o víkendu vrátí prázdné pole', () => {
    const hodiny = [hodina({ id: 'a', den: 1 })]
    expect(hodinyDnes(hodiny, new Date('2024-01-06T12:00:00'))).toEqual([])
  })
})

describe('spocitejDochazkuPodlePredmetu', () => {
  it('spočítá % docházky a seřadí od nejnižší', () => {
    const hodiny = [hodina({ id: 'h1', predmet: 'Matematika' }), hodina({ id: 'h2', predmet: 'Fyzika' })]
    const dochazka = {
      [klicDochazky('h1', '2024-01-01')]: true,
      [klicDochazky('h1', '2024-01-08')]: false,
      [klicDochazky('h2', '2024-01-01')]: true,
    }
    const vysledek = spocitejDochazkuPodlePredmetu(hodiny, dochazka)
    expect(vysledek).toEqual([
      { predmet: 'Matematika', celkem: 2, pritomen: 1, procenta: 50 },
      { predmet: 'Fyzika', celkem: 1, pritomen: 1, procenta: 100 },
    ])
  })

  it('docházka na neexistující hodinu se tiše vynechá', () => {
    const vysledek = spocitejDochazkuPodlePredmetu([], { [klicDochazky('neexistuje', '2024-01-01')]: true })
    expect(vysledek).toEqual([])
  })

  it('práh rizika docházky je 75 %', () => {
    expect(PRAH_RIZIKA_DOCHAZKY).toBe(75)
  })
})

describe('sestavIcsRozvrhu', () => {
  it('sestaví platný .ics se skutečnými hodnotami hodiny', () => {
    const ics = sestavIcsRozvrhu([hodina()], new Date('2024-01-03T12:00:00')) // středa
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO')
    expect(ics).toContain('SUMMARY:Matematika')
    expect(ics).toContain('LOCATION:A1')
    expect(ics).toContain('DESCRIPTION:Dr. Novák')
    // Nejbližší pondělí od středy 3. ledna 2024 je 8. ledna.
    expect(ics).toContain('DTSTART:20240108T080000')
    expect(ics).toContain('DTEND:20240108T094000')
  })

  it('prázdný rozvrh vrátí platnou, jen prázdnou kostru kalendáře', () => {
    const ics = sestavIcsRozvrhu([])
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
    expect(ics).not.toContain('BEGIN:VEVENT')
  })
})

describe('validateRozvrhData', () => {
  it('projde platná data beze změny', () => {
    const vysledek = validateRozvrhData({ hodiny: [hodina()], dochazka: { [klicDochazky('h1', '2024-01-01')]: true } })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.hodiny).toHaveLength(1)
      expect(vysledek.data.dochazka[klicDochazky('h1', '2024-01-01')]).toBe(true)
    }
  })

  it('hodina mimo den 1–5 nebo s neplatným časem se tiše vyřadí', () => {
    const vysledek = validateRozvrhData({
      hodiny: [hodina({ id: 'spatny-den', den: 9 as any }), hodina({ id: 'spatny-cas', casOd: '99:99' })],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.hodiny).toHaveLength(0)
  })

  it('hodina bez předmětu se tiše vyřadí', () => {
    const vysledek = validateRozvrhData({ hodiny: [hodina({ predmet: '  ' })] })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.hodiny).toHaveLength(0)
  })

  it('docházka na hodinu, co po sanitizaci neexistuje, se zahodí', () => {
    const vysledek = validateRozvrhData({
      hodiny: [hodina({ predmet: '' })], // sama se vyřadí
      dochazka: { [klicDochazky('h1', '2024-01-01')]: true },
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.dochazka).toEqual({})
  })

  it('data, co vůbec neodpovídají tvaru, se odmítnou', () => {
    expect(validateRozvrhData('nesmysl').success).toBe(false)
  })
})
