import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { sanitizujScenar, validateScreenplayWriterData } from '@/core/utils/screenplayWriterValidation'
import { AkcePrvek, DialogPrvek, Scena, ScenaPrvek, Scenar, TypMista } from './types'
import { StavPolozky } from '@/flagships/writer-room/writerRoomStav'
import { nahradVTextu } from '@/flagships/writer-room/writerRoomNahradit'

const SCREENPLAY_XP = 6

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

interface ScreenplayWriterState {
  scenare: Scenar[]
  addScenar: (nazev: string) => string
  updateScenar: (id: string, nazev: string) => void
  deleteScenar: (id: string) => void
  setCilScen: (scenarId: string, cil: number | null) => void
  addScena: (scenarId: string, data: { typMista: TypMista; misto: string; cas: string }) => void
  updateScena: (
    scenarId: string,
    scenaId: string,
    data: { typMista?: TypMista; misto?: string; cas?: string; stav?: StavPolozky; poznamka?: string; stitky?: string }
  ) => void
  deleteScena: (scenarId: string, scenaId: string) => void
  addAkce: (scenarId: string, scenaId: string, text: string) => void
  addDialog: (scenarId: string, scenaId: string, data: { postava: string; text: string; poznamka?: string }) => void
  updatePrvek: (scenarId: string, scenaId: string, prvekId: string, data: { text?: string; postava?: string; poznamka?: string }) => void
  deletePrvek: (scenarId: string, scenaId: string, prvekId: string) => void
  presunScenu: (scenarId: string, scenaId: string, smer: 'nahoru' | 'dolu') => void
  // Založí víc scén najednou podle šablony (viz SABLONY_SCEN v types.ts).
  pridatSablonu: (scenarId: string, sceny: { typMista: TypMista; misto: string; cas: string }[]) => void
  // Najde a nahradí zadaný text napříč celým scénářem — v akčním textu
  // i v textu/jménu postavy u repliky (proto to zvládne i hromadné
  // přejmenování postavy), vrací počet skutečných záměn.
  nahradVScenari: (scenarId: string, hledat: string, nahradit: string) => number
  // Stejná role jako Kniha's obnovZeCheckpointu.
  obnovZeCheckpointu: (scenarId: string, snapshot: unknown) => boolean
  // "Bible postav" — uloží/přepíše soukromou poznámku ke jménu postavy.
  setPoznamkaPostavy: (scenarId: string, jmeno: string, poznamka: string) => void
  // Stejná role jako Kniha's duplikovatKniha — hluboká kopie
  // existujícího scénáře (nové id scénáře i každé scény), žádná XP.
  duplikovatScenar: (id: string) => string | null
}

// Stejný sdílený "posuň o jedno místo, no-op na kraji" helper jako
// useBookWriter.ts — kdyby se to nekopírovalo, znamenalo by to
// importovat mezi dvěma jinak nezávislými appkami jen kvůli deseti
// řádkům.
const posunPolozku = <T,>(pole: T[], index: number, smer: 'nahoru' | 'dolu'): T[] => {
  const cil = smer === 'nahoru' ? index - 1 : index + 1
  if (cil < 0 || cil >= pole.length) return pole
  const nove = [...pole]
  ;[nove[index], nove[cil]] = [nove[cil], nove[index]]
  return nove
}

