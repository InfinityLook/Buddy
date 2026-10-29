import { describe, it, expect } from 'vitest'
import {
  Udalost,
  IcsNavrh,
  jeIcsDuplicitni,
  jeVicedenni,
  naparsujIcs,
  najdiDalsiPripominkuKalendare,
  najdiDalsiPripominkuProUdalost,
  pocetNadchazejicichUdalosti,
  posunDatumStr,
  sestavIcsKalendare,
  udalostSeVyskytujeVDen,
  zacatekVyskytuPokryvajiciDen,
} from '@/miniapps/kalendar/types'
import { validateKalendarData } from '@/core/utils/kalendarValidation'
import { tydenOd } from '@/miniapps/kalendar/useKalendar'

// ==========================================
// Opakující se události (viz CLAUDE.md) — appka nikdy neukládá
// jednotlivé budoucí výskyty zvlášť, jen první datum a typ opakování,
// takže výskyt se vždycky počítá znovu, ne čte z uloženého seznamu.
//
// Fáze 2 (profesionální rozšíření — vícedenní události, výjimky,
// vlastní připomínky, .ics export/import) rozšiřuje tu samou testovací
// sadu, ne nahrazuje ji — appka si tu zpětnou kompatibilitu dokazuje
// přímo testem (žádná ze starých jednoduchých kontrol nebyla upravena).
// ==========================================

const udalost = (patch: Partial<Udalost> = {}): Udalost => ({
  id: 'u1',
  datum: '2025-01-06', // pondělí
  nazev: 'Test',
  popis: '',
  createdAt: 0,
  opakovani: 'zadne',
  celodenni: true,
  vyjimky: [],
  pripominkaMinut: null,
  updatedAt: 0,
  deletedAt: null,
  ...patch,
})

