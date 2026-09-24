import { describe, it, expect } from 'vitest'
import {
  HodinaRozvrhu,
  PRAH_RIZIKA_DOCHAZKY,
  denVTydnuZDatumu,
  hodinyDnes,
  klicDochazky,
  najdiKolize,
  serazenoPodleCasu,
  sestavIcsRozvrhu,
  spocitejDochazkuPodlePredmetu,
  spocitejDovolenychAbsenci,
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
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: 0,
  deletedAt: null,
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
      { predmet: 'Matematika', celkem: 2, pritomen: 1, procenta: 50, pocetDovolenychAbsenci: 0 },
      { predmet: 'Fyzika', celkem: 1, pritomen: 1, procenta: 100, pocetDovolenychAbsenci: 0 },
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

describe('spocitejDovolenychAbsenci', () => {
  it('spočítá, kolik dalších absencí předmět ještě snese, než klesne pod práh', () => {
    // 18/20 = 90 %. Sneseme 4 další absence: 18/24 = 75 % (přesně na prahu).
    expect(spocitejDovolenychAbsenci(20, 18)).toBe(4)
  })

  it('předmět už pod prahem nesnese žádnou další absenci', () => {
    expect(spocitejDovolenychAbsenci(4, 1)).toBe(0)
  })

  it('nikdy nevrátí záporné číslo', () => {
    expect(spocitejDovolenychAbsenci(10, 1)).toBe(0)
  })

  it('perfektní docházka s jedinou hodinou nesnese žádnou další absenci', () => {
    // 1/1 = 100 %, ale 1/2 = 50 % už je pod prahem.
    expect(spocitejDovolenychAbsenci(1, 1)).toBe(0)
  })
})

describe('najdiKolize', () => {
  const existujici = [hodina({ id: 'h1', den: 1, casOd: '08:00', casDo: '09:40' })]

  it('najde kolizi, když se časy stejného dne překrývají', () => {
    expect(najdiKolize(existujici, 1, '09:00', '10:00').map((h) => h.id)).toEqual(['h1'])
  })

  it('žádná kolize v jiný den, i se stejným časem', () => {
    expect(najdiKolize(existujici, 2, '08:00', '09:40')).toEqual([])
  })

  it('žádná kolize, když se časy jen dotýkají, ale nepřekrývají (konec = začátek)', () => {
    expect(najdiKolize(existujici, 1, '09:40', '10:30')).toEqual([])
    expect(najdiKolize(existujici, 1, '07:00', '08:00')).toEqual([])
  })

  it('vlastní id se vynechá — úprava hodiny sama proti sobě nikdy nekoliduje', () => {
    expect(najdiKolize(existujici, 1, '08:00', '09:40', 'h1')).toEqual([])
  })

  it('celý interval obsažený uvnitř existující hodiny je taky kolize', () => {
    expect(najdiKolize(existujici, 1, '08:30', '09:00').map((h) => h.id)).toEqual(['h1'])
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

  it('escapuje čárku, středník a zpětné lomítko v textových polích (RFC 5545)', () => {
    const ics = sestavIcsRozvrhu([
      hodina({ predmet: 'Dějiny, filozofie; úvod\\pokročilý', mistnost: 'A1, patro 2', vyucujici: 'Dr. X; Y' }),
    ])
    expect(ics).toContain('SUMMARY:Dějiny\\, filozofie\\; úvod\\\\pokročilý')
    expect(ics).toContain('LOCATION:A1\\, patro 2')
    expect(ics).toContain('DESCRIPTION:Dr. X\\; Y')
  })
})

describe('validateRozvrhData', () => {
  it('projde platná data beze změny (nový tvar dochazkaZaznamy)', () => {
    const klic = klicDochazky('h1', '2024-01-01')
    const vysledek = validateRozvrhData({
      hodiny: [hodina()],
      dochazkaZaznamy: [{ id: klic, hodinaId: 'h1', datum: '2024-01-01', byl: true }],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.hodiny).toHaveLength(1)
      expect(vysledek.data.dochazkaZaznamy).toHaveLength(1)
      expect(vysledek.data.dochazkaZaznamy[0].byl).toBe(true)
    }
  })

  it('starší tvar (dochazka jako Record<klic, byl>) se tiše převede na nový', () => {
    const klic = klicDochazky('h1', '2024-01-01')
    const vysledek = validateRozvrhData({ hodiny: [hodina()], dochazka: { [klic]: true } })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.dochazkaZaznamy).toHaveLength(1)
      expect(vysledek.data.dochazkaZaznamy[0]).toMatchObject({ id: klic, hodinaId: 'h1', datum: '2024-01-01', byl: true })
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
    if (vysledek.success) expect(vysledek.data.dochazkaZaznamy).toEqual([])
  })

  it('data, co vůbec neodpovídají tvaru, se odmítnou', () => {
    expect(validateRozvrhData('nesmysl').success).toBe(false)
  })
})
