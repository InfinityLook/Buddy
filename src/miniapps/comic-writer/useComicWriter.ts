import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateComicWriterData } from '@/core/utils/comicWriterValidation'
import { Komiks, Panel, PanelRadek, TypRadku } from './types'

const COMIC_XP = 6

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

interface ComicWriterState {
  komiksy: Komiks[]
  addKomiks: (nazev: string) => string
  deleteKomiks: (id: string) => void
  addStrana: (komiksId: string) => void
  deleteStrana: (komiksId: string, stranaId: string) => void
  addPanel: (komiksId: string, stranaId: string, vizual: string) => void
  deletePanel: (komiksId: string, stranaId: string, panelId: string) => void
  addRadek: (komiksId: string, stranaId: string, panelId: string, data: { typ: TypRadku; postava?: string; text: string }) => void
  deleteRadek: (komiksId: string, stranaId: string, panelId: string, radekId: string) => void
}

const useComicWriterStore = create<ComicWriterState>()(
  persist(
    (set) => ({
      komiksy: [],

      addKomiks: (nazev) => {
        const id = noveId()
        const novy: Komiks = { id, nazev: nazev.trim() || 'Nový komiks', strany: [], createdAt: new Date().toISOString() }
        set((state) => ({ komiksy: [novy, ...state.komiksy] }))
        return id
      },

      deleteKomiks: (id) => set((state) => ({ komiksy: state.komiksy.filter((k) => k.id !== id) })),

      addStrana: (komiksId) =>
        set((state) => ({
          komiksy: state.komiksy.map((k) => {
            if (k.id !== komiksId) return k
            const cislo = k.strany.length + 1
            return { ...k, strany: [...k.strany, { id: noveId(), cislo, panely: [] }] }
          }),
        })),

      deleteStrana: (komiksId, stranaId) =>
        set((state) => ({
          komiksy: state.komiksy.map((k) =>
            k.id !== komiksId ? k : { ...k, strany: k.strany.filter((s) => s.id !== stranaId) }
          ),
        })),

      // Odměna za hotový panel, ne za stranu — panel je tu ta nejmenší
      // smysluplná tvůrčí jednotka, stejně jako scéna u Scénáře.
      addPanel: (komiksId, stranaId, vizual) => {
        const novy: Panel = { id: noveId(), vizual, radky: [] }
        set((state) => ({
          komiksy: state.komiksy.map((k) =>
            k.id !== komiksId
              ? k
              : { ...k, strany: k.strany.map((s) => (s.id === stranaId ? { ...s, panely: [...s.panely, novy] } : s)) }
          ),
        }))
        useGamificationStore.getState().recordAction('comic', COMIC_XP)
      },

      deletePanel: (komiksId, stranaId, panelId) =>
        set((state) => ({
          komiksy: state.komiksy.map((k) =>
            k.id !== komiksId
              ? k
              : {
                  ...k,
                  strany: k.strany.map((s) =>
                    s.id !== stranaId ? s : { ...s, panely: s.panely.filter((p) => p.id !== panelId) }
                  ),
                }
          ),
        })),

      addRadek: (komiksId, stranaId, panelId, data) => {
        const radek: PanelRadek = { id: noveId(), typ: data.typ, postava: data.postava?.trim() ?? '', text: data.text }
        set((state) => ({
          komiksy: state.komiksy.map((k) =>
            k.id !== komiksId
              ? k
              : {
                  ...k,
                  strany: k.strany.map((s) =>
                    s.id !== stranaId
                      ? s
                      : {
                          ...s,
                          panely: s.panely.map((p) => (p.id === panelId ? { ...p, radky: [...p.radky, radek] } : p)),
                        }
                  ),
                }
          ),
        }))
      },

      deleteRadek: (komiksId, stranaId, panelId, radekId) =>
        set((state) => ({
          komiksy: state.komiksy.map((k) =>
            k.id !== komiksId
              ? k
              : {
                  ...k,
                  strany: k.strany.map((s) =>
                    s.id !== stranaId
                      ? s
                      : {
                          ...s,
                          panely: s.panely.map((p) =>
                            p.id !== panelId ? p : { ...p, radky: p.radky.filter((r) => r.id !== radekId) }
                          ),
                        }
                  ),
                }
          ),
        })),
    }),
    {
      name: 'schoolbuddy-comic-writer-storage',
      storage: createJSONStorage(() => secureStorage),
      merge: (persisted, current) => {
        const validation = validateComicWriterData(persisted)
        if (!validation.success) {
          console.error('Data Komiksu v LocalStorage byla poškozena. Obnovuji výchozí stav.')
          return current
        }
        return { ...current, ...validation.data }
      },
    }
  )
)

export const useComicWriter = () => useComicWriterStore()
