import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { vytvorFalesneIndexedDB } from './fakeIndexedDb'

// ==========================================
// Regresní test pro core/utils/backupHistory.ts (audit #6) — appka na
// historii záloh v aplikaci (snímky, co se nabízí k obnově rovnou
// v Nastavení) dřív neměla žádný test. Zajímá nás hlavně: pořadí
// (nejnovější nahoře), ořez na MAX_SNAPSHOTS a 24hodinová brána
// automatického snímku.
// ==========================================

beforeEach(() => {
  ;(globalThis as { indexedDB: unknown }).indexedDB = vytvorFalesneIndexedDB()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

import {
  BackupSnapshot,
  MAX_SNAPSHOTS,
  autoSnapshotIfDue,
  deleteSnapshot,
  getSnapshot,
  listSnapshots,
  saveSnapshot,
} from '@/core/utils/backupHistory'
import { BackupEnvelope } from '@/core/utils/backupValidation'

const prazdnaZaloha = (): BackupEnvelope => ({
  format: 'schoolbuddy-backup',
  version: 1,
  createdAt: new Date().toISOString(),
  appVersion: 'test',
  data: {},
})

describe('backupHistory.ts — historie záloh v aplikaci', () => {
  it('uložený snímek se objeví v listSnapshots i getSnapshot', async () => {
    const info = await saveSnapshot('manual', prazdnaZaloha())
    expect(info).not.toBeNull()

    const seznam = await listSnapshots()
    expect(seznam).toHaveLength(1)
    expect(seznam[0].id).toBe(info!.id)
    expect(seznam[0].source).toBe('manual')

    const plny = await getSnapshot(info!.id)
    expect(plny).not.toBeNull()
    expect(plny!.payload.format).toBe('schoolbuddy-backup')
  })

  it('listSnapshots vrací jen metadata, ne data zálohy samé', async () => {
    await saveSnapshot('manual', prazdnaZaloha())
    const seznam = await listSnapshots()
    expect((seznam[0] as unknown as BackupSnapshot).payload).toBeUndefined()
  })

  it('neexistující snímek vrátí z getSnapshot null, ne chybu', async () => {
    expect(await getSnapshot('neexistuje')).toBeNull()
  })

  it('smazaný snímek zmizí ze seznamu', async () => {
    const info = await saveSnapshot('manual', prazdnaZaloha())
    await deleteSnapshot(info!.id)
    expect(await listSnapshots()).toHaveLength(0)
  })

  it('nejnovější snímek je v seznamu první', async () => {
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))
    await saveSnapshot('manual', prazdnaZaloha())

    vi.setSystemTime(new Date('2026-01-02T10:00:00Z'))
    const druhy = await saveSnapshot('manual', prazdnaZaloha())

    const seznam = await listSnapshots()
    expect(seznam[0].id).toBe(druhy!.id)
  })

  it('appka drží jen MAX_SNAPSHOTS nejnovějších, starší se ořežou', async () => {
    for (let i = 0; i < MAX_SNAPSHOTS + 3; i++) {
      vi.setSystemTime(new Date(2026, 0, 1 + i))
      await saveSnapshot('manual', prazdnaZaloha())
    }

    const seznam = await listSnapshots()
    expect(seznam).toHaveLength(MAX_SNAPSHOTS)
    // Nejstarší tři musí být pryč, nejnovější zůstává
    expect(seznam[0].createdAt > seznam[seznam.length - 1].createdAt).toBe(true)
  })

  it('autoSnapshotIfDue uloží první automatický snímek okamžitě', async () => {
    expect(await listSnapshots()).toHaveLength(0)
    await autoSnapshotIfDue()

    const seznam = await listSnapshots()
    expect(seznam).toHaveLength(1)
    expect(seznam[0].source).toBe('auto')
  })

  it('autoSnapshotIfDue neudělá druhý automatický snímek dřív než za 24 hodin', async () => {
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))
    await autoSnapshotIfDue()
    expect(await listSnapshots()).toHaveLength(1)

    vi.setSystemTime(new Date('2026-01-01T15:00:00Z')) // jen 5 hodin později
    await autoSnapshotIfDue()
    expect(await listSnapshots()).toHaveLength(1)
  })

  it('autoSnapshotIfDue udělá další automatický snímek po 24 hodinách', async () => {
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))
    await autoSnapshotIfDue()

    vi.setSystemTime(new Date('2026-01-02T11:00:00Z')) // o 25 hodin později
    await autoSnapshotIfDue()

    expect(await listSnapshots()).toHaveLength(2)
  })

  it('souběžná volání autoSnapshotIfDue nevyrobí dva snímky naráz', async () => {
    const [a, b] = await Promise.all([autoSnapshotIfDue(), autoSnapshotIfDue()])
    expect(a).toBe(b) // appka vrací stejný in-flight Promise, ne dvě volání
    expect(await listSnapshots()).toHaveLength(1)
  })
})
