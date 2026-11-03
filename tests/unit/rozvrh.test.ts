import { describe, it, expect } from 'vitest'
import {
  HodinaRozvrhu,
  NavrhHodiny,
  PRAH_RIZIKA_DOCHAZKY,
  Presun,
  ZrusenaHodina,
  denVTydnuZDatumu,
  efektivniRozvrhProDatum,
  hodinyDnes,
  jeDenPrazdninovy,
  jeHodinaZrusenaVDatu,
  jeNavrhDuplicitni,
  klicDochazky,
  najdiKolize,
  naparsujIcsRozvrh,
  paritaTydne,
  serazenoPodleCasu,
  sestavIcsRozvrhu,
  spocitejDochazkuPodlePredmetu,
  spocitejDovolenychAbsenci,
  tydenHodiny,
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

  it('tyden se správně extrahuje i pro archivovaný semestr', () => {
    const vysledek = validateRozvrhData({
      hodiny: [hodina({ id: 'h1' })],
      prazdniny: [{ id: 'p1', nazev: 'Letní', datumOd: '2024-07-01', datumDo: '2024-08-31' }],
      zruseneHodiny: [{ id: 'z1', hodinaId: 'h1', datum: '2024-01-08' }],
      presuny: [
        { id: 'pr1', hodinaId: 'h1', puvodniDatum: '2024-01-08', novyDatum: '2024-01-10', novyCasOd: '14:00', novyCasDo: '15:00' },
      ],
      semestry: [
        {
          id: 's1',
          nazev: 'Zimní semestr',
          datumOd: '2024-09-01',
          datumDo: '2024-12-31',
          hodiny: [hodina({ id: 'archiv-1', tyden: 'sudy' })],
        },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (!vysledek.success) return
    expect(vysledek.data.prazdniny).toHaveLength(1)
    expect(vysledek.data.zruseneHodiny).toHaveLength(1)
    expect(vysledek.data.presuny).toHaveLength(1)
    expect(vysledek.data.semestry).toHaveLength(1)
    expect(vysledek.data.semestry[0].hodiny[0].tyden).toBe('sudy')
  })

  it('prázdniny s datumOd po datumDo, zrušení/přesun na neexistující hodinu se tiše vyřadí', () => {
    const vysledek = validateRozvrhData({
      hodiny: [hodina({ id: 'h1' })],
      prazdniny: [{ id: 'p1', nazev: 'Špatné', datumOd: '2024-08-31', datumDo: '2024-07-01' }],
      zruseneHodiny: [{ id: 'z1', hodinaId: 'neexistuje', datum: '2024-01-08' }],
      presuny: [
        { id: 'pr1', hodinaId: 'neexistuje', puvodniDatum: '2024-01-08', novyDatum: '2024-01-10', novyCasOd: '14:00', novyCasDo: '15:00' },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (!vysledek.success) return
    expect(vysledek.data.prazdniny).toEqual([])
    expect(vysledek.data.zruseneHodiny).toEqual([])
    expect(vysledek.data.presuny).toEqual([])
  })
})

describe('paritaTydne', () => {
  it('ISO týden 1 roku 2024 (pondělí 1. ledna) je lichý', () => {
    expect(paritaTydne('2024-01-01')).toBe('lichy')
  })

  it('ISO týden 2 (pondělí 8. ledna) je sudý', () => {
    expect(paritaTydne('2024-01-08')).toBe('sudy')
  })

  it('ISO týden 3 (pondělí 15. ledna) je zase lichý', () => {
    expect(paritaTydne('2024-01-15')).toBe('lichy')
  })

  it('parita se mění každý týden a vrátí se po dvou týdnech', () => {
    expect(paritaTydne('2024-01-01')).not.toBe(paritaTydne('2024-01-08'))
    expect(paritaTydne('2024-01-01')).toBe(paritaTydne('2024-01-15'))
  })
})

describe('tydenHodiny', () => {
  it('starší hodina bez pole tyden se počítá jako "kazdy"', () => {
    expect(tydenHodiny(hodina())).toBe('kazdy')
  })

  it('hodina se zadaným cyklem vrátí přesně ten', () => {
    expect(tydenHodiny(hodina({ tyden: 'lichy' }))).toBe('lichy')
  })
})

describe('jeDenPrazdninovy', () => {
  const prazdniny = [
    { id: 'p1', nazev: 'Letní', datumOd: '2024-07-01', datumDo: '2024-08-31', createdAt: '', updatedAt: 0, deletedAt: null },
  ]

  it('datum uvnitř rozsahu (včetně krajů) vrátí tu položku', () => {
    expect(jeDenPrazdninovy(prazdniny, '2024-07-15')?.nazev).toBe('Letní')
    expect(jeDenPrazdninovy(prazdniny, '2024-07-01')?.nazev).toBe('Letní')
    expect(jeDenPrazdninovy(prazdniny, '2024-08-31')?.nazev).toBe('Letní')
  })

  it('datum mimo rozsah vrátí null', () => {
    expect(jeDenPrazdninovy(prazdniny, '2024-09-01')).toBeNull()
  })

  it('smazaná prázdnina se ignoruje', () => {
    const smazana = [{ ...prazdniny[0], deletedAt: 1 }]
    expect(jeDenPrazdninovy(smazana, '2024-07-15')).toBeNull()
  })
})

describe('jeHodinaZrusenaVDatu', () => {
  const zrusene: ZrusenaHodina[] = [
    { id: 'z1', hodinaId: 'h1', datum: '2024-01-08', createdAt: '', updatedAt: 0, deletedAt: null },
  ]

  it('shoda na hodinaId i datu vrátí true', () => {
    expect(jeHodinaZrusenaVDatu(zrusene, 'h1', '2024-01-08')).toBe(true)
  })

  it('jiný den stejné hodiny vrátí false', () => {
    expect(jeHodinaZrusenaVDatu(zrusene, 'h1', '2024-01-15')).toBe(false)
  })

  it('smazané (obnovené) zrušení se ignoruje', () => {
    const obnovene = [{ ...zrusene[0], deletedAt: 1 }]
    expect(jeHodinaZrusenaVDatu(obnovene, 'h1', '2024-01-08')).toBe(false)
  })
})

describe('efektivniRozvrhProDatum', () => {
  it('prázdninový den vrátí prázdné pole bez ohledu na rozvrh', () => {
    const hodiny = [hodina({ id: 'h1', den: 1 })]
    const prazdniny = [{ id: 'p1', nazev: 'Letní', datumOd: '2024-07-01', datumDo: '2024-08-31', createdAt: '', updatedAt: 0, deletedAt: null }]
    expect(efektivniRozvrhProDatum(hodiny, prazdniny, [], [], '2024-07-15')).toEqual([])
  })

  it('víkendové datum vrátí prázdné pole', () => {
    const hodiny = [hodina({ id: 'h1', den: 1 })]
    expect(efektivniRozvrhProDatum(hodiny, [], [], [], '2024-01-06')).toEqual([]) // sobota
  })

  it('"kazdy" cyklus se ukáže na obě parity', () => {
    const hodiny = [hodina({ id: 'h1', den: 1, tyden: 'kazdy' })]
    expect(efektivniRozvrhProDatum(hodiny, [], [], [], '2024-01-01').map((e) => e.hodina.id)).toEqual(['h1']) // lichý
    expect(efektivniRozvrhProDatum(hodiny, [], [], [], '2024-01-08').map((e) => e.hodina.id)).toEqual(['h1']) // sudý
  })

  it('"sudy" cyklus se ukáže jen na sudém týdnu', () => {
    const hodiny = [hodina({ id: 'h1', den: 1, tyden: 'sudy' })]
    expect(efektivniRozvrhProDatum(hodiny, [], [], [], '2024-01-01')).toEqual([]) // lichý
    expect(efektivniRozvrhProDatum(hodiny, [], [], [], '2024-01-08').map((e) => e.hodina.id)).toEqual(['h1']) // sudý
  })

  it('zrušený výskyt se dál ukáže (appka ho musí vidět, aby mohla ukázat "Zrušeno"), ale s zrusena: true', () => {
    const hodiny = [hodina({ id: 'h1', den: 1 })]
    const zrusene: ZrusenaHodina[] = [{ id: 'z1', hodinaId: 'h1', datum: '2024-01-08', createdAt: '', updatedAt: 0, deletedAt: null }]
    const vysledek = efektivniRozvrhProDatum(hodiny, [], zrusene, [], '2024-01-08')
    expect(vysledek).toHaveLength(1)
    expect(vysledek[0].zrusena).toBe(true)
  })

  it('hodina přesunutá PRYČ z tohodle data na svém původním místě vůbec nezaujme (objeví se jinde)', () => {
    const hodiny = [hodina({ id: 'h1', den: 1 })]
    const presuny: Presun[] = [
      { id: 'pr1', hodinaId: 'h1', puvodniDatum: '2024-01-08', novyDatum: '2024-01-10', novyCasOd: '14:00', novyCasDo: '15:00', createdAt: '', updatedAt: 0, deletedAt: null },
    ]
    expect(efektivniRozvrhProDatum(hodiny, [], [], presuny, '2024-01-08')).toEqual([])
  })

  it('hodina přesunutá SEM se ukáže s novým časem a presunutoZ na původní datum', () => {
    const hodiny = [hodina({ id: 'h1', den: 1, casOd: '08:00', casDo: '09:40' })]
    const presuny: Presun[] = [
      { id: 'pr1', hodinaId: 'h1', puvodniDatum: '2024-01-08', novyDatum: '2024-01-10', novyCasOd: '14:00', novyCasDo: '15:00', createdAt: '', updatedAt: 0, deletedAt: null },
    ]
    // 2024-01-10 je středa — mimo normální den hodiny (pondělí), takže
    // se tam objeví JEN díky přesunu, ne podle šablony.
    const vysledek = efektivniRozvrhProDatum(hodiny, [], [], presuny, '2024-01-10')
    expect(vysledek).toHaveLength(1)
    expect(vysledek[0]).toMatchObject({ casOd: '14:00', casDo: '15:00', zrusena: false, presunutoZ: '2024-01-08' })
  })

  it('zrušený přesun (deletedAt) se neprojeví vůbec — hodina zůstává na svém místě', () => {
    const hodiny = [hodina({ id: 'h1', den: 1 })]
    const presuny: Presun[] = [
      { id: 'pr1', hodinaId: 'h1', puvodniDatum: '2024-01-08', novyDatum: '2024-01-10', novyCasOd: '14:00', novyCasDo: '15:00', createdAt: '', updatedAt: 0, deletedAt: 1 },
    ]
    expect(efektivniRozvrhProDatum(hodiny, [], [], presuny, '2024-01-08').map((e) => e.hodina.id)).toEqual(['h1'])
    expect(efektivniRozvrhProDatum(hodiny, [], [], presuny, '2024-01-10')).toEqual([])
  })

  it('výsledek je seřazený podle efektivního času začátku', () => {
    const hodiny = [
      hodina({ id: 'pozdejsi', den: 1, casOd: '14:00', casDo: '15:00' }),
      hodina({ id: 'drivejsi', den: 1, casOd: '08:00', casDo: '09:00' }),
    ]
    expect(efektivniRozvrhProDatum(hodiny, [], [], [], '2024-01-08').map((e) => e.hodina.id)).toEqual([
      'drivejsi',
      'pozdejsi',
    ])
  })
})

describe('sestavIcsRozvrhu — sudý/lichý cyklus', () => {
  it('"kazdy" cyklus zůstává prostý WEEKLY beze změny', () => {
    const ics = sestavIcsRozvrhu([hodina({ tyden: 'kazdy' })], new Date('2024-01-03T12:00:00'))
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO')
    expect(ics).not.toContain('INTERVAL')
  })

  it('"sudy"/"lichy" cyklus vyjádří jako RRULE;INTERVAL=2, kotvený na SPRÁVNOU paritu', () => {
    const ics = sestavIcsRozvrhu([hodina({ tyden: 'sudy' })], new Date('2024-01-03T12:00:00')) // středa
    expect(ics).toContain('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO')
    // Nejbližší pondělí od středy 3. ledna je 8. ledna — to je SUDÝ
    // týden, takže sedí hned napoprvé, appka nemusí doskočit o týden dál.
    expect(ics).toContain('DTSTART:20240108T080000')
  })

  it('když první kandidátní datum padne na špatnou paritu, DTSTART doskočí o týden dál', () => {
    const ics = sestavIcsRozvrhu([hodina({ tyden: 'lichy' })], new Date('2024-01-03T12:00:00')) // středa
    // Nejbližší pondělí (8. ledna) je sudé, appka proto kotví na 15. ledna.
    expect(ics).toContain('DTSTART:20240115T080000')
  })
})

describe('naparsujIcsRozvrh', () => {
  it('rozebere opakující se (WEEKLY) VEVENT na návrh hodiny', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'DTSTART:20240108T080000',
      'DTEND:20240108T094000',
      'RRULE:FREQ=WEEKLY;BYDAY=MO',
      'SUMMARY:Matematika',
      'LOCATION:A1',
      'DESCRIPTION:Dr. Novák',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const navrhy = naparsujIcsRozvrh(text)
    expect(navrhy).toEqual([
      { den: 1, casOd: '08:00', casDo: '09:40', predmet: 'Matematika', mistnost: 'A1', vyucujici: 'Dr. Novák', tyden: 'kazdy' },
    ])
  })

  it('jednorázová (nikdy se neopakující) událost se přeskočí — Rozvrh je šablona, ne kalendář termínů', () => {
    const text = [
      'BEGIN:VEVENT',
      'DTSTART:20240108T080000',
      'DTEND:20240108T094000',
      'SUMMARY:Jednorázová schůzka',
      'END:VEVENT',
    ].join('\r\n')
    expect(naparsujIcsRozvrh(text)).toEqual([])
  })

  it('INTERVAL=2 se rozpozná a parita se odvodí ze dne DTSTART', () => {
    // 8. ledna 2024 je sudý týden (viz paritaTydne výš).
    const text = [
      'BEGIN:VEVENT',
      'DTSTART:20240108T140000',
      'DTEND:20240108T150000',
      'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO',
      'SUMMARY:Seminář',
      'END:VEVENT',
    ].join('\r\n')
    expect(naparsujIcsRozvrh(text)[0].tyden).toBe('sudy')
  })

  it('zpětně odescapuje čárku/středník/zpětné lomítko z RFC 5545 TEXT polí', () => {
    const text = [
      'BEGIN:VEVENT',
      'DTSTART:20240108T080000',
      'DTEND:20240108T094000',
      'RRULE:FREQ=WEEKLY;BYDAY=MO',
      'SUMMARY:Dějiny\\, filozofie\\; úvod\\\\pokročilý',
      'END:VEVENT',
    ].join('\r\n')
    expect(naparsujIcsRozvrh(text)[0].predmet).toBe('Dějiny, filozofie; úvod\\pokročilý')
  })

  it('kompletní cyklus appkou exportovaný .ics se zpátky naparsuje na stejnou hodinu', () => {
    const original = hodina({ predmet: 'Fyzika', mistnost: 'B2', vyucujici: 'Dr. X', tyden: 'sudy' })
    const ics = sestavIcsRozvrhu([original], new Date('2024-01-03T12:00:00'))
    const navrhy = naparsujIcsRozvrh(ics)
    expect(navrhy).toEqual([
      { den: 1, casOd: '08:00', casDo: '09:40', predmet: 'Fyzika', mistnost: 'B2', vyucujici: 'Dr. X', tyden: 'sudy' },
    ])
  })

  it('prázdný/nesmyslný text vrátí prázdné pole', () => {
    expect(naparsujIcsRozvrh('')).toEqual([])
    expect(naparsujIcsRozvrh('nesmysl')).toEqual([])
  })
})

describe('jeNavrhDuplicitni', () => {
  const navrh: NavrhHodiny = { den: 1, casOd: '08:00', casDo: '09:40', predmet: 'Matematika', mistnost: 'A1', vyucujici: '', tyden: 'kazdy' }

  it('stejný den, čas začátku a předmět (case-insensitive) je duplicita', () => {
    expect(jeNavrhDuplicitni(navrh, [hodina({ predmet: 'MATEMATIKA' })])).toBe(true)
  })

  it('jiný předmět nebo jiný den/čas není duplicita', () => {
    expect(jeNavrhDuplicitni(navrh, [hodina({ predmet: 'Fyzika' })])).toBe(false)
    expect(jeNavrhDuplicitni({ ...navrh, den: 2 }, [hodina()])).toBe(false)
    expect(jeNavrhDuplicitni({ ...navrh, casOd: '09:00' }, [hodina()])).toBe(false)
  })

  it('prázdný rozvrh nikdy nemá duplicitu', () => {
    expect(jeNavrhDuplicitni(navrh, [])).toBe(false)
  })
})
