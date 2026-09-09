import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateComicWriterData } from '@/core/utils/comicWriterValidation'
import { Komiks, Panel, PanelRadek, TypRadku } from './types'
import { StavPolozky } from '@/flagships/writer-room/writerRoomStav'

const COMIC_XP = 6

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

interface ComicWriterState {
  komiksy: Komiks[]
  addKomiks: (nazev: string) => string
  updateKomiks: (id: string, nazev: string) => void
  deleteKomiks: (id: string) => void
  setCilStran: (komiksId: string, cil: number | null) => void
  addStrana: (komiksId: string) => void
  updateStrana: (komiksId: string, stranaId: string, data: { stav?: StavPolozky; poznamka?: string }) => void
  deleteStrana: (komiksId: string, stranaId: string) => void
  addPanel: (komiksId: string, stranaId: string, vizual: string) => void
  updatePanel: (komiksId: string, stranaId: string, panelId: string, vizual: string) => void
  deletePanel: (komiksId: string, stranaId: string, panelId: string) => void
  addRadek: (komiksId: string, stranaId: string, panelId: string, data: { typ: TypRadku; postava?: string; text: string }) => void
  updateRadek: (
    komiksId: string,
    stranaId: string,
    panelId: string,
    radekId: string,
    data: { typ?: TypRadku; postava?: string; text?: string }
  ) => void
  deleteRadek: (komiksId: string, stranaId: string, panelId: string, radekId: string) => void
  presunStranu: (komiksId: string, stranaId: string, smer: 'nahoru' | 'dolu') => void
}

// Stejný sdílený "posuň o jedno místo, no-op na kraji" helper jako
// useBookWriter.ts/useScreenplayWriter.ts.
const posunPolozku = <T,>(pole: T[], index: number, smer: 'nahoru' | 'dolu'): T[] => {
  const cil = smer === 'nahoru' ? index - 1 : index + 1
  if (cil < 0 || cil >= pole.length) return pole
  const nove = [...pole]
  ;[nove[index], nove[cil]] = [nove[cil], nove[index]]
  return nove
}

// Strana.cislo je pořadové číslo k zobrazení, ne trvalé id — po
// smazání nebo přesunu strany se musí přečíslovat na 1..N znova,
// jinak by po smazání strany 2 ze tří zůstaly viset strany 1 a 3 s
// dírou místo strany 2.
const prescislovatStrany = (strany: Komiks['strany']): Komiks['strany'] => strany.map((s, i) => ({ ...s, cislo: i + 1 }))

const useComicWriterStore = create<ComicWriterState>()(
  persist(
    (set) => ({
      komiksy: [],

      addKomiks: (nazev) => {
        const id = noveId()
        const ted = new Date().toISOString()
        const novy: Komiks = { id, nazev: nazev.trim() || 'Nový komiks', strany: [], createdAt: ted, upravenoAt: ted, cilStran: null }
        set((state) => ({ komiksy: [novy, ...state.komiksy] }))
        return id
      },

      // Živě vázaný vstup jako updateKniha/updateScenar — bez trimu/
      // fallbacku.
      updateKomiks: (id, nazev) =>
        set((state) => ({
          komiksy: state.komiksy.map((k) => (k.id === id ? { ...k, nazev, upravenoAt: new Date().toISOString() } : k)),
        })),

      deleteKomiks: (id) => set((state) => ({ komiksy: state.komiksy.filter((k) => k.id !== id) })),

      setCilStran: (komiksId, cil) =>
        set((state) => ({
          komiksy: state.komiksy.map((k) => (k.id === komiksId ? { ...k, cilStran: cil, upravenoAt: new Date().toISOString() } : k)),
        })),

      addStrana: (komiksId) =>
        set((state) => ({
          komiksy: state.komiksy.map((k) => {
            if (k.id !== komiksId) return k
            const cislo = k.strany.length + 1
            const nova = { id: noveId(), cislo, panely: [], stav: 'napad' as StavPolozky, poznamka: '' }
            return { ...k, strany: [...k.strany, nova], upravenoAt: new Date().toISOString() }
          }),
        })),

      updateStrana: (komiksId, stranaId, data) =>
        set((state) => ({
          komiksy: state.komiksy.map((k) =>
            k.id !== komiksId
              ? k
              : {
                  ...k,
                  strany: k.strany.map((s) => (s.id === stranaId ? { ...s, ...data } : s)),
                  upravenoAt: new Date().toISOString(),
                }
          ),
        })),

      deleteStrana: (komiksId, stranaId) =>
        set((state) => ({
          komiksy: state.komiksy.map((k) =>
            k.id !== komiksId
              ? k
              : {
                  ...k,
                  strany: prescislovatStrany(k.strany.filter((s) => s.id !== stranaId)),
                  upravenoAt: new Date().toISOString(),
                }
          ),
        })),

      // Odměna za hotový panel, ne za stranu — panel je tu ta nejmenší
      // smysluplná tvůrčí jednotka, stejně jako scéna u Scénáře.
      addPanel: (komiksId, stranaId, vizual) => {
        const novy: Panel = { id: noveId(), vizual, radky: [], createdAt: new Date().toISOString() }
        set((state) => ({
          komiksy: state.komiksy.map((k) =>
            k.id !== komiksId
              ? k
              : {
                  ...k,
                  strany: k.strany.map((s) => (s.id === stranaId ? { ...s, panely: [...s.panely, novy] } : s)),
                  upravenoAt: new Date().toISOString(),
                }
          ),
        }))
        useGamificationStore.getState().recordAction('comic', COMIC_XP)
      },

      updatePanel: (komiksId, stranaId, panelId, vizual) =>
        set((state) => ({
          komiksy: state.komiksy.map((k) =>
            k.id !== komiksId
              ? k
              : {
                  ...k,
                  strany: k.strany.map((s) =>
                    s.id !== stranaId
                      ? s
                      : { ...s, panely: s.panely.map((p) => (p.id === panelId ? { ...p, vizual } : p)) }
                  ),
                  upravenoAt: new Date().toISOString(),
                }
          ),
        })),

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
                  upravenoAt: new Date().toISOString(),
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
                  upravenoAt: new Date().toISOString(),
                }
          ),
        }))
      },

      updateRadek: (komiksId, stranaId, panelId, radekId, data) =>
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
                            p.id !== panelId
                              ? p
                              : { ...p, radky: p.radky.map((r) => (r.id === radekId ? { ...r, ...data } : r)) }
                          ),
                        }
                  ),
                  upravenoAt: new Date().toISOString(),
                }
          ),
        })),

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
                  upravenoAt: new Date().toISOString(),
                }
          ),
        })),

      presunStranu: (komiksId, stranaId, smer) =>
        set((state) => ({
          komiksy: state.komiksy.map((k) => {
            if (k.id !== komiksId) return k
            const index = k.strany.findIndex((s) => s.id === stranaId)
            if (index < 0) return k
            return { ...k, strany: prescislovatStrany(posunPolozku(k.strany, index, smer)), upravenoAt: new Date().toISOString() }
          }),
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
