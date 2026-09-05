import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { deleteFileBlob } from '@/core/utils/fileStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateMusicStudioData } from '@/core/utils/musicStudioValidation'
import { BeatPattern, NAHRAVKA_ID_PREFIX, Recording, Song } from './types'

// XP je stejně nízké jako u ostatních "tvůrčích" miniaplikací
// (transakce ve Financích, kartička ve Flashcards) — appka odměňuje
// každou jednotlivou tvorbu málo, ať se to dá dělat opakovaně, ne jednu
// velkou odměnu za první pokus.
const MUSIC_XP = 8

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

interface MusicStudioState {
  patterns: BeatPattern[]
  recordings: Recording[]
  songs: Song[]
  addPattern: (name: string, pattern: Omit<BeatPattern, 'id' | 'name' | 'createdAt'>) => void
  deletePattern: (id: string) => void
  addRecordingMeta: (recording: Omit<Recording, 'id' | 'createdAt'>) => string
  deleteRecording: (id: string) => void
  addSong: (name: string, beatPatternId: string | null, recordingId: string | null) => void
  deleteSong: (id: string) => void
}

const useMusicStudioStore = create<MusicStudioState>()(
  persist(
    (set) => ({
      patterns: [],
      recordings: [],
      songs: [],

      addPattern: (name, pattern) => {
        const novy: BeatPattern = { ...pattern, id: noveId(), name: name.trim() || 'Beat', createdAt: new Date().toISOString() }
        set((state) => ({ patterns: [novy, ...state.patterns] }))
        useGamificationStore.getState().recordAction('music', MUSIC_XP)
      },

      deletePattern: (id) => {
        set((state) => ({
          patterns: state.patterns.filter((p) => p.id !== id),
          // Skladba odkazující na smazaný pattern ho ztratí, ne appku
          // shodí — stejné ON DELETE SET NULL chování jako
          // messages.story_id po expiraci story v Social.
          songs: state.songs.map((s) => (s.beatPatternId === id ? { ...s, beatPatternId: null } : s)),
        }))
      },

      // Vrací id, ať appka ví, kam v IndexedDB uložit skutečný Blob
      // nahrávky (viz MusicStudio.tsx) — id se generuje tady, ne až
      // při zápisu blobu, protože metadata a obsah musí sdílet přesně
      // stejné id.
      addRecordingMeta: (recording) => {
        // Prefix ať se prostor id nikdy nepotká s File Manager's
        // vlastními id ve sdíleném IndexedDB úložišti (obojí čte/píše
        // core/utils/fileStorage.ts do jedné tabulky) — viz types.ts.
        const id = NAHRAVKA_ID_PREFIX + noveId()
        const nova: Recording = { ...recording, id, createdAt: new Date().toISOString() }
        set((state) => ({ recordings: [nova, ...state.recordings] }))
        useGamificationStore.getState().recordAction('music', MUSIC_XP)
        return id
      },

      deleteRecording: (id) => {
        set((state) => ({
          recordings: state.recordings.filter((r) => r.id !== id),
          songs: state.songs.map((s) => (s.recordingId === id ? { ...s, recordingId: null } : s)),
        }))
        void deleteFileBlob(id)
      },

      addSong: (name, beatPatternId, recordingId) => {
        const nova: Song = {
          id: noveId(),
          name: name.trim() || 'Skladba',
          beatPatternId,
          recordingId,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ songs: [nova, ...state.songs] }))
        useGamificationStore.getState().recordAction('music', MUSIC_XP)
      },

      deleteSong: (id) => set((state) => ({ songs: state.songs.filter((s) => s.id !== id) })),
    }),
    {
      name: 'schoolbuddy-music-studio-storage',
      storage: createJSONStorage(() => secureStorage),
      // merge, ne migrate — poškozená/neplatná položka se má zahodit
      // po jedné (viz musicStudioValidation.ts), ne shodit celý
      // uložený stav jen kvůli jedné rozbité nahrávce nebo skladbě.
      merge: (persisted, current) => {
        const validation = validateMusicStudioData(persisted)
        if (!validation.success) {
          console.error('Data Music Studia v LocalStorage byla poškozena. Obnovuji výchozí stav.')
          return current
        }
        return { ...current, ...validation.data }
      },
    }
  )
)

export const useMusicStudio = () => useMusicStudioStore()
