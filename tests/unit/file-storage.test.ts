import { beforeEach, describe, expect, it } from 'vitest'
import { vytvorFalesneIndexedDB } from './fakeIndexedDb'
import { MAX_FILE_BYTES, deleteFileBlob, getFileBlob, listStoredFileIds, putFileBlob } from '@/core/utils/fileStorage'

// ==========================================
// Regresní test pro core/utils/fileStorage.ts (audit #6 — appka na
// tohle dřív neměla žádný test, ačkoli jde o jediné místo, kde se
// skutečný obsah souborů ze Správce souborů a nahrávek Music Studia
// doopravdy ukládá).
// ==========================================

beforeEach(() => {
  ;(globalThis as { indexedDB: unknown }).indexedDB = vytvorFalesneIndexedDB()
})

describe('fileStorage.ts — skutečný obsah souborů v IndexedDB', () => {
  it('uložený blob se přečte zpátky beze změny', async () => {
    const blob = new Blob(['ahoj svete'], { type: 'text/plain' })
    await putFileBlob('soubor-1', blob)

    const vysledek = await getFileBlob('soubor-1')
    expect(vysledek).not.toBeNull()
    expect(vysledek!.type).toBe('text/plain')
    expect(await vysledek!.text()).toBe('ahoj svete')
  })

  it('neexistující soubor vrátí null, ne chybu', async () => {
    const vysledek = await getFileBlob('neexistuje')
    expect(vysledek).toBeNull()
  })

  it('smazaný soubor zmizí i z listStoredFileIds', async () => {
    await putFileBlob('a', new Blob(['x']))
    await putFileBlob('b', new Blob(['y']))

    expect((await listStoredFileIds()).sort()).toEqual(['a', 'b'])

    await deleteFileBlob('a')

    expect(await listStoredFileIds()).toEqual(['b'])
    expect(await getFileBlob('a')).toBeNull()
  })

  it('přepsání existujícího id nahradí obsah, ne přidá druhý záznam', async () => {
    await putFileBlob('x', new Blob(['první']))
    await putFileBlob('x', new Blob(['druhý']))

    expect(await listStoredFileIds()).toEqual(['x'])
    expect(await (await getFileBlob('x'))!.text()).toBe('druhý')
  })

  it('MAX_FILE_BYTES je rozumná horní mez (appka ho sama nijak nevynucuje, jen ho File Manager čte)', () => {
    expect(MAX_FILE_BYTES).toBe(25 * 1024 * 1024)
  })
})
