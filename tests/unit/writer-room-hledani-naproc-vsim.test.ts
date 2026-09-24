import { describe, it, expect } from 'vitest'
import { hledejNaprocVsim } from '@/flagships/writer-room/writerRoomHledaniNaprocVsim'
import type { Kniha } from '@/miniapps/book-writer/types'
import type { Scenar } from '@/miniapps/screenplay-writer/types'
import type { Komiks } from '@/miniapps/comic-writer/types'

const kniha = (id: string, nazev: string, kapitoly: Kniha['kapitoly']): Kniha => ({
  updatedAt: Date.now(),
  deletedAt: null,
  id,
  nazev,
  cilSlov: null,
  createdAt: '1',
  upravenoAt: '1',
  kapitoly,
})

const scenar = (id: string, nazev: string, sceny: Scenar['sceny']): Scenar => ({
  updatedAt: Date.now(),
  deletedAt: null,
  id,
  nazev,
  createdAt: '1',
  upravenoAt: '1',
  cilScen: null,
  postavyPoznamky: {},
  sceny,
})

const komiks = (id: string, nazev: string, strany: Komiks['strany']): Komiks => ({
  updatedAt: Date.now(),
  deletedAt: null,
  id,
  nazev,
  createdAt: '1',
  upravenoAt: '1',
  cilStran: null,
  postavyPoznamky: {},
  strany,
})

describe('hledejNaprocVsim', () => {
  it('prázdný dotaz nevrátí nic — appka nezobrazí výsledky, dokud uživatel doopravdy něco nenapíše', () => {
    const k = kniha('k1', 'Kniha', [{ id: 'kap1', nazev: 'Kapitola', text: 'Text.', createdAt: '1', stav: 'napad', poznamka: '', stitky: '' }])
    expect(hledejNaprocVsim('', [k], [], [])).toEqual([])
    expect(hledejNaprocVsim('   ', [k], [], [])).toEqual([])
  })

  it('najde zásah v textu kapitoly napříč více knihami', () => {
    const k1 = kniha('k1', 'První kniha', [
      { id: 'kap1', nazev: 'Úvod', text: 'Byl jednou jeden drak.', createdAt: '1', stav: 'napad', poznamka: '', stitky: '' },
    ])
    const k2 = kniha('k2', 'Druhá kniha', [
      { id: 'kap2', nazev: 'Konec', text: 'Setkání s drakem dopadlo špatně.', createdAt: '1', stav: 'napad', poznamka: '', stitky: '' },
    ])
    const vysledky = hledejNaprocVsim('drak', [k1, k2], [], [])
    expect(vysledky).toHaveLength(2)
    expect(vysledky.map((v) => v.dilaNazev).sort()).toEqual(['Druhá kniha', 'První kniha'])
    expect(vysledky[0].druh).toBe('kniha')
    expect(vysledky[0].polozka).toContain('Kapitola:')
  })

  it('zásah v názvu kapitoly appka pozná i bez zásahu v textu', () => {
    const k = kniha('k1', 'Kniha', [
      { id: 'kap1', nazev: 'Tajemný drak', text: 'Text bez zmínky.', createdAt: '1', stav: 'napad', poznamka: '', stitky: '' },
    ])
    const vysledky = hledejNaprocVsim('drak', [k], [], [])
    expect(vysledky).toHaveLength(1)
    expect(vysledky[0].polozka).toBe('Kapitola: Tajemný drak')
  })

  it('najde zásah v místě i v replice scény, napříč scénáři', () => {
    const s = scenar('s1', 'Scénář', [
      {
        id: 'sc1',
        typMista: 'INT',
        misto: 'jeskyně u draka',
        cas: 'noc',
        createdAt: '1',
        stav: 'napad',
        poznamka: '',
        stitky: '',
        prvky: [{ id: 'p1', typ: 'akce', text: 'Nic zvláštního.' }],
      },
      {
        id: 'sc2',
        typMista: 'EXT',
        misto: 'les',
        cas: 'den',
        createdAt: '1',
        stav: 'napad',
        poznamka: '',
        stitky: '',
        prvky: [{ id: 'p2', typ: 'dialog', postava: 'Petr', text: 'Viděl jsem draka!', poznamka: '' }],
      },
    ])
    const vysledky = hledejNaprocVsim('drak', [], [s], [])
    expect(vysledky).toHaveLength(2)
    expect(vysledky.map((v) => v.polozka).sort()).toEqual(['Scéna 1', 'Scéna 2'])
    expect(vysledky.every((v) => v.druh === 'scenar')).toBe(true)
  })

  it('najde zásah ve vizuálu i v dialogu panelu, s číslem strany a panelu', () => {
    const c = komiks('c1', 'Komiks', [
      {
        id: 'str1',
        cislo: 1,
        stav: 'napad',
        poznamka: '',
        stitky: '',
        panely: [
          { id: 'pan1', vizual: 'drak letí nad městem', createdAt: '1', zaber: null, radky: [] },
          {
            id: 'pan2',
            vizual: 'obyčejná ulice',
            createdAt: '1',
            zaber: null,
            radky: [{ id: 'r1', typ: 'dialog', postava: 'Kluk', text: 'To byl drak!' }],
          },
        ],
      },
    ])
    const vysledky = hledejNaprocVsim('drak', [], [], [c])
    expect(vysledky).toHaveLength(2)
    expect(vysledky[0].polozka).toBe('Strana 1, panel 1')
    expect(vysledky[1].polozka).toBe('Strana 1, panel 2')
    expect(vysledky.every((v) => v.druh === 'komiks')).toBe(true)
  })

  it('kombinuje výsledky ze všech tří druhů děl najednou', () => {
    const k = kniha('k1', 'K', [{ id: 'kap1', nazev: 'A', text: 'drak', createdAt: '1', stav: 'napad', poznamka: '', stitky: '' }])
    const s = scenar('s1', 'S', [
      { id: 'sc1', typMista: 'INT', misto: 'drak', cas: 'den', createdAt: '1', stav: 'napad', poznamka: '', stitky: '', prvky: [] },
    ])
    const c = komiks('c1', 'C', [{ id: 'str1', cislo: 1, stav: 'napad', poznamka: '', stitky: '', panely: [{ id: 'pan1', vizual: 'drak', createdAt: '1', zaber: null, radky: [] }] }])
    const vysledky = hledejNaprocVsim('drak', [k], [s], [c])
    expect(vysledky.map((v) => v.druh).sort()).toEqual(['kniha', 'komiks', 'scenar'])
  })

  it('nenajde nic, když dotaz nikde nesedí — a je hledání necitlivé na velikost písmen', () => {
    const k = kniha('k1', 'K', [{ id: 'kap1', nazev: 'A', text: 'Drak spí.', createdAt: '1', stav: 'napad', poznamka: '', stitky: '' }])
    expect(hledejNaprocVsim('jednorožec', [k], [], [])).toEqual([])
    expect(hledejNaprocVsim('DRAK', [k], [], [])).toHaveLength(1)
  })
})
