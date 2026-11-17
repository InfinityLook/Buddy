import { beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_ANOTACI,
  ocistiAnotace,
  validateLibraryAnnotationsData,
  type AnotaceZaznam,
} from '@/core/utils/libraryAnnotationsValidation'
import { najdiZalozku, rozdelBlok, seradPodlePozice, zkratVyrez } from '@/pages/library/libraryAnnotations'
import { useLibraryAnnotations, zivePodleDila } from '@/pages/library/useLibraryAnnotations'
import { MAX_OFFLINE_DIL, overOfflineZaznam, vyberKeSmazani } from '@/pages/library/libraryOffline'
import { anotaceTabulka } from '@/pages/library/librarySync'

const UUID = '11111111-1111-4111-8111-111111111111'

const zaznam = (cast: Partial<AnotaceZaznam> = {}): AnotaceZaznam => ({
  id: 'a1', workId: UUID, versionId: null, kind: 'zvyrazneni', chapterPos: 0, blockIdx: 0,
  charStart: 2, charEnd: 6, excerpt: 'text', note: null, color: 'zluta',
  createdAt: 1, updatedAt: 1, deletedAt: null, ...cast,
})

describe('ocistiAnotace', () => {
  it('platný záznam projde beze změny', () => {
    expect(ocistiAnotace([zaznam()])).toEqual([zaznam()])
  })

  it('vyřadí poškozené záznamy, ne celý seznam', () => {
    const v = ocistiAnotace([null, 'x', { id: '' }, zaznam({ kind: 'blbost' as never }), zaznam({ id: 'ok' })])
    expect(v.map((a) => a.id)).toEqual(['ok'])
  })

  it('zvýraznění bez rozsahu se zahodí, záložka rozsah nepotřebuje a nulují se jí barva i poznámka', () => {
    expect(ocistiAnotace([zaznam({ charStart: 3, charEnd: 3 })])).toEqual([])
    const z = ocistiAnotace([zaznam({ kind: 'zalozka', charStart: 9, charEnd: 20, color: 'modra', note: 'x' })])[0]
    expect([z.charStart, z.charEnd, z.color, z.note]).toEqual([0, 0, null, null])
  })

  it('nezná-li barvu, dá žlutou; poznámku nese jen druh "poznamka"', () => {
    const a = ocistiAnotace([zaznam({ color: 'cerna' as never, note: 'ztracená' })])[0]
    expect(a.color).toBe('zluta')
    expect(a.note).toBeNull()
    const b = ocistiAnotace([zaznam({ kind: 'poznamka', note: 'ahoj' })])[0]
    expect(b.note).toBe('ahoj')
  })

  it('ořízne délky a opraví konec před začátkem', () => {
    const a = ocistiAnotace([zaznam({ kind: 'poznamka', note: 'x'.repeat(3000), excerpt: 'y'.repeat(900), charStart: 10, charEnd: 4 })])
    // konec před začátkem se srovná na začátek → prázdný rozsah → zahodí se
    expect(a).toEqual([])
    const b = ocistiAnotace([zaznam({ kind: 'poznamka', note: 'x'.repeat(3000), excerpt: 'y'.repeat(900) })])[0]
    expect(b.note).toHaveLength(2000)
    expect(b.excerpt).toHaveLength(500)
  })

  it('tombstone se zachová; nad limit se zahazují nejstarší živé', () => {
    expect(ocistiAnotace([zaznam({ deletedAt: 5 })])[0].deletedAt).toBe(5)
    const hodne = Array.from({ length: MAX_ANOTACI + 3 }, (_, i) => zaznam({ id: `n${i}`, updatedAt: i }))
    const v = ocistiAnotace(hodne)
    expect(v).toHaveLength(MAX_ANOTACI)
    expect(v.some((a) => a.id === 'n0')).toBe(false)
  })

  it('validate… vrátí prázdno z nesmyslu', () => {
    expect(validateLibraryAnnotationsData(undefined)).toEqual({ anotace: [] })
    expect(validateLibraryAnnotationsData({ anotace: 'x' })).toEqual({ anotace: [] })
  })
})