const useScreenplayWriterStore = create<ScreenplayWriterState>()(
  persist(
    (set) => ({
      scenare: [],

      addScenar: (nazev) => {
        const id = noveId()
        const ted = new Date().toISOString()
        const novy: Scenar = {
          id,
          nazev: nazev.trim() || 'Nový scénář',
          sceny: [],
          createdAt: ted,
          upravenoAt: ted,
          cilScen: null,
          postavyPoznamky: {},
        }
        set((state) => ({ scenare: [novy, ...state.scenare] }))
        return id
      },

      // Živě vázaný vstup jako updateKniha — bez trimu/fallbacku.
      updateScenar: (id, nazev) =>
        set((state) => ({
          scenare: state.scenare.map((s) => (s.id === id ? { ...s, nazev, upravenoAt: new Date().toISOString() } : s)),
        })),

      deleteScenar: (id) => set((state) => ({ scenare: state.scenare.filter((s) => s.id !== id) })),

      setCilScen: (scenarId, cil) =>
        set((state) => ({
          scenare: state.scenare.map((s) => (s.id === scenarId ? { ...s, cilScen: cil, upravenoAt: new Date().toISOString() } : s)),
        })),

      // Odměna se dává za dokončenou scénu, ne za jednotlivou repliku —
      // scéna je tu ta smysluplná jednotka tvorby, stejně jako kapitola
      // u Knihy.
      addScena: (scenarId, data) => {
        const nova = {
          id: noveId(),
          ...data,
          prvky: [],
          createdAt: new Date().toISOString(),
          stav: 'napad' as StavPolozky,
          poznamka: '',
          stitky: '',
        }
        set((state) => ({
          scenare: state.scenare.map((s) =>
            s.id === scenarId ? { ...s, sceny: [...s.sceny, nova], upravenoAt: new Date().toISOString() } : s
          ),
        }))
        useGamificationStore.getState().recordAction('screenplay', SCREENPLAY_XP)
      },

      updateScena: (scenarId, scenaId, data) =>
        set((state) => ({
          scenare: state.scenare.map((s) =>
            s.id !== scenarId
              ? s
              : {
                  ...s,
                  sceny: s.sceny.map((sc): Scena => (sc.id === scenaId ? { ...sc, ...data } : sc)),
                  upravenoAt: new Date().toISOString(),
                }
          ),
        })),

      deleteScena: (scenarId, scenaId) =>
        set((state) => ({
          scenare: state.scenare.map((s) =>
            s.id !== scenarId
              ? s
              : { ...s, sceny: s.sceny.filter((sc) => sc.id !== scenaId), upravenoAt: new Date().toISOString() }
          ),
        })),

      addAkce: (scenarId, scenaId, text) => {
        const prvek: AkcePrvek = { id: noveId(), typ: 'akce', text }
        set((state) => ({
          scenare: state.scenare.map((s) =>
            s.id !== scenarId
              ? s
              : {
                  ...s,
                  sceny: s.sceny.map((sc) => (sc.id === scenaId ? { ...sc, prvky: [...sc.prvky, prvek] } : sc)),
                  upravenoAt: new Date().toISOString(),
                }
          ),
        }))
      },

      addDialog: (scenarId, scenaId, data) => {
        const prvek: DialogPrvek = {
          id: noveId(),
          typ: 'dialog',
          postava: data.postava.trim() || 'POSTAVA',
          text: data.text,
          poznamka: data.poznamka ?? '',
        }
        set((state) => ({
          scenare: state.scenare.map((s) =>
            s.id !== scenarId
              ? s
              : {
                  ...s,
                  sceny: s.sceny.map((sc) => (sc.id === scenaId ? { ...sc, prvky: [...sc.prvky, prvek] } : sc)),
                  upravenoAt: new Date().toISOString(),
                }
          ),
        }))
      },

      // Data drží text/postava/poznamka volně, bez ohledu na typ prvku —
      // volající vždycky pošle jen pole, co pro daný typ dávají smysl
      // (viz ScreenplayWriter.tsx), takže spread nikdy nepřepíše `typ`
      // ani nezamíchá pole mezi akcí a dialogem.
      updatePrvek: (scenarId, scenaId, prvekId, data) =>
        set((state) => ({
          scenare: state.scenare.map((s) =>
            s.id !== scenarId
              ? s
              : {
                  ...s,
                  sceny: s.sceny.map((sc) =>
                    sc.id !== scenaId
                      ? sc
                      : {
                          ...sc,
                          prvky: sc.prvky.map((p): ScenaPrvek => (p.id === prvekId ? ({ ...p, ...data } as ScenaPrvek) : p)),
                        }
                  ),
                  upravenoAt: new Date().toISOString(),
                }
          ),
        })),

      deletePrvek: (scenarId, scenaId, prvekId) =>
        set((state) => ({
          scenare: state.scenare.map((s) =>
            s.id !== scenarId
              ? s
              : {
                  ...s,
                  sceny: s.sceny.map((sc) =>
                    sc.id !== scenaId ? sc : { ...sc, prvky: sc.prvky.filter((p) => p.id !== prvekId) }
                  ),
                  upravenoAt: new Date().toISOString(),
                }
          ),
        })),

      presunScenu: (scenarId, scenaId, smer) =>
        set((state) => ({
          scenare: state.scenare.map((s) => {
            if (s.id !== scenarId) return s
            const index = s.sceny.findIndex((sc) => sc.id === scenaId)
            if (index < 0) return s
            return { ...s, sceny: posunPolozku(s.sceny, index, smer), upravenoAt: new Date().toISOString() }
          }),
        })),

      pridatSablonu: (scenarId, sceny) => {
        const ted = new Date().toISOString()
        const nove = sceny.map((data) => ({
          id: noveId(),
          ...data,
          prvky: [],
          createdAt: ted,
          stav: 'napad' as StavPolozky,
          poznamka: '',
          stitky: '',
        }))
        set((state) => ({
          scenare: state.scenare.map((s) => (s.id === scenarId ? { ...s, sceny: [...s.sceny, ...nove], upravenoAt: ted } : s)),
        }))
        nove.forEach(() => useGamificationStore.getState().recordAction('screenplay', SCREENPLAY_XP))
      },

      nahradVScenari: (scenarId, hledat, nahradit) => {
        let celkemZamen = 0
        set((state) => ({
          scenare: state.scenare.map((s) => {
            if (s.id !== scenarId) return s
            const sceny = s.sceny.map((sc) => {
              const prvky = sc.prvky.map((p): ScenaPrvek => {
                if (p.typ === 'akce') {
                  const { text, pocet } = nahradVTextu(p.text, hledat, nahradit)
                  celkemZamen += pocet
                  return pocet > 0 ? { ...p, text } : p
                }
                const textVysledek = nahradVTextu(p.text, hledat, nahradit)
                const postavaVysledek = nahradVTextu(p.postava, hledat, nahradit)
                celkemZamen += textVysledek.pocet + postavaVysledek.pocet
                return textVysledek.pocet + postavaVysledek.pocet > 0
                  ? { ...p, text: textVysledek.text, postava: postavaVysledek.text }
                  : p
              })
              return { ...sc, prvky }
            })
            return celkemZamen > 0 ? { ...s, sceny, upravenoAt: new Date().toISOString() } : s
          }),
        }))
        return celkemZamen
      },

      obnovZeCheckpointu: (scenarId, snapshot) => {
        const sanitizovano = sanitizujScenar(snapshot)
        if (!sanitizovano) return false
        set((state) => ({
          scenare: state.scenare.map((s) =>
            s.id === scenarId
              ? {
                  ...s,
                  nazev: sanitizovano.nazev,
                  sceny: sanitizovano.sceny,
                  cilScen: sanitizovano.cilScen,
                  postavyPoznamky: sanitizovano.postavyPoznamky,
                  upravenoAt: new Date().toISOString(),
                }
              : s
          ),
        }))
        return true
      },

      setPoznamkaPostavy: (scenarId, jmeno, poznamka) =>
        set((state) => ({
          scenare: state.scenare.map((s) =>
            s.id === scenarId ? { ...s, postavyPoznamky: { ...s.postavyPoznamky, [jmeno]: poznamka } } : s
          ),
        })),

      duplikovatScenar: (id) => {
        let novaId: string | null = null
        set((state) => {
          const original = state.scenare.find((s) => s.id === id)
          if (!original) return state
          const ted = new Date().toISOString()
          novaId = noveId()
          const kopie: Scenar = {
            ...original,
            id: novaId,
            nazev: `${original.nazev} (kopie)`,
            createdAt: ted,
            upravenoAt: ted,
            sceny: original.sceny.map((sc) => ({ ...sc, id: noveId(), prvky: sc.prvky.map((p) => ({ ...p, id: noveId() })) })),
          }
          return { scenare: [kopie, ...state.scenare] }
        })
        return novaId
      },
    }),
    {
      name: 'schoolbuddy-screenplay-writer-storage',
      storage: createJSONStorage(() => secureStorage),
      merge: (persisted, current) => {
        const validation = validateScreenplayWriterData(persisted)
        if (!validation.success) {
          console.error('Data Scénáře v LocalStorage byla poškozena. Obnovuji výchozí stav.')
          return current
        }
        return { ...current, ...validation.data }
      },
    }
  )
)

export const useScreenplayWriter = () => useScreenplayWriterStore()