describe('udalostSeVyskytujeVDen', () => {
  it('jednorázová událost se vyskytuje jen ve svém vlastním dni', () => {
    const u = udalost({ opakovani: 'zadne' })
    expect(udalostSeVyskytujeVDen(u, '2025-01-06')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-01-13')).toBe(false)
  })

  it('žádná událost se nikdy nevyskytuje PŘED svým prvním datem', () => {
    const u = udalost({ datum: '2025-01-06', opakovani: 'tydne' })
    expect(udalostSeVyskytujeVDen(u, '2025-01-05')).toBe(false)
  })

  it('týdenní opakování se vyskytuje o 7, 14, 21 dní později, ne mimo', () => {
    const u = udalost({ datum: '2025-01-06', opakovani: 'tydne' })
    expect(udalostSeVyskytujeVDen(u, '2025-01-13')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-01-20')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-01-27')).toBe(true)
    // O den vedle — stejný týden v týdnu ale ne násobek 7 dní od prvního.
    expect(udalostSeVyskytujeVDen(u, '2025-01-14')).toBe(false)
  })

  it('měsíční opakování se vyskytuje ve stejný den v měsíci, i v jiném roce', () => {
    const u = udalost({ datum: '2025-01-15', opakovani: 'mesicne' })
    expect(udalostSeVyskytujeVDen(u, '2025-02-15')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2026-01-15')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-02-16')).toBe(false)
  })

  it('měsíční opakování na 31. den prostě přeskočí měsíc, co ho nemá', () => {
    const u = udalost({ datum: '2025-01-31', opakovani: 'mesicne' })
    expect(udalostSeVyskytujeVDen(u, '2025-04-30')).toBe(false)
    expect(udalostSeVyskytujeVDen(u, '2025-03-31')).toBe(true)
  })

  // --- Fáze 2: vícedenní rozpětí ---

  it('vícedenní jednorázová událost se vyskytuje KAŽDÝ den svého rozpětí, ne jen první', () => {
    const u = udalost({ datum: '2025-01-06', datumDo: '2025-01-08', opakovani: 'zadne' })
    expect(udalostSeVyskytujeVDen(u, '2025-01-05')).toBe(false)
    expect(udalostSeVyskytujeVDen(u, '2025-01-06')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-01-07')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-01-08')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-01-09')).toBe(false)
  })

  it('vícedenní rozpětí přes konec měsíce počítá dny správně', () => {
    const u = udalost({ datum: '2025-01-30', datumDo: '2025-02-02', opakovani: 'zadne' })
    expect(udalostSeVyskytujeVDen(u, '2025-01-31')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-02-01')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-02-02')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-02-03')).toBe(false)
  })

  it('vícedenní OPAKUJÍCÍ se událost pokrývá svoje rozpětí při KAŽDÉM výskytu', () => {
    const u = udalost({ datum: '2025-01-06', datumDo: '2025-01-08', opakovani: 'tydne' })
    // Druhý výskyt o týden později — stejné tři dny, posunuté o 7.
    expect(udalostSeVyskytujeVDen(u, '2025-01-13')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-01-15')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-01-16')).toBe(false)
  })

  it('datumDo před datum appka bezpečně bere jako jednodenní', () => {
    const u = udalost({ datum: '2025-01-06', datumDo: '2025-01-01', opakovani: 'zadne' })
    expect(udalostSeVyskytujeVDen(u, '2025-01-06')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-01-07')).toBe(false)
  })

  // --- Fáze 2: výjimky z opakování ---

  it('výjimka vynechá přesně jeden výskyt, ostatní nechá', () => {
    const u = udalost({ datum: '2025-01-06', opakovani: 'tydne', vyjimky: ['2025-01-13'] })
    expect(udalostSeVyskytujeVDen(u, '2025-01-06')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-01-13')).toBe(false)
    expect(udalostSeVyskytujeVDen(u, '2025-01-20')).toBe(true)
  })

  it('výjimka zabere i na úplně PRVNÍM výskytu jednorázové události', () => {
    const u = udalost({ datum: '2025-01-06', opakovani: 'zadne', vyjimky: ['2025-01-06'] })
    expect(udalostSeVyskytujeVDen(u, '2025-01-06')).toBe(false)
  })

  it('výjimka u vícedenní události vynechá celé rozpětí toho výskytu', () => {
    const u = udalost({ datum: '2025-01-06', datumDo: '2025-01-08', opakovani: 'tydne', vyjimky: ['2025-01-13'] })
    expect(udalostSeVyskytujeVDen(u, '2025-01-06')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-01-14')).toBe(false)
    expect(udalostSeVyskytujeVDen(u, '2025-01-15')).toBe(false)
  })
})

describe('zacatekVyskytuPokryvajiciDen', () => {
  it('u jednodenní události vrátí přímo dotazovaný den', () => {
    const u = udalost({ datum: '2025-01-06', opakovani: 'tydne' })
    expect(zacatekVyskytuPokryvajiciDen(u, '2025-01-13')).toBe('2025-01-13')
  })

  it('u vícedenní události vrátí START výskytu, ne libovolný jeho vnitřní den', () => {
    const u = udalost({ datum: '2025-01-06', datumDo: '2025-01-08', opakovani: 'zadne' })
    expect(zacatekVyskytuPokryvajiciDen(u, '2025-01-08')).toBe('2025-01-06')
    expect(zacatekVyskytuPokryvajiciDen(u, '2025-01-07')).toBe('2025-01-06')
    expect(zacatekVyskytuPokryvajiciDen(u, '2025-01-06')).toBe('2025-01-06')
  })

  it('vrátí null, když daný den vůbec nespadá do žádného výskytu', () => {
    const u = udalost({ datum: '2025-01-06', opakovani: 'zadne' })
    expect(zacatekVyskytuPokryvajiciDen(u, '2025-01-07')).toBe(null)
  })
})

describe('jeVicedenni', () => {
  it('jednodenní (bez datumDo) false, vícedenní true', () => {
    expect(jeVicedenni(udalost({ datum: '2025-01-06' }))).toBe(false)
    expect(jeVicedenni(udalost({ datum: '2025-01-06', datumDo: '2025-01-06' }))).toBe(false)
    expect(jeVicedenni(udalost({ datum: '2025-01-06', datumDo: '2025-01-07' }))).toBe(true)
  })
})

describe('pocetNadchazejicichUdalosti', () => {
  it('jednorázová událost v minulosti se nepočítá, v budoucnosti ano', () => {
    const udalosti = [
      udalost({ id: 'a', datum: '2025-01-01', opakovani: 'zadne' }),
      udalost({ id: 'b', datum: '2025-06-01', opakovani: 'zadne' }),
    ]
    expect(pocetNadchazejicichUdalosti(udalosti, '2025-03-01')).toBe(1)
  })

  it('opakující se událost se počítá vždycky, i kdyby první výskyt už proběhl', () => {
    const udalosti = [udalost({ id: 'a', datum: '2020-01-01', opakovani: 'tydne' })]
    expect(pocetNadchazejicichUdalosti(udalosti, '2025-03-01')).toBe(1)
  })

  it('vícedenní jednorázová událost se počítá, dokud neproběhl její POSLEDNÍ den', () => {
    const udalosti = [udalost({ id: 'a', datum: '2025-01-01', datumDo: '2025-03-10', opakovani: 'zadne' })]
    expect(pocetNadchazejicichUdalosti(udalosti, '2025-03-01')).toBe(1)
    expect(pocetNadchazejicichUdalosti(udalosti, '2025-03-11')).toBe(0)
  })
})

describe('posunDatumStr', () => {
  it('posune datum dopředu i zpátky přes konec měsíce', () => {
    expect(posunDatumStr('2025-01-31', 1)).toBe('2025-02-01')
    expect(posunDatumStr('2025-02-01', -1)).toBe('2025-01-31')
  })

  it('posune datum přes přestupný únor', () => {
    expect(posunDatumStr('2024-02-28', 1)).toBe('2024-02-29')
    expect(posunDatumStr('2024-02-29', 1)).toBe('2024-03-01')
  })
})

describe('tydenOd', () => {
  it('vrátí 7 dní od pondělí do neděle, bez ohledu na to, který den týdne appka dostane', () => {
    // 2025-01-08 je středa.
    expect(tydenOd('2025-01-08')).toEqual([
      '2025-01-06',
      '2025-01-07',
      '2025-01-08',
      '2025-01-09',
      '2025-01-10',
      '2025-01-11',
      '2025-01-12',
    ])
  })

  it('neděle patří do týdne, co ZAČAL předchozí pondělí, ne do dalšího', () => {
    expect(tydenOd('2025-01-12')[0]).toBe('2025-01-06')
    expect(tydenOd('2025-01-12')[6]).toBe('2025-01-12')
  })
})

describe('najdiDalsiPripominkuProUdalost', () => {
  it('bez pripominkaMinut appka nehlídá nic', () => {
    const u = udalost({ datum: '2025-06-01', celodenni: false, casOd: '10:00', pripominkaMinut: null })
    expect(najdiDalsiPripominkuProUdalost(u, new Date(2025, 0, 1))).toBe(null)
  })

  it('smazaná událost nikdy nedostane připomínku, i kdyby měla pripominkaMinut', () => {
    const u = udalost({
      datum: '2025-06-01',
      celodenni: false,
      casOd: '10:00',
      pripominkaMinut: 10,
      deletedAt: 123,
    })
    expect(najdiDalsiPripominkuProUdalost(u, new Date(2025, 0, 1))).toBe(null)
  })

  it('najde správný počet milisekund do připomínky budoucí jednorázové události', () => {
    const u = udalost({ datum: '2025, 06, 01'.replace(/, /g, '-'), celodenni: false, casOd: '10:00', pripominkaMinut: 30 })
    const ted = new Date(2025, 5, 1, 9, 0, 0) // 1. 6. 2025, 9:00 — hodinu před akcí
    const zaKolikMs = najdiDalsiPripominkuProUdalost(u, ted)
    // Připomínka má přijít v 9:30 (10:00 - 30 min), appka je teď v 9:00 — 30 minut do ní.
    expect(zaKolikMs).toBe(30 * 60_000)
  })

  it('jednorázová událost, co svoje jediné okno připomínky už propásla, už žádnou nedostane', () => {
    const u = udalost({ datum: '2025-06-01', celodenni: false, casOd: '10:00', pripominkaMinut: 10 })
    const ted = new Date(2025, 5, 1, 11, 0, 0) // den události, ale dávno po ní
    expect(najdiDalsiPripominkuProUdalost(u, ted)).toBe(null)
  })

  it('opakující se událost, co dnešní okno propásla, najde tu PŘÍŠTÍ, ne že by o připomínce už nikdy neřekla', () => {
    const u = udalost({ datum: '2025-06-02', celodenni: false, casOd: '10:00', opakovani: 'tydne', pripominkaMinut: 10 })
    // 2025-06-02 je pondělí; appka se ptá v úterý, den po propásnuté připomínce.
    const ted = new Date(2025, 5, 3, 8, 0, 0)
    const zaKolikMs = najdiDalsiPripominkuProUdalost(u, ted)
    expect(zaKolikMs).not.toBe(null)
    // Příští výskyt je 2025-06-09 v 9:50 (10:00 - 10 min).
    const ocekavany = new Date(2025, 5, 9, 9, 50, 0).getTime() - ted.getTime()
    expect(zaKolikMs).toBe(ocekavany)
  })

  it('celodenní událost počítá připomínku od půlnoci (00:00)', () => {
    const u = udalost({ datum: '2025-06-01', celodenni: true, pripominkaMinut: 60 })
    const ted = new Date(2025, 5, 1, 0, 0, 0)
    // Okno (půlnoc minus 60 min) je v minulosti, protože appka je teď přesně v půlnoci.
    expect(najdiDalsiPripominkuProUdalost(u, ted)).toBe(null)
  })
})

describe('najdiDalsiPripominkuKalendare', () => {
  it('ze všech událostí vybere tu s NEJBLIŽŠÍ připomínkou, ne první v poli', () => {
    const daleka = udalost({ id: 'daleka', datum: '2025-06-10', celodenni: false, casOd: '10:00', pripominkaMinut: 10 })
    const blizka = udalost({ id: 'blizka', datum: '2025-06-01', celodenni: false, casOd: '10:00', pripominkaMinut: 10 })
    const ted = new Date(2025, 5, 1, 8, 0, 0)
    const vysledek = najdiDalsiPripominkuKalendare([daleka, blizka], ted)
    expect(vysledek?.udalost.id).toBe('blizka')
  })

  it('vrátí null, když žádná událost nemá budoucí připomínku', () => {
    const u = udalost({ datum: '2025-01-01', celodenni: false, casOd: '10:00', pripominkaMinut: null })
    expect(najdiDalsiPripominkuKalendare([u], new Date(2025, 5, 1))).toBe(null)
  })
})

describe('sestavIcsKalendare / naparsujIcs (round-trip)', () => {
  const najdiJedinyNavrh = (ics: string): IcsNavrh => {
    const navrhy = naparsujIcs(ics)
    expect(navrhy).toHaveLength(1)
    return navrhy[0]
  }

  it('celodenní vícedenní událost se round-tripuje se správným posledním dnem', () => {
    const u = udalost({ nazev: 'Dovolená', datum: '2025-07-10', datumDo: '2025-07-12', celodenni: true })
    const navrh = najdiJedinyNavrh(sestavIcsKalendare([u]))
    expect(navrh.nazev).toBe('Dovolená')
    expect(navrh.celodenni).toBe(true)
    expect(navrh.datum).toBe('2025-07-10')
    expect(navrh.datumDo).toBe('2025-07-12')
  })

  it('celodenní jednodenní událost se round-tripuje bez datumDo', () => {
    const u = udalost({ nazev: 'Svátek', datum: '2025-07-10', celodenni: true })
    const navrh = najdiJedinyNavrh(sestavIcsKalendare([u]))
    expect(navrh.celodenni).toBe(true)
    expect(navrh.datum).toBe('2025-07-10')
    expect(navrh.datumDo).toBeUndefined()
  })

  it('časovaná jednodenní událost s casDo se round-tripuje s oběma časy', () => {
    const u = udalost({ nazev: 'Schůzka', datum: '2025-07-10', celodenni: false, casOd: '14:00', casDo: '15:30' })
    const navrh = najdiJedinyNavrh(sestavIcsKalendare([u]))
    expect(navrh.celodenni).toBe(false)
    expect(navrh.casOd).toBe('14:00')
    expect(navrh.casDo).toBe('15:30')
    expect(navrh.datumDo).toBeUndefined()
  })

  it('časovaná událost BEZ casDo ("v určitý okamžik") se round-tripuje bez casDo', () => {
    const u = udalost({ nazev: 'Telefonát', datum: '2025-07-10', celodenni: false, casOd: '09:15' })
    const navrh = najdiJedinyNavrh(sestavIcsKalendare([u]))
    expect(navrh.celodenni).toBe(false)
    expect(navrh.casOd).toBe('09:15')
    expect(navrh.casDo).toBeUndefined()
  })

  it('smazaná událost se do exportu vůbec nedostane', () => {
    const u = udalost({ nazev: 'Smazaná', deletedAt: 999 })
    expect(sestavIcsKalendare([u])).not.toContain('Smazaná')
  })

  it('opakování (RRULE) se round-tripuje na stejný typ', () => {
    const tydenni = udalost({ nazev: 'Tréning', datum: '2025-07-07', opakovani: 'tydne' })
    expect(najdiJedinyNavrh(sestavIcsKalendare([tydenni])).opakovani).toBe('tydne')

    const mesicni = udalost({ nazev: 'Nájem', datum: '2025-07-01', opakovani: 'mesicne' })
    expect(najdiJedinyNavrh(sestavIcsKalendare([mesicni])).opakovani).toBe('mesicne')
  })

  it('výjimky (EXDATE) se round-tripují zpátky na stejná data', () => {
    const u = udalost({ nazev: 'Opakovaná', datum: '2025-07-07', opakovani: 'tydne', vyjimky: ['2025-07-14'] })
    const navrh = najdiJedinyNavrh(sestavIcsKalendare([u]))
    expect(navrh.vyjimky).toEqual(['2025-07-14'])
  })

  it('popis (DESCRIPTION) se round-tripuje, speciální znaky (čárka, středník) se escapují a odescapují', () => {
    const u = udalost({ nazev: 'Název, se čárkou; a středníkem', datum: '2025-07-10', popis: 'Poznámka\ns novým řádkem' })
    const navrh = najdiJedinyNavrh(sestavIcsKalendare([u]))
    expect(navrh.nazev).toBe('Název, se čárkou; a středníkem')
    expect(navrh.popis).toBe('Poznámka\ns novým řádkem')
  })

  it('dlouhý SUMMARY zalomený přes víc .ics řádků se rozbalí zpátky na jeden řádek', () => {
    // Simuluje reálný export z Google/Apple kalendáře — pokračovací
    // řádek začíná mezerou.
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:20250710',
      'SUMMARY:Velmi dlouhý název\r\n události rozdělený přes dva řádky',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    expect(naparsujIcs(ics)[0].nazev).toBe('Velmi dlouhý názevudálosti rozdělený přes dva řádky')
  })

  it('VEVENT bez DTSTART se tiše vynechá, ne aby shodil celý import', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'SUMMARY:Bez začátku',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:20250710',
      'SUMMARY:Platná',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const navrhy = naparsujIcs(ics)
    expect(navrhy).toHaveLength(1)
    expect(navrhy[0].nazev).toBe('Platná')
  })
})

