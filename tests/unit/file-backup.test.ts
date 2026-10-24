import { beforeEach, describe, expect, it, vi } from 'vitest'
import { vytvorFalesneIndexedDB } from './fakeIndexedDb'
import { getFileBlob, putFileBlob } from '@/core/utils/fileStorage'
import { secureStorage } from '@/core/utils/secureStorage'
import { restoreFullBackup } from '@/core/utils/backup'
import {
  exportFullBackupWithFiles,
  importZipBackup,
  jeZipZaloha,
  restoreFilesFromZip,
} from '@/core/utils/fileBackup'

// ==========================================
// Regresní test pro core/utils/fileBackup.ts (audit #6) — appka na
// skutečný round trip "export se soubory → import → obnova obsahu"
// dřív neměla žádný test. Ověřujeme jak celou reálnou cestu (zip skrz
// JSZip, ne mock), tak konkrétně tu samou opravu MIME fallbacku, co
// se v téhle appce prokazatelně udělala (`??` → `||`).
// ==========================================

beforeEach(() => {
  ;(globalThis as { indexedDB: unknown }).indexedDB = vytvorFalesneIndexedDB()
  localStorage.clear()
})

describe('jeZipZaloha', () => {
  it('pozná novou zálohu podle přípony .zip, i když MIME chybí', () => {
    expect(jeZipZaloha(new File(['x'], 'buddy-zaloha.zip', { type: '' }))).toBe(true)
  })

  it('pozná novou zálohu podle MIME application/zip, i když přípona chybí', () => {
    expect(jeZipZaloha(new File(['x'], 'buddy-zaloha', { type: 'application/zip' }))).toBe(true)
  })

  it('starší zálohu (.json) nepozná jako zip', () => {
    expect(jeZipZaloha(new File(['x'], 'buddy-zaloha.json', { type: 'application/json' }))).toBe(false)
  })
})

describe('exportFullBackupWithFiles + importZipBackup + restoreFilesFromZip — reálný round trip', () => {
  it('skutečný obsah souboru i jeho MIME typ přežijí zabalení do zipu, import a obnovu na "jiném zařízení"', async () => {
    // Appka má soubor v IndexedDB a odpovídající metadata ve File Manageru.
    secureStorage.setItem(
      'schoolbuddy-file-manager-storage',
      JSON.stringify({
        state: {
          files: [
            {
              id: 'f1',
              name: 'poznamky.txt',
              size: 10,
              type: 'file',
              mime: 'text/plain',
              date: '2026-01-01',
              addedAt: Date.now(),
              folder: null,
            },
          ],
          sortMode: 'date',
        },
        version: 0,
      })
    )
    await putFileBlob('f1', new Blob(['ahoj svete'], { type: 'text/plain' }))

    // Appka skutečně sbalí backup.json + files/f1 do reálného zipu
    // (JSZip, ne mock) — zachytíme ten Blob přesně tak, jak by ho
    // prohlížeč poslal jako stažení.
    let zachycenyZip: Blob | null = null
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      zachycenyZip = blob as Blob
      return 'blob:zachyceno'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const uspech = await exportFullBackupWithFiles()
    expect(uspech).toBe(true)
    expect(zachycenyZip).not.toBeNull()
    createSpy.mockRestore()

    // "Jiné zařízení" — prázdná IndexedDB, prázdné localStorage. Obsah
    // dál existuje jedině v zachyceném zipu.
    ;(globalThis as { indexedDB: unknown }).indexedDB = vytvorFalesneIndexedDB()
    localStorage.clear()
    expect(await getFileBlob('f1')).toBeNull()

    const zipFile = new File([zachycenyZip!], 'buddy-zaloha.zip', { type: 'application/zip' })
    const { envelope, soubory } = await importZipBackup(zipFile)

    expect(soubory.size).toBe(1)
    expect(soubory.has('f1')).toBe(true)

    const vysledekObnovy = await restoreFullBackup(envelope)
    expect(vysledekObnovy.success).toBe(true)
    expect(vysledekObnovy.restored).toContain('File Manager')

    const pocetObnovenych = await restoreFilesFromZip(soubory, envelope)
    expect(pocetObnovenych).toBe(1)

    const obnoveny = await getFileBlob('f1')
    expect(obnoveny).not.toBeNull()
    // JSZip typ blobu při balení nezachovává (jen bajty) — appka ho
    // musí dotáhnout z právě obnovených metadat File Manageru, ne z
    // toho, co si pamatuje zip.
    expect(obnoveny!.type).toBe('text/plain')
    expect(await obnoveny!.text()).toBe('ahoj svete')
  })
})

describe('restoreFilesFromZip — oprava MIME fallbacku (audit #6)', () => {
  it('blob bez odpovídajících metadat (poškozená/cizí záloha) dostane bezpečný výchozí typ, ne prázdný', async () => {
    const soubory = new Map<string, Blob>([['osamocene-id', new Blob(['neznama data'])]])
    const envelope = {
      format: 'schoolbuddy-backup',
      version: 1,
      createdAt: new Date().toISOString(),
      appVersion: 'test',
      data: {}, // žádná metadata vůbec — ani File Manager, ani Music Studio klíč
    }

    const obnoveno = await restoreFilesFromZip(soubory, envelope)
    expect(obnoveno).toBe(1)

    const blob = await getFileBlob('osamocene-id')
    expect(blob).not.toBeNull()
    // Tohle je přesně ta oprava `??` → `||`: Blob.type je po průchodu
    // zipem '' (ne null/undefined), takže `blob.type ?? '...'` by na
    // prázdný řetězec nikdy nespadlo a appka by skončila s prázdným
    // typem místo bezpečného výchozího.
    expect(blob!.type).toBe('application/octet-stream')
  })

  it('blob s metadaty jen v Music Studiu (ne File Manageru) dostane svůj typ odtamtud', async () => {
    const soubory = new Map<string, Blob>([['hudba-nahravka-1', new Blob(['zvuk'])]])
    const envelope = {
      format: 'schoolbuddy-backup',
      version: 1,
      createdAt: new Date().toISOString(),
      appVersion: 'test',
      data: {
        'schoolbuddy-music-studio-storage': {
          state: { recordings: [{ id: 'hudba-nahravka-1', mime: 'audio/webm' }] },
          version: 0,
        },
      },
    }

    await restoreFilesFromZip(soubory, envelope)
    const blob = await getFileBlob('hudba-nahravka-1')
    expect(blob!.type).toBe('audio/webm')
  })

  it('neobnovitelný soubor (putFileBlob selže) se nezapočítá, ale nezastaví zbytek', async () => {
    const soubory = new Map<string, Blob>([['a', new Blob(['x'], { type: 'text/plain' })]])
    const envelope = { format: 'schoolbuddy-backup', version: 1, createdAt: '', appVersion: 'test', data: {} }

    const obnoveno = await restoreFilesFromZip(soubory, envelope)
    expect(obnoveno).toBe(1)
    expect(await getFileBlob('a')).not.toBeNull()
  })
})
