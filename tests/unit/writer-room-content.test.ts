import { describe, it, expect } from 'vitest'
import { serazenoPodleUpravy as serazenoKnih, sestavTextKnihy, shrnutiKnihy } from '@/miniapps/book-writer/types'
import type { Kniha } from '@/miniapps/book-writer/types'
import { serazenoPodleUpravy as serazenoScenaru, sestavTextScenare, shrnutiScenare } from '@/miniapps/screenplay-writer/types'
import type { Scenar } from '@/miniapps/screenplay-writer/types'
import { serazenoPodleUpravy as serazenoKomiksu, sestavTextKomiksu, shrnutiKomiksu } from '@/miniapps/comic-writer/types'
import type { Komiks } from '@/miniapps/comic-writer/types'

// ==========================================
// Pokrývá dvojici nových sdílených vzorů, co Writer's Room dostal v
// tomhle kole (řazení podle poslední úpravy, ne založení; export
// celého díla jako čitelný text) napříč všemi třemi appkami — jedna
// tenká vrstva testů místo tří skoro identických souborů.
// ==========================================

describe('serazenoPodleUpravy', () => {
  it('seřadí knihy podle upravenoAt sestupně, ne podle pořadí v poli', () => {
    const stara: Kniha = { updatedAt: Date.now(), deletedAt: null, id: 'a', nazev: 'A', cilSlov: null, kapitoly: [], createdAt: '2026-01-01', upravenoAt: '2026-01-01' }
    const nova: Kniha = { updatedAt: Date.now(), deletedAt: null, id: 'b', nazev: 'B', cilSlov: null, kapitoly: [], createdAt: '2026-01-02', upravenoAt: '2026-06-01' }
    // Pole samo je v pořadí založení (nova první) — výsledek řazení
    // podle upravenoAt musí být stejný bez ohledu na to.
    expect(serazenoKnih([nova, stara]).map((k) => k.id)).toEqual(['b', 'a'])
    expect(serazenoKnih([stara, nova]).map((k) => k.id)).toEqual(['b', 'a'])
  })

  it('funguje stejně pro scénáře i komiksy', () => {
    const s1: Scenar = { updatedAt: Date.now(), deletedAt: null, id: 'x', nazev: 'X', sceny: [], createdAt: '2026-01-01', upravenoAt: '2026-01-01', cilScen: null, postavyPoznamky: {} }
    const s2: Scenar = { updatedAt: Date.now(), deletedAt: null, id: 'y', nazev: 'Y', sceny: [], createdAt: '2026-01-01', upravenoAt: '2026-05-01', cilScen: null, postavyPoznamky: {} }
    expect(serazenoScenaru([s1, s2]).map((s) => s.id)).toEqual(['y', 'x'])

    const k1: Komiks = { updatedAt: Date.now(), deletedAt: null, id: 'p', nazev: 'P', strany: [], createdAt: '2026-01-01', upravenoAt: '2026-01-01', cilStran: null, postavyPoznamky: {} }
    const k2: Komiks = { updatedAt: Date.now(), deletedAt: null, id: 'q', nazev: 'Q', strany: [], createdAt: '2026-01-01', upravenoAt: '2026-05-01', cilStran: null, postavyPoznamky: {} }
    expect(serazenoKomiksu([k1, k2]).map((k) => k.id)).toEqual(['q', 'p'])
  })

  it('nemutuje vstupní pole', () => {
    const a: Kniha = { updatedAt: Date.now(), deletedAt: null, id: 'a', nazev: 'A', cilSlov: null, kapitoly: [], createdAt: '1', upravenoAt: '1' }
    const b: Kniha = { updatedAt: Date.now(), deletedAt: null, id: 'b', nazev: 'B', cilSlov: null, kapitoly: [], createdAt: '2', upravenoAt: '2' }
    const puvodni = [a, b]
    serazenoKnih(puvodni)
    expect(puvodni).toEqual([a, b])
  })
})

describe('sestavTextKnihy', () => {
  it('poskládá název, čísla kapitol a jejich text do jednoho řetězce', () => {
    const kniha: Kniha = {
      updatedAt: Date.now(),
      deletedAt: null,
      id: 'k',
      nazev: 'Můj příběh',
      cilSlov: null,
      createdAt: '1',
      upravenoAt: '1',
      kapitoly: [
        { id: '1', nazev: 'Začátek', text: 'Bylo nebylo.', createdAt: '1', stav: 'napad', poznamka: '', stitky: '' },
        { id: '2', nazev: 'Konec', text: '', createdAt: '1', stav: 'napad', poznamka: '', stitky: '' },
      ],
    }
    const text = sestavTextKnihy(kniha)
    expect(text).toContain('MŮJ PŘÍBĚH')
    expect(text).toContain('1. Začátek')
    expect(text).toContain('Bylo nebylo.')
    expect(text).toContain('2. Konec')
    expect(text).toContain('(prázdná kapitola)')
  })
})

