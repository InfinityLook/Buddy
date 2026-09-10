import { describe, it, expect } from 'vitest'
import { nahradVTextu } from '@/flagships/writer-room/writerRoomNahradit'
import { odhadCteniMinut, SABLONY_KAPITOL } from '@/miniapps/book-writer/types'
import type { Kniha } from '@/miniapps/book-writer/types'
import { sestavFountain, SABLONY_SCEN } from '@/miniapps/screenplay-writer/types'
import type { Scenar } from '@/miniapps/screenplay-writer/types'

// ==========================================
// Pokrývá věci, co Writer's Room dostal ve čtvrtém kole vylepšení pro
// "profesionální použití": najít a nahradit, export do Fountainu,
// odhad čtenářského času a rychlé šablony struktury — čtyři malé čisté
// funkce/konstanty, jedna tenká vrstva testů, stejně jako u třetího
// kola (writer-room-professional.test.ts).
// ==========================================

describe('nahradVTextu', () => {
  it('nahradí všechny výskyty a vrátí jejich počet', () => {
    const { text, pocet } = nahradVTextu('Petr potkal Petra a Petrovi to řekl.', 'Petr', 'Pavel')
    expect(pocet).toBe(3)
    expect(text).toBe('Pavel potkal Pavela a Pavelovi to řekl.')
  })

  it('prázdné hledání nenechá nic beze změny', () => {
    expect(nahradVTextu('Nějaký text', '', 'cokoliv')).toEqual({ text: 'Nějaký text', pocet: 0 })
  })

  it('když se hledaný text vůbec nenajde, vrátí původní text a pocet 0', () => {
    expect(nahradVTextu('Bylo nebylo', 'drak', 'princ')).toEqual({ text: 'Bylo nebylo', pocet: 0 })
  })

  it('nahrazení za prázdný text výskyty jen odstraní', () => {
    expect(nahradVTextu('a-b-a-c', 'a', '')).toEqual({ text: '-b--c', pocet: 2 })
  })
})

describe('odhadCteniMinut (Kniha)', () => {
  const kniha = (slov: number): Kniha => ({
    id: 'k',
    nazev: 'K',
    cilSlov: null,
    createdAt: '1',
    upravenoAt: '1',
    kapitoly: [{ id: '1', nazev: 'Kap', text: Array(slov).fill('slovo').join(' '), createdAt: '1', stav: 'napad', poznamka: '', stitky: '' }],
  })

  it('spočítá hrubý odhad ~200 slov = 1 minuta čtení', () => {
    expect(odhadCteniMinut(kniha(400))).toBe(2)
  })

  it('prázdná kniha má odhad 0 minut', () => {
    expect(odhadCteniMinut({ id: 'k', nazev: 'K', cilSlov: null, createdAt: '1', upravenoAt: '1', kapitoly: [] })).toBe(0)
  })
})

describe('SABLONY_KAPITOL', () => {
  it('má aspoň jednu šablonu a každá aspoň dvě kapitoly', () => {
    expect(SABLONY_KAPITOL.length).toBeGreaterThan(0)
    SABLONY_KAPITOL.forEach((s) => expect(s.kapitoly.length).toBeGreaterThanOrEqual(2))
  })
})

describe('SABLONY_SCEN', () => {
  it('má aspoň jednu šablonu a každá aspoň dvě scény', () => {
    expect(SABLONY_SCEN.length).toBeGreaterThan(0)
    SABLONY_SCEN.forEach((s) => expect(s.sceny.length).toBeGreaterThanOrEqual(2))
  })
})

describe('sestavFountain', () => {
  it('vyskládá skutečnou Fountain syntaxi — INT./EXT. nadpis, postava velkými písmeny, poznámka v závorce', () => {
    const scenar: Scenar = {
      id: 's',
      nazev: 'Můj scénář',
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
            { id: 'p2', typ: 'dialog', postava: 'petr', text: 'Ahoj.', poznamka: 'potichu' },
          ],
        },
      ],
    }
    const text = sestavFountain(scenar)
    expect(text).toContain('Title: Můj scénář')
    expect(text).toContain('INT. KAVÁRNA - DEN')
    expect(text).toContain('Petr vejde dovnitř.')
    expect(text).toContain('PETR')
    expect(text).toContain('(potichu)')
    expect(text).toContain('Ahoj.')
  })

  it('INT/EXT se ve Fountainu skládá jako INT./EXT.', () => {
    const scenar: Scenar = {
      id: 's',
      nazev: 'S',
      createdAt: '1',
      upravenoAt: '1',
      cilScen: null,
      postavyPoznamky: {},
      sceny: [{ id: 'sc1', typMista: 'INT/EXT', misto: 'auto', cas: 'noc', createdAt: '1', stav: 'napad', poznamka: '', stitky: '', prvky: [] }],
    }
    expect(sestavFountain(scenar)).toContain('INT./EXT. AUTO - NOC')
  })

  it('prázdnou scénu označí jako takovou, ne prázdným řetězcem', () => {
    const scenar: Scenar = {
      id: 's',
      nazev: 'S',
      createdAt: '1',
      upravenoAt: '1',
      cilScen: null,
      postavyPoznamky: {},
      sceny: [{ id: 'sc1', typMista: 'EXT', misto: 'park', cas: 'den', createdAt: '1', stav: 'napad', poznamka: '', stitky: '', prvky: [] }],
    }
    expect(sestavFountain(scenar)).toContain('(scéna zatím nemá žádný text)')
  })
})