describe('jeIcsDuplicitni', () => {
  it('shoda názvu a prvního data se pozná jako duplicita', () => {
    const existujici = [udalost({ nazev: 'Schůzka', datum: '2025-07-10' })]
    const navrh: IcsNavrh = { nazev: 'Schůzka', popis: '', datum: '2025-07-10', celodenni: true, opakovani: 'zadne', vyjimky: [] }
    expect(jeIcsDuplicitni(navrh, existujici)).toBe(true)
  })

  it('jiný název nebo jiné datum se NEPOZNÁ jako duplicita', () => {
    const existujici = [udalost({ nazev: 'Schůzka', datum: '2025-07-10' })]
    const jinyNazev: IcsNavrh = { nazev: 'Jiná', popis: '', datum: '2025-07-10', celodenni: true, opakovani: 'zadne', vyjimky: [] }
    const jineDatum: IcsNavrh = { nazev: 'Schůzka', popis: '', datum: '2025-07-11', celodenni: true, opakovani: 'zadne', vyjimky: [] }
    expect(jeIcsDuplicitni(jinyNazev, existujici)).toBe(false)
    expect(jeIcsDuplicitni(jineDatum, existujici)).toBe(false)
  })

  it('smazaná existující událost se do kontroly duplicity nepočítá', () => {
    const existujici = [udalost({ nazev: 'Schůzka', datum: '2025-07-10', deletedAt: 1 })]
    const navrh: IcsNavrh = { nazev: 'Schůzka', popis: '', datum: '2025-07-10', celodenni: true, opakovani: 'zadne', vyjimky: [] }
    expect(jeIcsDuplicitni(navrh, existujici)).toBe(false)
  })
})