describe('sestavTextScenare', () => {
  it('poskládá nadpis scény, akce prostým textem a dialog s postavou velkými písmeny', () => {
    const scenar: Scenar = {
      updatedAt: Date.now(),
      deletedAt: null,
      id: 's',
      nazev: 'Scénář',
      createdAt: '1',
      upravenoAt: '1',
      cilScen: null,
      postavyPoznamky: {},      sceny: [
        {
          id: 'sc1',
          typMista: 'INT',
          misto: 'kavárna',
          cas: 'den',
          createdAt: '1',
          stav: 'napad',
          poznamka: '',
          stitky: '',
          prvky: [
            { id: 'p1', typ: 'akce', text: 'Petr vejde dovnitř.' },
            { id: 'p2', typ: 'dialog', postava: 'petr', text: 'Ahoj.', poznamka: 'potichu' },
          ],
        },
      ],
    }
    const text = sestavTextScenare(scenar)
    expect(text).toContain('1. INT. KAVÁRNA – DEN')
    expect(text).toContain('Petr vejde dovnitř.')
    expect(text).toContain('PETR (potichu)')
    expect(text).toContain('Ahoj.')
  })

  it('prázdnou scénu označí jako takovou, ne prázdným řetězcem', () => {
    const scenar: Scenar = {
      updatedAt: Date.now(),
      deletedAt: null,
      id: 's',
      nazev: 'S',
      createdAt: '1',
      upravenoAt: '1',
      cilScen: null,
      postavyPoznamky: {},      sceny: [
        { id: 'sc1', typMista: 'EXT', misto: 'park', cas: 'noc', createdAt: '1', stav: 'napad', poznamka: '', stitky: '', prvky: [] },
      ],
    }
    expect(sestavTextScenare(scenar)).toContain('(scéna zatím nemá žádný text)')
  })
})

describe('shrnutiKnihy / shrnutiScenare / shrnutiKomiksu', () => {
  it('shrnutiKnihy spočítá počet kapitol a celkový počet slov, se správnou českou gramatikou', () => {
    const kniha: Kniha = {
      updatedAt: Date.now(),
      deletedAt: null,
      id: 'k',
      nazev: 'Kniha',
      cilSlov: null,
      createdAt: '1',
      upravenoAt: '1',
      kapitoly: [
        { id: '1', nazev: 'A', text: 'Bylo nebylo jednou.', createdAt: '1', stav: 'napad', poznamka: '', stitky: '' },
        { id: '2', nazev: 'B', text: 'Konec.', createdAt: '1', stav: 'napad', poznamka: '', stitky: '' },
      ],
    }
    expect(shrnutiKnihy(kniha)).toBe('2 kapitoly · 4 slova')
  })

  it('shrnutiKnihy prázdnou knihu shrne jako 0 kapitol a 0 slov', () => {
    const kniha: Kniha = { updatedAt: Date.now(), deletedAt: null, id: 'k', nazev: 'K', cilSlov: null, createdAt: '1', upravenoAt: '1', kapitoly: [] }
    expect(shrnutiKnihy(kniha)).toBe('0 kapitol · 0 slov')
  })

  it('shrnutiScenare spočítá počet scén a slov napříč všemi prvky', () => {
    const scenar: Scenar = {
      updatedAt: Date.now(),
      deletedAt: null,
      id: 's',
      nazev: 'S',
      createdAt: '1',
      upravenoAt: '1',
      cilScen: null,
      postavyPoznamky: {},
      sceny: [
        {
          id: 'sc1',
          typMista: 'INT',
          misto: 'kavárna',
          cas: 'den',
          createdAt: '1',
          stav: 'napad',
          poznamka: '',
          stitky: '',
          prvky: [
            { id: 'p1', typ: 'akce', text: 'Petr vejde dovnitř.' },
            { id: 'p2', typ: 'dialog', postava: 'Petr', text: 'Ahoj.', poznamka: '' },
          ],
        },
      ],
    }
    expect(shrnutiScenare(scenar)).toBe('1 scéna · 4 slova')
  })

  it('shrnutiKomiksu spočítá počet stran a celkový počet panelů napříč nimi', () => {
    const komiks: Komiks = {
      updatedAt: Date.now(),
      deletedAt: null,
      id: 'c',
      nazev: 'C',
      createdAt: '1',
      upravenoAt: '1',
      cilStran: null,
      postavyPoznamky: {},
      strany: [
        {
          id: 'str1',
          cislo: 1,
          stav: 'napad',
          poznamka: '',
          stitky: '',
          panely: [
            { id: 'pan1', vizual: 'x', createdAt: '1', zaber: null, radky: [] },
            { id: 'pan2', vizual: 'y', createdAt: '1', zaber: null, radky: [] },
          ],
        },
        { id: 'str2', cislo: 2, stav: 'napad', poznamka: '', stitky: '', panely: [] },
      ],
    }
    expect(shrnutiKomiksu(komiks)).toBe('2 strany · 2 panely')
  })
})

describe('sestavTextKomiksu', () => {
  it('poskládá stranu → panel → řádky do jednoho řetězce', () => {
    const komiks: Komiks = {
      updatedAt: Date.now(),
      deletedAt: null,
      id: 'c',
      nazev: 'Komiks',
      createdAt: '1',
      upravenoAt: '1',
      cilStran: null,
      postavyPoznamky: {},      strany: [
        {
          id: 'str1',
          cislo: 1,
          stav: 'napad',
          poznamka: '',
          stitky: '',
          panely: [
            {
              id: 'pan1',
              vizual: 'hrdina letí',
              createdAt: '1',
              zaber: null,
              radky: [
                { id: 'r1', typ: 'dialog', postava: 'hrdina', text: 'Letím!' },
                { id: 'r2', typ: 'popisek', postava: '', text: 'O chvíli později...' },
              ],
            },
          ],
        },
      ],
    }
    const text = sestavTextKomiksu(komiks)
    expect(text).toContain('STRANA 1')
    expect(text).toContain('Panel 1: hrdina letí')
    expect(text).toContain('HRDINA: Letím!')
    expect(text).toContain('(O chvíli později...)')
  })
})
