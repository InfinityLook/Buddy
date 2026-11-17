import { describe, expect, it } from 'vitest'
import { jeIdDilaZDb, ocistiPostup, validateLibraryPostupData } from '@/core/utils/libraryShelfValidation'
import { formatCas, ocistiBloky, odhadMinut, spoctiProcenta, type Kapitola } from '@/pages/library/libraryTextTypes'
import { jeCitelne } from '@/pages/library/libraryTypes'
import { UKAZKOVA_DILA } from '@/pages/library/libraryCatalog'
import { policeTabulka, postupTabulka } from '@/pages/library/librarySync'
import { useLibraryPostup } from '@/pages/library/useLibraryPostup'
import { useLibraryShelf } from '@/pages/library/useLibraryShelf'
import { useLibraryCtecka } from '@/pages/library/useLibraryCtecka'

const K = (n: number): Kapitola => ({ position: 0, title: 'k', bloky: [{ typ: 'odstavec', text: 'x'.repeat(n) }] })
const UUID = '11111111-2222-3333-4444-555555555555'

describe('bloky a procenta', () => {
  it('ocistiBloky přijímá jen známé typy a neprázdný text', () => {
    expect(ocistiBloky([
      { typ: 'odstavec', text: 'ahoj' }, { typ: 'html', text: '<b>' }, { typ: 'odstavec', text: '  ' },
      { typ: 'oddelovac' }, null, { typ: 'citat', text: 5 }, 'x',
    ])).toEqual([{ typ: 'odstavec', text: 'ahoj' }, { typ: 'oddelovac', text: '' }])
    expect(ocistiBloky('nic')).toEqual([])
  })
  it('procenta váží kapitoly podle délky', () => {
    const k = [K(100), K(300)]
    expect(spoctiProcenta(k, 0, 0)).toBe(0)
    expect(spoctiProcenta(k, 0, 1)).toBe(25)
    expect(spoctiProcenta(k, 1, 0)).toBe(25)
    expect(spoctiProcenta(k, 1, 1)).toBe(100)
    expect(spoctiProcenta(k, 5, 2)).toBe(100)
    expect(spoctiProcenta([], 0, 0)).toBe(0)
  })
  it('odhad minut a formátování', () => {
    const slova = (n: number): Kapitola => ({ position: 0, title: '', bloky: [{ typ: 'odstavec', text: Array(n).fill('a').join(' ') }] })
    expect(odhadMinut([slova(400), slova(400)], 0, 0)).toBe(4)
    expect(odhadMinut([slova(400)], 0, 1)).toBe(0)
    expect(formatCas(30)).toBe('méně než minutu')
    expect(formatCas(600)).toBe('10 min')
    expect(formatCas(3900)).toBe('1 h 5 min')
  })
})

describe('postup — validace a store', () => {
  it('ocistiPostup ořezává hodnoty', () => {
    const [p] = ocistiPostup([{ id: 'a', percent: 140, chapterPos: -3, blockIdx: 2.7, secondsRead: 'x', updatedAt: 5 }])
    expect(p).toMatchObject({ id: 'a', percent: 100, chapterPos: 0, blockIdx: 2, secondsRead: 0, updatedAt: 5, deletedAt: null })
    expect(validateLibraryPostupData(null)).toEqual({ postupy: [] })
  })
  it('ulozPostup slučuje a posouvá updatedAt', () => {
    useLibraryPostup.setState({ postupy: [] })
    useLibraryPostup.getState().ulozPostup('d', { percent: 10, chapterPos: 1 })
    useLibraryPostup.getState().ulozPostup('d', { percent: 20 })
    const [p] = useLibraryPostup.getState().postupy
    expect(useLibraryPostup.getState().postupy).toHaveLength(1)
    expect(p).toMatchObject({ id: 'd', percent: 20, chapterPos: 1 })
    expect(p.updatedAt).toBeGreaterThan(0)
  })
})

describe('čtečka — nastavení', () => {
  it('velikost se ořezává do rozsahu a téma je platné', () => {
    useLibraryCtecka.setState({ velikost: 1, tema: 'papir' })
    useLibraryCtecka.getState().zmenVelikost(-5)
    expect(useLibraryCtecka.getState().velikost).toBe(0)
    useLibraryCtecka.getState().zmenVelikost(99)
    expect(useLibraryCtecka.getState().velikost).toBe(4)
    useLibraryCtecka.getState().nastavTema('neexistuje' as never)
    expect(useLibraryCtecka.getState().tema).toBe('papir')
  })
})

describe('sync tabulky', () => {
  it('uuid se pozná', () => {
    expect(jeIdDilaZDb(UUID)).toBe(true)
    expect(jeIdDilaZDb('ukazka-valley')).toBe(false)
  })
  it('police: do cloudu jen díla z DB, ukázky zůstanou po setLocal', () => {
    useLibraryShelf.setState({ zaznamy: [
      { id: UUID, updatedAt: 5, deletedAt: null }, { id: 'ukazka-valley', updatedAt: 6, deletedAt: null },
    ] })
    expect(policeTabulka.getLocal().map((z) => z.id)).toEqual([UUID])
    policeTabulka.setLocal([{ id: UUID, updatedAt: 9, deletedAt: 9 }])
    const z = useLibraryShelf.getState().zaznamy
    expect(z.find((x) => x.id === UUID)?.deletedAt).toBe(9)
    expect(z.some((x) => x.id === 'ukazka-valley')).toBe(true)
  })
  it('řádky se mapují oběma směry', () => {
    const row = policeTabulka.toRow('u', { id: UUID, updatedAt: 1000, deletedAt: null })
    expect(row).toMatchObject({ user_id: 'u', work_id: UUID, deleted_at: null })
    expect(policeTabulka.fromRow({ work_id: UUID, updated_at: row.updated_at, deleted_at: null }))
      .toEqual({ id: UUID, updatedAt: 1000, deletedAt: null })
    expect(policeTabulka.onConflict).toBe('user_id,work_id')
    const p = { id: UUID, updatedAt: 2000, deletedAt: null as null, versionId: UUID, chapterPos: 2, blockIdx: 3, percent: 41.5, secondsRead: 90, finishedAt: null }
    const prow = postupTabulka.toRow('u', p)
    expect(prow).toMatchObject({ work_id: UUID, version_id: UUID, chapter_pos: 2, block_idx: 3, percent: 41.5, seconds_read: 90, finished_at: null })
    expect(postupTabulka.fromRow({ ...prow, finished_at: null })).toEqual(p)
  })
})

describe('jeCitelne', () => {
  it('ukázky ano, katalogová kniha ano, komiks z katalogu zatím ne', () => {
    expect(jeCitelne(UKAZKOVA_DILA[0])).toBe(true)
    const zKatalogu = { ...UKAZKOVA_DILA[0], zdroj: 'katalog' as const, ukazka: undefined }
    expect(jeCitelne({ ...zKatalogu, druh: 'kniha' })).toBe(true)
    expect(jeCitelne({ ...zKatalogu, druh: 'komiks' })).toBe(false)
  })
})
