import * as v from 'valibot'
import { DRUM_SOUNDS, KROKU_V_PATTERNU } from '@/miniapps/music-studio/types'

// ==========================================
// Ověření dat Music Studia (beaty/nahrávky/skladby) načtených z
// úložiště. Stejná "poškozená položka se zahodí, ne že by shodila celý
// seznam" zásada jako gameCharacterValidation.ts/inventarValidation.ts
// — appka jednu rozbitou nahrávku zapomene, ne že by uživateli smazala
// všechny ostatní beaty a skladby s ní.
// ==========================================

const jeBoolPole8 = (data: unknown): data is boolean[] =>
  Array.isArray(data) && data.length === KROKU_V_PATTERNU && data.every((x) => typeof x === 'boolean')

const sanitizujPattern = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.id !== 'string' || typeof d.name !== 'string' || typeof d.createdAt !== 'string') return null
  if (typeof d.bpm !== 'number' || !Number.isFinite(d.bpm) || d.bpm < 40 || d.bpm > 240) return null

  const kroky = d.kroky && typeof d.kroky === 'object' ? (d.kroky as Record<string, unknown>) : {}
  if (!DRUM_SOUNDS.every((buben) => jeBoolPole8(kroky[buben]))) return null

  return {
    id: d.id,
    name: d.name,
    bpm: d.bpm,
    kroky: kroky as Record<(typeof DRUM_SOUNDS)[number], boolean[]>,
    createdAt: d.createdAt,
  }
}

const sanitizujRecording = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (
    typeof d.id !== 'string' ||
    typeof d.name !== 'string' ||
    typeof d.mime !== 'string' ||
    typeof d.createdAt !== 'string' ||
    typeof d.durationSec !== 'number' ||
    !Number.isFinite(d.durationSec)
  ) {
    return null
  }
  return { id: d.id, name: d.name, mime: d.mime, durationSec: Math.max(0, d.durationSec), createdAt: d.createdAt }
}

const sanitizujSong = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.id !== 'string' || typeof d.name !== 'string' || typeof d.createdAt !== 'string') return null
  const jePlatnyOdkaz = (x: unknown): x is string | null => x === null || typeof x === 'string'
  if (!jePlatnyOdkaz(d.beatPatternId) || !jePlatnyOdkaz(d.recordingId)) return null

  return { id: d.id, name: d.name, beatPatternId: d.beatPatternId, recordingId: d.recordingId, createdAt: d.createdAt }
}

const MusicStudioSchema = v.object({
  patterns: v.optional(v.array(v.unknown()), []),
  recordings: v.optional(v.array(v.unknown()), []),
  songs: v.optional(v.array(v.unknown()), []),
})

export const validateMusicStudioData = (data: unknown) => {
  const result = v.safeParse(MusicStudioSchema, data)
  if (!result.success) {
    console.warn('Data Music Studia neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  return {
    success: true as const,
    data: {
      patterns: result.output.patterns.map(sanitizujPattern).filter((p): p is NonNullable<typeof p> => p !== null),
      recordings: result.output.recordings
        .map(sanitizujRecording)
        .filter((r): r is NonNullable<typeof r> => r !== null),
      songs: result.output.songs.map(sanitizujSong).filter((s): s is NonNullable<typeof s> => s !== null),
    },
  }
}
