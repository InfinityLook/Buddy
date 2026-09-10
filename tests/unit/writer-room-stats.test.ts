import { describe, it, expect } from 'vitest'
import { spocitejDnesniTvorbu, spocitejTvorbuPodleDne } from '@/flagships/writer-room/writerRoomStats'
import type { Kniha } from '@/miniapps/book-writer/types'
import type { Scenar } from '@/miniapps/screenplay-writer/types'
import type { Komiks } from '@/miniapps/comic-writer/types'

const DNES = new Date('2026-06-15T12:00:00.000Z')
const VCERA = '2026-06-14T09:00:00.000Z'
const DNESNI_ISO = '2026-06-15T08:00:00.000Z'

const kniha = (kapitolyDatumy: string[]): Kniha => ({
  id: 'k1',
  nazev: 'Kniha',
  cilSlov: null,
  createdAt: VCERA,
  upravenoAt: VCERA,
  kapitoly: kapitolyDatumy.map((d, i) => ({ id: `kap${i}`, nazev: `Kap ${i}`, text: '', createdAt: d, stav: 'napad', poznamka: '' })),
})

const scenar = (scenyDatumy: string[]): Scenar => ({
  id: 's1',
  nazev: 'Scénář',
  createdAt: VCERA,
  upravenoAt: VCERA,
  cilScen: null,
  postavyPoznamky: {},
  sceny: scenyDatumy.map((d, i) => ({
    id: `sc${i}`,
    typMista: 'INT',
    misto: 'M',
    cas: 'DEN',
    prvky: [],
    createdAt: d,
    stav: 'napad',
    poznamka: '',
  })),
})

const komiks = (panelyDatumy: string[]): Komiks => ({
  id: 'c1',
  nazev: 'Komiks',
  createdAt: VCERA,
  upravenoAt: VCERA,
  cilStran: null,
  postavyPoznamky: {},
  strany: [
    {
      id: 'str1',
      cislo: 1,
      panely: panelyDatumy.map((d, i) => ({ id: `p${i}`, vizual: 'v', radky: [], createdAt: d })),
      stav: 'napad',
      poznamka: '',
    },
  ],
})

describe('spocitejDnesniTvorbu', () => {
  it('spočítá jen kapitoly/scény/panely vytvořené dnes, ne včera', () => {
    const vysledek = spocitejDnesniTvorbu(
      [kniha([DNESNI_ISO, VCERA, DNESNI_ISO])],
      [scenar([VCERA])],
      [komiks([DNESNI_ISO])],
      DNES
    )
    expect(vysledek).toEqual({ kapitol: 2, scen: 0, panelu: 1 })
  })

  it('sečte napříč více knihami/scénáři/komiksy najednou', () => {
    const vysledek = spocitejDnesniTvorbu(
      [kniha([DNESNI_ISO]), kniha([DNESNI_ISO, DNESNI_ISO])],
      [scenar([DNESNI_ISO]), scenar([DNESNI_ISO])],
      [komiks([DNESNI_ISO])],
      DNES
    )
    expect(vysledek).toEqual({ kapitol: 3, scen: 2, panelu: 1 })
  })

  it('bez žádné tvorby dnes vrátí samé nuly', () => {
    const vysledek = spocitejDnesniTvorbu([kniha([VCERA])], [scenar([VCERA])], [komiks([VCERA])], DNES)
    expect(vysledek).toEqual({ kapitol: 0, scen: 0, panelu: 0 })
  })

  it('bez žádných knih/scénářů/komiksů vrátí samé nuly', () => {
    expect(spocitejDnesniTvorbu([], [], [], DNES)).toEqual({ kapitol: 0, scen: 0, panelu: 0 })
  })
})

describe('spocitejTvorbuPodleDne', () => {
  it('vrátí přesně `pocetDni` dní, dnešek jako poslední položku', () => {
    const dny = spocitejTvorbuPodleDne([kniha([DNESNI_ISO])], [], [], 7, DNES)
    expect(dny).toHaveLength(7)
    expect(dny[dny.length - 1].pocet).toBe(1)
    expect(dny[dny.length - 1].datumIso).toBe('2026-06-15')
  })

  it('sečte kapitoly/scény/panely dohromady za jeden den, ne odděleně', () => {
    const dny = spocitejTvorbuPodleDne([kniha([DNESNI_ISO])], [scenar([DNESNI_ISO])], [komiks([DNESNI_ISO])], 3, DNES)
    expect(dny[dny.length - 1].pocet).toBe(3)
  })

  it('den bez žádné tvorby má pocet 0, ne že by chyběl', () => {
    const dny = spocitejTvorbuPodleDne([kniha([DNESNI_ISO])], [], [], 3, DNES)
    // Poslední dva dny (předevčírem, včera) v týhle sadě žádnou tvorbu
    // nemají — appka je má pořád vypsané, jen s nulou, ne vynechané.
    expect(dny).toHaveLength(3)
    expect(dny[0].pocet).toBe(0)
    expect(dny[1].pocet).toBe(0)
  })

  it('bez žádné tvorby vůbec vrátí samé nuly, ne prázdné pole', () => {
    const dny = spocitejTvorbuPodleDne([], [], [], 5, DNES)
    expect(dny).toHaveLength(5)
    expect(dny.every((d) => d.pocet === 0)).toBe(true)
  })
})
