import { vytvorZaznamovySync, naIso, zIso, type TabulkaSync } from '@/core/supabase/recordSync'
import { jeIdDilaZDb, type PolicovyZaznam, type PostupZaznam } from '@/core/utils/libraryShelfValidation'
import {
  getRawLibraryShelf, setRawLibraryShelf, subscribeLibraryShelf,
} from './useLibraryShelf'
import {
  getRawLibraryPostup, setRawLibraryPostup, subscribeLibraryPostup,
} from './useLibraryPostup'
import {
  getRawLibraryAnotace, setRawLibraryAnotace, subscribeLibraryAnotace,
} from './useLibraryAnnotations'
import type { AnotaceZaznam } from '@/core/utils/libraryAnnotationsValidation'

// ==========================================
// Library — synchronizace police a postupu čtení (library_shelf,
// library_progress). Stejný "záznam po záznamu" stroj jako Finance/Writer's
// Room; tabulky nemají sloupec `id` (PK = user_id + work_id), proto
// `onConflict`. Do cloudu jdou jen díla z databáze (uuid) — ukázky
// zabudované v appce v DB neexistují a cizí klíč by celý průchod shodil.
// ==========================================

const jenZDb = <T extends { id: string }>(items: T[]): T[] => items.filter((i) => jeIdDilaZDb(i.id))
const jenUkazky = <T extends { id: string }>(items: T[]): T[] => items.filter((i) => !jeIdDilaZDb(i.id))

export const policeTabulka: TabulkaSync<PolicovyZaznam> = {
  table: 'library_shelf',
  onConflict: 'user_id,work_id',
  getLocal: () => jenZDb(getRawLibraryShelf().zaznamy),
  // Místní ukázky (bez uuid) zůstávají, sync je nezná; zbytek nahradí stažený stav.
  setLocal: (items) => setRawLibraryShelf([...items, ...jenUkazky(getRawLibraryShelf().zaznamy)]),
  toRow: (userId, z) => ({
    user_id: userId,
    work_id: z.id,
    updated_at: naIso(z.updatedAt),
    deleted_at: z.deletedAt ? naIso(z.deletedAt) : null,
  }),
  fromRow: (r) => ({
    id: r.work_id as string,
    updatedAt: zIso(r.updated_at),
    deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
  }),
}

export const postupTabulka: TabulkaSync<PostupZaznam> = {
  table: 'library_progress',
  onConflict: 'user_id,work_id',
  getLocal: () => jenZDb(getRawLibraryPostup().postupy),
  setLocal: (items) => setRawLibraryPostup([...items, ...jenUkazky(getRawLibraryPostup().postupy)]),
  toRow: (userId, p) => ({
    user_id: userId,
    work_id: p.id,
    version_id: p.versionId && jeIdDilaZDb(p.versionId) ? p.versionId : null,
    chapter_pos: p.chapterPos,
    block_idx: p.blockIdx,
    char_off: 0,
    page_pos: 0,
    percent: p.percent,
    seconds_read: p.secondsRead,
    finished_at: p.finishedAt ? naIso(p.finishedAt) : null,
    updated_at: naIso(p.updatedAt),
  }),
  fromRow: (r) => ({
    id: r.work_id as string,
    updatedAt: zIso(r.updated_at),
    deletedAt: null,
    versionId: (r.version_id as string | null) ?? null,
    chapterPos: Number(r.chapter_pos) || 0,
    blockIdx: Number(r.block_idx) || 0,
    percent: Number(r.percent) || 0,
    secondsRead: Number(r.seconds_read) || 0,
    finishedAt: r.finished_at ? zIso(r.finished_at) : null,
  }),
}

export const anotaceTabulka: TabulkaSync<AnotaceZaznam> = {
  table: 'library_annotations',
  getLocal: () => getRawLibraryAnotace().anotace.filter((a) => jeIdDilaZDb(a.workId)),
  // Anotace k místním ukázkám (bez uuid) v DB neexistují, sync je nezná a zachová je.
  setLocal: (items) =>
    setRawLibraryAnotace([...items, ...getRawLibraryAnotace().anotace.filter((a) => !jeIdDilaZDb(a.workId))]),
  toRow: (userId, a) => ({
    id: a.id,
    user_id: userId,
    work_id: a.workId,
    version_id: a.versionId && jeIdDilaZDb(a.versionId) ? a.versionId : null,
    kind: a.kind,
    chapter_pos: a.chapterPos,
    block_idx: a.blockIdx,
    char_start: a.charStart,
    char_end: a.charEnd,
    page_pos: null,
    excerpt: a.excerpt || null,
    note: a.note,
    color: a.color,
    created_at: naIso(a.createdAt),
    updated_at: naIso(a.updatedAt),
    deleted_at: a.deletedAt ? naIso(a.deletedAt) : null,
  }),
  fromRow: (r) => ({
    id: r.id as string,
    workId: r.work_id as string,
    versionId: (r.version_id as string | null) ?? null,
    kind: r.kind as AnotaceZaznam['kind'],
    chapterPos: Number(r.chapter_pos) || 0,
    blockIdx: Number(r.block_idx) || 0,
    charStart: Number(r.char_start) || 0,
    charEnd: Number(r.char_end) || 0,
    excerpt: (r.excerpt as string | null) ?? '',
    note: (r.note as string | null) ?? null,
    color: (r.color as AnotaceZaznam['color']) ?? null,
    createdAt: zIso(r.created_at),
    updatedAt: zIso(r.updated_at),
    deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
  }),
}

const { useSyncStatus: useLibrarySyncStatus, syncNow: syncLibraryNow, start: startLibrarySync } = vytvorZaznamovySync(
  'schoolbuddy-library-sync-cursor',
  () => [policeTabulka, postupTabulka, anotaceTabulka],
  (posluchac) => {
    subscribeLibraryShelf(posluchac)
    subscribeLibraryPostup(posluchac)
    subscribeLibraryAnotace(posluchac)
  },
)

export { useLibrarySyncStatus, syncLibraryNow, startLibrarySync }