describe('rozdelBlok', () => {
  const text = 'Dvacet tisíc mil pod mořem'
  const spoj = (u: { text: string }[]) => u.map((x) => x.text).join('')

  it('bez zvýraznění je to jeden úsek', () => {
    expect(rozdelBlok(text, [])).toEqual([{ text, anotaceId: null, barva: null, maPoznamku: false }])
  })

  it('rozdělí na před/zvýrazněné/za a spojení dá původní text', () => {
    const u = rozdelBlok(text, [zaznam({ id: 'z', charStart: 7, charEnd: 12, color: 'modra' })])
    expect(u.map((x) => x.text)).toEqual(['Dvacet ', 'tisíc', ' mil pod mořem'])
    expect(u[1]).toMatchObject({ anotaceId: 'z', barva: 'modra', maPoznamku: false })
    expect(spoj(u)).toBe(text)
  })

  it('překryv: pozdější zvýraznění začne tam, kde předchozí končí', () => {
    const u = rozdelBlok(text, [
      zaznam({ id: 'a', charStart: 0, charEnd: 10 }),
      zaznam({ id: 'b', charStart: 5, charEnd: 15, color: 'zelena' }),
    ])
    expect(u.map((x) => [x.anotaceId, x.text.length])).toEqual([['a', 10], ['b', 5], [null, text.length - 15]])
    expect(spoj(u)).toBe(text)
  })

  it('rozsah mimo text se ořízne, záložky a prázdné rozsahy se ignorují', () => {
    const u = rozdelBlok('abc', [
      zaznam({ id: 'x', charStart: 1, charEnd: 99 }),
      zaznam({ id: 'k', kind: 'zalozka', charStart: 0, charEnd: 0 }),
      zaznam({ id: 'p', charStart: 50, charEnd: 60 }),
    ])
    expect(u.map((x) => x.text)).toEqual(['a', 'bc'])
  })

  it('poznámka je označená', () => {
    expect(rozdelBlok(text, [zaznam({ kind: 'poznamka', note: 'n' })])[1].maPoznamku).toBe(true)
  })
})

