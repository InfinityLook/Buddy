import { describe, it, expect } from 'vitest'
import { serazenoPodleUpravy as serazenoKnih, sestavTextKnihy } from '@/miniapps/book-writer/types'
import type { Kniha } from '@/miniapps/book-writer/types'
import { serazenoPodleUpravy as serazenoScenaru, sestavTextScenare } from '@/miniapps/screenplay-writer/types'
import type { Scenar } from '@/miniapps/screenplay-writer/types'
import { serazenoPodleUpravy as serazenoKomiksu, sestavTextKomiksu } from '@/miniapps/comic-writer/types'
import type { Komiks } from '@/miniapps/comic-writer/types'

// ==========================================
// Pokrývá dvojici nových sdílených vzorů, co Writer's Room dostal v
// tomhle kole (řazení podle poslední úpravy, ne založení; export
// celého díla jako čitelný text) napříč všemi třemi appkami — jedna
// tenká vrstva testů místo tří skoro identických souborů.
// ==========================================

describe('serazenoPodleUpravy', () => {
  it('seřadí knihy podle upravenoAt sestupně, ne podle pořadí v poli', () => {
    const stara: Kniha = { id: 'a', nazev: 'A', cilSlov: null, kapitoly: [], createdAt: '2026-01-01', upravenoAt: '2026-01-01' }
    const nova: Kniha = { id: 'b', nazev: 'B', cilSlov: null, kapitoly: [], createdAt: '2026-01-02', upravenoAt: '2026-06-01' }
    // Pole samo je v pořadí založení (nova první) — výsledek řazení
    // podle upravenoAt musí být stejný bez ohledu na to.
    expect(serazenoKnih([nova, stara]).map((k) => k.id)).toEqual(['b', 'a'])
    expect(serazenoKnih([stara, nova]).map((k) => k.id)).toEqual(['b', 'a'])
  })

  it('funguje stejně pro scénáře i komiksy', () => {
    const s1: Scenar = { id: 'x', nazev: 'X', sceny: [], createdAt: '2026-01-01', upravenoAt: '2026-01-01', cilScen: null }
    const s2: Scenar = { id: 'y', nazev: 'Y', sceny: [], createdAt: '2026-01-01', upravenoAt: '2026-05-01', cilScen: null }
    expect(serazenoScenaru([s1, s2]).map((s) => s.id)).toEqual(['y', 'x'])

    const k1: Komiks = { id: 'p', nazev: 'P', strany: [], createdAt: '2026-01-01', upravenoAt: '2026-01-01', cilStran: null }
    const k2: Komiks = { id: 'q', nazev: 'Q', strany: [], createdAt: '2026-01-01', upravenoAt: '2026-05-01', cilStran: null }
    expect(serazenoKomiksu([k1, k2]).map((k) => k.id)).toEqual(['q', 'p'])
  })

  it('nemutuje vstupní pole', () => {
    const a: Kniha = { id: 'a', nazev: 'A', cilSlov: null, kapitoly: [], createdAt: '1', upravenoAt: '1' }
    const b: Kniha = { id: 'b', nazev: 'B', cilSlov: null, kapitoly: [], createdAt: '2', upravenoAt: '2' }
    const puvodni = [a, b]
    serazenoKnih(puvodni)
    expect(puvodni).toEqual([a, b])
  })
})

describe('sestavTextKnihy', () => {
  it('poskládá název, čísla kapitol a jejich text do jednoho řetězce', () => {
    const kniha: Kniha = {
      id: 'k',
      nazev: 'Můj příběh',
      cilSlov: null,
      createdAt: '1',
      upravenoAt: '1',
      kapitoly: [
        { id: '1', nazev: 'Začátek', text: 'Bylo nebylo.', createdAt: '1', stav: 'napad', poznamka: '' },
        { id: '2', nazev: 'Konec', text: '', createdAt: '1', stav: 'napad', poznamka: '' },
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
      id: 's',
      nazev: 'Scénář',
      createdAt: '1',
      upravenoAt: '1',
      cilScen: null,
      sceny: [
        {
          id: 'sc1',
          typMista: 'INT',
          misto: 'kavárna',
          cas: 'den',
          createdAt: '1',
          stav: 'napad',
          poznamka: '',
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
      id: 's',
      nazev: 'S',
      createdAt: '1',
      upravenoAt: '1',
      cilScen: null,
      sceny: [
        { id: 'sc1', typMista: 'EXT', misto: 'park', cas: 'noc', createdAt: '1', stav: 'napad', poznamka: '', prvky: [] },
      ],
    }
    expect(sestavTextScenare(scenar)).toContain('(scéna zatím nemá žádný text)')
  })
})

describe('sestavTextKomiksu', () => {
  it('poskládá stranu → panel → řádky do jednoho řetězce', () => {
    const komiks: Komiks = {
      id: 'c',
      nazev: 'Komiks',
      createdAt: '1',
      upravenoAt: '1',
      cilStran: null,
      strany: [
        {
          id: 'str1',
          cislo: 1,
          stav: 'napad',
          poznamka: '',
          panely: [
            {
              id: 'pan1',
              vizual: 'hrdina letí',
              createdAt: '1',
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
