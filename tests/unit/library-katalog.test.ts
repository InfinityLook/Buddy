import { describe, expect, it, beforeEach } from 'vitest'
import { MAX_POLICE, ocistiPolici, validateLibraryShelfData } from '@/core/utils/libraryShelfValidation'
import { dilaZRadku } from '@/pages/library/libraryApi'
import { UKAZKOVA_DILA } from '@/pages/library/libraryCatalog'
import {
  druhDilaNazev, filtrovatKatalog, foilPodleId, licenceNazev, vekNazev,
} from '@/pages/library/libraryTypes'
import { idNaPolici, useLibraryShelf } from '@/pages/library/useLibraryShelf'

describe('police — validace', () => {
  it('zahodí nevalidní položky a duplicity (starší tvar: holá id)', () => {
    expect(ocistiPolici(['a', 'a', '', 5, null, 'b', 'x'.repeat(101)], 7)).toEqual([
      { id: 'a', updatedAt: 7, deletedAt: null }, { id: 'b', updatedAt: 7, deletedAt: null },
    ])
  })
  it('zachová záznamy s tombstonem a čas', () => {
    expect(ocistiPolici([{ id: 'a', updatedAt: 5, deletedAt: 9 }, { id: '', updatedAt: 1 }], 1))
      .toEqual([{ id: 'a', updatedAt: 5, deletedAt: 9 }])
  })
  it('nepole vrací prázdnou polici; migruje legacy ids', () => {
    expect(ocistiPolici('nic')).toEqual([])
    expect(validateLibraryShelfData(null)).toEqual({ zaznamy: [] })
    expect(validateLibraryShelfData({ ids: ['k'] }, 3)).toEqual({ zaznamy: [{ id: 'k', updatedAt: 3, deletedAt: null }] })
  })
  it('ořízne na MAX_POLICE živých záznamů', () => {
    const moc = Array.from({ length: MAX_POLICE + 20 }, (_, i) => ({ id: `id${i}`, updatedAt: i, deletedAt: null }))
    const vysledek = ocistiPolici(moc)
    expect(vysledek).toHaveLength(MAX_POLICE)
    expect(vysledek.some((z) => z.id === 'id0')).toBe(false)
  })
})

describe('useLibraryShelf', () => {
  beforeEach(() => useLibraryShelf.setState({ zaznamy: [] }))
  it('přidává, odebírá (tombstone) a znovu přidává', () => {
    expect(useLibraryShelf.getState().prepnout('a')).toBe(true)
    expect(useLibraryShelf.getState().prepnout('b')).toBe(true)
    expect(idNaPolici(useLibraryShelf.getState().zaznamy).sort()).toEqual(['a', 'b'])
    expect(useLibraryShelf.getState().prepnout('a')).toBe(false)
    const a = useLibraryShelf.getState().zaznamy.find((z) => z.id === 'a')
    expect(a?.deletedAt).not.toBeNull()
    expect(idNaPolici(useLibraryShelf.getState().zaznamy)).toEqual(['b'])
    expect(useLibraryShelf.getState().prepnout('a')).toBe(true)
    expect(useLibraryShelf.getState().zaznamy.filter((z) => z.id === 'a')).toHaveLength(1)
  })
})

describe('katalog — typy a filtry', () => {
  it('ukázky mají unikátní id a aspoň jednu stránku', () => {
    const ids = UKAZKOVA_DILA.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const d of UKAZKOVA_DILA) {
      expect(d.zdroj).toBe('ukazka')
      expect(d.ukazka?.length).toBeGreaterThan(0)
    }
  })
  it('filtruje podle druhu a police', () => {
    expect(filtrovatKatalog(UKAZKOVA_DILA, 'vse', new Set())).toHaveLength(UKAZKOVA_DILA.length)
    expect(filtrovatKatalog(UKAZKOVA_DILA, 'komiks', new Set()).every((d) => d.druh === 'komiks')).toBe(true)
    expect(filtrovatKatalog(UKAZKOVA_DILA, 'scenar', new Set())).toEqual([])
    const police = new Set([UKAZKOVA_DILA[1].id])
    expect(filtrovatKatalog(UKAZKOVA_DILA, 'police', police).map((d) => d.id)).toEqual([UKAZKOVA_DILA[1].id])
  })
  it('foil je stabilní a z palety', () => {
    expect(foilPodleId('abc')).toBe(foilPodleId('abc'))
    expect(foilPodleId('abc')).toMatch(/^#[0-9A-F]{6}$/)
  })
  it('popisky', () => {
    expect(druhDilaNazev('komiks')).toBe('Komiks')
    expect(druhDilaNazev('scenar')).toBe('Scénář')
    expect(vekNazev('vsichni')).toBe('Pro všechny')
    expect(vekNazev('12')).toBe('Od 12 let')
    expect(licenceNazev('public-domain')).toBe('Volné dílo')
    expect(licenceNazev('neznama')).toBe('neznama')
  })
  it('mapuje řádek z databáze', () => {
    const [d] = dilaZRadku([{
      id: 'u1', kind: 'kniha', title: 'T', summary: 'S', author_name: 'A', cover_path: null,
      age_rating: '12', license: 'cc0', genres: null,
    }])
    expect(d).toMatchObject({ id: 'u1', zdroj: 'katalog', druh: 'kniha', autor: 'A', coverUrl: null, vek: '12', zanry: [] })
  })
})