describe('pomocné funkce', () => {
  it('seradPodlePozice: kapitola, blok, znak', () => {
    const v = seradPodlePozice([
      zaznam({ id: 'c', chapterPos: 1 }),
      zaznam({ id: 'b', blockIdx: 2 }),
      zaznam({ id: 'a', charStart: 1, charEnd: 3 }),
    ])
    expect(v.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('zkratVyrez sloučí mezery a zkrátí s třemi tečkami', () => {
    expect(zkratVyrez('a  b\n c')).toBe('a b c')
    expect(zkratVyrez('x'.repeat(300), 10)).toHaveLength(10)
    expect(zkratVyrez('x'.repeat(300), 10).endsWith('…')).toBe(true)
  })

  it('najdiZalozku hledá jen živou záložku na přesné pozici', () => {
    const z = zaznam({ id: 'z', kind: 'zalozka', chapterPos: 1, blockIdx: 3 })
    expect(najdiZalozku([z], 1, 3)?.id).toBe('z')
    expect(najdiZalozku([z], 1, 4)).toBeUndefined()
    expect(najdiZalozku([{ ...z, deletedAt: 9 }], 1, 3)).toBeUndefined()
    expect(najdiZalozku([zaznam()], 0, 0)).toBeUndefined()
  })
})

describe('useLibraryAnnotations', () => {
  beforeEach(() => useLibraryAnnotations.setState({ anotace: [] }))
  const vstup = { workId: UUID, versionId: null, chapterPos: 0, blockIdx: 1 }

  it('přidá zvýraznění se žlutou výchozí barvou', () => {
    const id = useLibraryAnnotations.getState().pridej({ ...vstup, kind: 'zvyrazneni', charStart: 0, charEnd: 4, excerpt: 'abcd' })
    const a = useLibraryAnnotations.getState().anotace.find((x) => x.id === id)!
    expect(a).toMatchObject({ kind: 'zvyrazneni', color: 'zluta', note: null })
  })

  it('zvýraznění s poznámkou se uloží jako druh "poznamka", prázdná poznámka jako zvýraznění', () => {
    const { pridej, uprav } = useLibraryAnnotations.getState()
    const id = pridej({ ...vstup, kind: 'zvyrazneni', charStart: 0, charEnd: 4, note: '  ahoj ' })!
    expect(useLibraryAnnotations.getState().anotace[0].kind).toBe('poznamka')
    uprav(id, { note: '   ' })
    expect(useLibraryAnnotations.getState().anotace[0]).toMatchObject({ kind: 'zvyrazneni', note: null })
    uprav(id, { note: 'nová', color: 'ruzova' })
    expect(useLibraryAnnotations.getState().anotace[0]).toMatchObject({ kind: 'poznamka', note: 'nová', color: 'ruzova' })
  })

  it('záložku nejde upravit jako zvýraznění', () => {
    const id = useLibraryAnnotations.getState().pridej({ ...vstup, kind: 'zalozka' })!
    useLibraryAnnotations.getState().uprav(id, { note: 'x', color: 'modra' })
    expect(useLibraryAnnotations.getState().anotace[0]).toMatchObject({ kind: 'zalozka', note: null, color: null })
  })

  it('smazání nechá tombstone bez soukromého textu', () => {
    const id = useLibraryAnnotations.getState().pridej({ ...vstup, kind: 'zvyrazneni', charStart: 0, charEnd: 4, excerpt: 'tajné', note: 'moje' })!
    useLibraryAnnotations.getState().smaz(id)
    const a = useLibraryAnnotations.getState().anotace[0]
    expect(a.deletedAt).not.toBeNull()
    expect([a.excerpt, a.note]).toEqual(['', null])
    expect(zivePodleDila(useLibraryAnnotations.getState().anotace, UUID)).toHaveLength(0)
  })

  it('na limitu dílo další poznámku nepřijme', () => {
    useLibraryAnnotations.setState({
      anotace: Array.from({ length: 500 }, (_, i) => zaznam({ id: `m${i}` })),
    })
    expect(useLibraryAnnotations.getState().pridej({ ...vstup, kind: 'zalozka' })).toBeNull()
    // jiné dílo limit nesdílí
    expect(useLibraryAnnotations.getState().pridej({ ...vstup, workId: '22222222-2222-4222-8222-222222222222', kind: 'zalozka' })).not.toBeNull()
  })
})

describe('anotaceTabulka (sync)', () => {
  beforeEach(() => useLibraryAnnotations.setState({ anotace: [] }))

  it('do cloudu jdou jen anotace k dílům z databáze, ukázky zůstanou lokálně', () => {
    const ukazka = zaznam({ id: 'u', workId: 'ukazka-1' })
    const dbZaznam = zaznam({ id: 'd' })
    useLibraryAnnotations.setState({ anotace: [ukazka, dbZaznam] })
    expect(anotaceTabulka.getLocal().map((a) => a.id)).toEqual(['d'])
    anotaceTabulka.setLocal([zaznam({ id: 'novy' })])
    expect(useLibraryAnnotations.getState().anotace.map((a) => a.id).sort()).toEqual(['novy', 'u'])
  })

  it('toRow ↔ fromRow zachová záznam; verze mimo uuid se neposílá', () => {
    const a = zaznam({ kind: 'poznamka', note: 'pozn', versionId: 'ukazka-v', createdAt: 1000, updatedAt: 2000 })
    const radek = anotaceTabulka.toRow('u-1', a)
    expect(radek).toMatchObject({ user_id: 'u-1', work_id: UUID, version_id: null, kind: 'poznamka', note: 'pozn', deleted_at: null })
    expect(anotaceTabulka.fromRow(radek)).toEqual({ ...a, versionId: null })
  })

  it('tombstone putuje s deleted_at a bez textu', () => {
    const radek = anotaceTabulka.toRow('u', zaznam({ deletedAt: 5000, updatedAt: 5000, excerpt: '', note: null }))
    expect(radek.deleted_at).toBe(new Date(5000).toISOString())
    expect(radek.excerpt).toBeNull()
  })
})

describe('offline kopie textů', () => {
  it('vyberKeSmazani nechá nejnovější a smaže nejstarší nad limit', () => {
    const z = [{ workId: 'a', savedAt: 1 }, { workId: 'b', savedAt: 3 }, { workId: 'c', savedAt: 2 }]
    expect(vyberKeSmazani(z, 2)).toEqual(['a'])
    expect(vyberKeSmazani(z, 5)).toEqual([])
    expect(vyberKeSmazani(z, 0)).toEqual(['b', 'c', 'a'])
    expect(MAX_OFFLINE_DIL).toBeGreaterThan(0)
  })

  it('overOfflineZaznam přijme jen úplný záznam', () => {
    const ok = { workId: 'w', versionId: 'v', savedAt: 9, kapitoly: [{ position: 0, title: 'K', bloky: [] }] }
    expect(overOfflineZaznam(ok)).toEqual(ok)
    expect(overOfflineZaznam(null)).toBeNull()
    expect(overOfflineZaznam({ ...ok, versionId: 1 })).toBeNull()
    expect(overOfflineZaznam({ ...ok, kapitoly: [{ position: 'x', title: 'K', bloky: [] }] })).toBeNull()
    expect(overOfflineZaznam({ ...ok, savedAt: undefined })?.savedAt).toBe(0)
  })
})
