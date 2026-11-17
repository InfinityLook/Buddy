import { describe, expect, it } from 'vitest'
import {
  PRAZDNE_DILO,
  adminDiloZRadku,
  lzeZverejnit,
  prumerHodnoceni,
  radekZVstupu,
  rozdelDoDavek,
  rozdelZanry,
  validujDilo,
  type DiloVstup,
  type RadekAdminDila,
} from '@/pages/library/libraryAdminTypes'

const dobre: DiloVstup = { ...PRAZDNE_DILO, title: 'Dvacet tisíc mil pod mořem', authorName: 'Jules Verne' }

describe('validujDilo', () => {
  it('platné dílo projde', () => {
    expect(validujDilo(dobre)).toBeNull()
  })

  it('hlídá název, autora, jazyk a délky', () => {
    expect(validujDilo({ ...dobre, title: '   ' })).toMatch(/Název/)
    expect(validujDilo({ ...dobre, title: 'x'.repeat(161) })).toMatch(/Název/)
    expect(validujDilo({ ...dobre, authorName: '' })).toMatch(/autora/)
    expect(validujDilo({ ...dobre, language: 'Čeština' })).toMatch(/Jazyk/)
    expect(validujDilo({ ...dobre, summary: 'x'.repeat(2001) })).toMatch(/Anotace/)
    expect(validujDilo({ ...dobre, attribution: 'x'.repeat(501) })).toMatch(/autorství/)
  })

  it('URL musí být http(s)', () => {
    expect(validujDilo({ ...dobre, sourceUrl: 'https://www.gutenberg.org/ebooks/164' })).toBeNull()
    expect(validujDilo({ ...dobre, sourceUrl: 'javascript:alert(1)' })).toMatch(/URL zdroje/)
    expect(validujDilo({ ...dobre, licenseUrl: 'gutenberg.org' })).toMatch(/URL licence/)
  })

  it('smluvní obsah vyžaduje uvedení původu', () => {
    expect(validujDilo({ ...dobre, license: 'smluvni' })).toMatch(/smluvního/)
    expect(validujDilo({ ...dobre, license: 'smluvni', attribution: 'Se svolením nakladatelství X' })).toBeNull()
  })
})

describe('rozdelZanry', () => {
  it('ořízne, odstraní prázdné a duplicity bez ohledu na velikost, max 5', () => {
    expect(rozdelZanry(' sci-fi , Sci-Fi,, dobrodružné ')).toEqual(['sci-fi', 'dobrodružné'])
    expect(rozdelZanry('a,b,c,d,e,f,g')).toHaveLength(5)
    expect(rozdelZanry('')).toEqual([])
  })
})

describe('radekZVstupu', () => {
  it('prázdná volitelná pole uloží jako null a oříznutý text', () => {
    const r = radekZVstupu({ ...dobre, title: '  Název  ', licenseUrl: '', sourceUrl: ' ', attribution: '' })
    expect(r.title).toBe('Název')
    expect(r.license_url).toBeNull()
    expect(r.source_url).toBeNull()
    expect(r.attribution).toBeNull()
  })

  it('translation_free se ukládá jen u volných děl', () => {
    expect(radekZVstupu({ ...dobre, license: 'public-domain', translationFree: true }).translation_free).toBe(true)
    expect(radekZVstupu({ ...dobre, license: 'cc-by', translationFree: true }).translation_free).toBeNull()
  })
})

describe('adminDiloZRadku', () => {
  const radek: RadekAdminDila = {
    id: 'a',
    kind: 'kniha',
    title: 'T',
    summary: '',
    language: 'cs',
    genres: null,
    age_rating: 'vsichni',
    license: 'public-domain',
    license_url: null,
    source_url: null,
    attribution: null,
    translation_free: null,
    author_name: 'A',
    cover_path: null,
    status: 'koncept',
    published_version_id: null,
    featured_at: null,
    published_at: null,
    owner_id: null,
    readers_count: 3,
    rating_count: 2,
    rating_sum: 9,
    updated_at: '2026-01-01T00:00:00Z',
  }

  it('null sloupce se změní na prázdné řetězce a pole', () => {
    const d = adminDiloZRadku(radek)
    expect(d.genres).toEqual([])
    expect(d.licenseUrl).toBe('')
    expect(d.ratingCount).toBe(2)
  })

  it('průměr hodnocení: zaokrouhleně na desetinu, bez hodnocení null', () => {
    expect(prumerHodnoceni(adminDiloZRadku(radek))).toBe(4.5)
    expect(prumerHodnoceni({ ratingCount: 0, ratingSum: 0 })).toBeNull()
    expect(prumerHodnoceni({ ratingCount: 3, ratingSum: 10 })).toBe(3.3)
  })
})

describe('lzeZverejnit', () => {
  it('bez obsahu nejde zveřejnit', () => {
    expect(lzeZverejnit(false)).toMatch(/obsah/)
    expect(lzeZverejnit(true)).toBeNull()
  })
})

describe('rozdelDoDavek', () => {
  const radek = (n: number) => ({ blocks: [{ typ: 'odstavec', text: 'x'.repeat(n) }] })

  it('drží dávku pod limitem velikosti i počtu řádků', () => {
    const davky = rozdelDoDavek([radek(400), radek(400), radek(400), radek(400)], 1000, 20)
    expect(davky.map((d) => d.length)).toEqual([2, 2])
    expect(rozdelDoDavek([radek(1), radek(1), radek(1)], 1_000_000, 2).map((d) => d.length)).toEqual([2, 1])
  })

  it('obří řádek jde sám, nic se neztratí ani nezduplikuje', () => {
    const vstup = [radek(5000), radek(10), radek(10)]
    const davky = rozdelDoDavek(vstup, 1000, 20)
    expect(davky.flat()).toEqual(vstup)
    expect(davky[0]).toHaveLength(1)
  })

  it('prázdný vstup = žádné dávky', () => {
    expect(rozdelDoDavek([])).toEqual([])
  })
})
