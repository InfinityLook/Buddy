import { describe, it, expect } from 'vitest'
import { spocitejDnesniTvorbu } from '@/flagships/writer-room/writerRoomStats'
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
  kapitoly: kapitolyDatumy.map((d, i) => ({ id: `kap${i}`, nazev: `Kap ${i}`, text: '', createdAt: d })),
})

const scenar = (scenyDatumy: string[]): Scenar => ({
  id: 's1',
  nazev: 'Scénář',
  createdAt: VCERA,
  upravenoAt: VCERA,
  cilScen: null,
  sceny: scenyDatumy.map((d, i) => ({ id: `sc${i}`, typMista: 'INT', misto: 'M', cas: 'DEN', prvky: [], createdAt: d })),
})

const komiks = (panelyDatumy: string[]): Komiks => ({
  id: 'c1',
  nazev: 'Komiks',
  createdAt: VCERA,
  upravenoAt: VCERA,
  cilStran: null,
  strany: [
    {
      id: 'str1',
      cislo: 1,
      panely: panelyDatumy.map((d, i) => ({ id: `p${i}`, vizual: 'v', radky: [], createdAt: d })),
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