describe('validateKalendarData', () => {
  it('starší uložená událost bez pole opakovani dostane bezpečnou výchozí hodnotu "zadne"', () => {
    const vysledek = validateKalendarData({
      udalosti: [{ id: 'u1', datum: '2025-01-01', nazev: 'Stará událost' }],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.udalosti[0].opakovani).toBe('zadne')
  })

  it('neplatná hodnota opakovani se u té jedné položky tiše vyřadí', () => {
    const vysledek = validateKalendarData({
      udalosti: [{ id: 'u1', datum: '2025-01-01', nazev: 'Špatné opakování', opakovani: 'rocne' }],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.udalosti).toHaveLength(0)
  })

  it('starší tvar (barvyDni jako Record<datum, barva>) se tiše převede na nový', () => {
    const vysledek = validateKalendarData({ barvyDni: { '2025-01-01': 'cyan', '2025-01-02': 'neplatna-barva' } })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.barvyDniZaznamy).toHaveLength(1)
      expect(vysledek.data.barvyDniZaznamy[0]).toMatchObject({ id: '2025-01-01', datum: '2025-01-01', barva: 'cyan' })
    }
  })

  it('nový tvar (pole barvyDniZaznamy) projde beze změny', () => {
    const vysledek = validateKalendarData({
      barvyDniZaznamy: [{ id: '2025-01-01', datum: '2025-01-01', barva: 'violet' }],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.barvyDniZaznamy).toHaveLength(1)
  })

  // --- Fáze 2: zpětná kompatibilita nových polí ---

  it('starší událost bez ŽÁDNÉHO z šesti nových polí dostane bezpečné výchozí hodnoty', () => {
    const vysledek = validateKalendarData({
      udalosti: [{ id: 'u1', datum: '2025-01-01', nazev: 'Starší', createdAt: 0, opakovani: 'zadne' }],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      const u = vysledek.data.udalosti[0]
      expect(u.celodenni).toBe(true)
      expect(u.casOd).toBeUndefined()
      expect(u.casDo).toBeUndefined()
      expect(u.datumDo).toBeUndefined()
      expect(u.vyjimky).toEqual([])
      expect(u.pripominkaMinut).toBe(null)
    }
  })

  it('platná nová (!celodenni) událost si uložený casOd/casDo zachová', () => {
    const vysledek = validateKalendarData({
      udalosti: [
        {
          id: 'u1',
          datum: '2025-01-01',
          nazev: 'Nová',
          createdAt: 0,
          opakovani: 'zadne',
          celodenni: false,
          casOd: '09:00',
          casDo: '10:00',
        },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.udalosti[0].casOd).toBe('09:00')
      expect(vysledek.data.udalosti[0].casDo).toBe('10:00')
    }
  })

  it('celodenní=true appka casOd/casDo vynuluje, i kdyby v uloženém datu nesmyslně zůstaly', () => {
    const vysledek = validateKalendarData({
      udalosti: [
        {
          id: 'u1',
          datum: '2025-01-01',
          nazev: 'Nesmysl',
          createdAt: 0,
          opakovani: 'zadne',
          celodenni: true,
          casOd: '09:00',
          casDo: '10:00',
        },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.udalosti[0].casOd).toBeUndefined()
      expect(vysledek.data.udalosti[0].casDo).toBeUndefined()
    }
  })

  it('poškozená/neplatná vyjimky (ne pole stringů) zahodí tu jednu položku, ne celý seznam', () => {
    const vysledek = validateKalendarData({
      udalosti: [
        { id: 'u1', datum: '2025-01-01', nazev: 'X', createdAt: 0, opakovani: 'zadne', vyjimky: 'neplatne' },
      ],
    })
    expect(vysledek.success).toBe(true)
    // v.optional(schema, default) nahrazuje výchozí hodnotou jen
    // CHYBĚJÍCÍ (undefined) pole, ne pole, co JE přítomné, ale špatného
    // typu — ta celou jednu položku shodí, stejná "poškozená položka se
    // tiše vyřadí, ne celý seznam" zásada, co appka má i pro neplatné
    // opakovani výš.
    if (vysledek.success) expect(vysledek.data.udalosti).toHaveLength(0)
  })
})
