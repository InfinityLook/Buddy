import { describe, it, expect } from 'vitest'
import { ROOM_STRANKY, sousedniRoom } from '@/core/navigation/roomStranky'

// ==========================================
// core/navigation/roomStranky.ts — pure function, žádný browser potřeba.
// Na rozdíl od sousedniStranky() (Hub/Apps/Profil/Nastavení, žádné
// zacyklení) sousedniRoom() na obou koncích zacykluje, protože Roomy
// jsou navzájem rovnocenné destinace bez přirozeného začátku/konce.
// ==========================================

describe('sousedniRoom', () => {
  it('vrátí sousední Roomy pro Room uprostřed řady', () => {
    const { predchozi, dalsi } = sousedniRoom('/fitness')
    expect(predchozi?.cesta).toBe('/skola')
    expect(dalsi?.cesta).toBe('/economy')
  })

  it('zacyklí z posledního Roomu zpátky na první', () => {
    const posledni = ROOM_STRANKY[ROOM_STRANKY.length - 1]
    const { dalsi } = sousedniRoom(posledni.cesta)
    expect(dalsi?.cesta).toBe(ROOM_STRANKY[0].cesta)
  })

  it('zacyklí z prvního Roomu zpátky na poslední', () => {
    const prvni = ROOM_STRANKY[0]
    const { predchozi } = sousedniRoom(prvni.cesta)
    expect(predchozi?.cesta).toBe(ROOM_STRANKY[ROOM_STRANKY.length - 1].cesta)
  })

  it('vrátí null/null mimo jakoukoli Room stránku', () => {
    expect(sousedniRoom('/skola/statistiky')).toEqual({ predchozi: null, dalsi: null })
    expect(sousedniRoom('/hub')).toEqual({ predchozi: null, dalsi: null })
  })

  it('drží přesně šest Roomů, každý s unikátní cestou', () => {
    expect(ROOM_STRANKY).toHaveLength(6)
    expect(new Set(ROOM_STRANKY.map((r) => r.cesta)).size).toBe(6)
  })
})
