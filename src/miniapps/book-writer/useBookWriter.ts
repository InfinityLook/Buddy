import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { sanitizujKnihu, validateBookWriterData } from '@/core/utils/bookWriterValidation'
import { Kniha } from './types'
import { StavPolozky } from '@/flagships/writer-room/writerRoomStav'
import { nahradVTextu } from '@/flagships/writer-room/writerRoomNahradit'

// Stejně nízké XP jako u ostatních tvůrčích miniaplikací (Music Studio,
// Kalendář) — odměna za jednu kapitolu, ne za celou knihu, ať se to dá
// dělat opakovaně.
const BOOK_XP = 6

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

interface BookWriterState {
  knihy: Kniha[]
  addKniha: (nazev: string) => string
  updateKniha: (id: string, nazev: string) => void
  deleteKniha: (id: string) => void
  setCilSlov: (knihaId: string, cil: number | null) => void
  addKapitola: (knihaId: string, nazev: string) => void
  updateKapitola: (
    knihaId: string,
    kapitolaId: string,
    data: { nazev?: string; text?: string; stav?: StavPolozky; poznamka?: string; stitky?: string }
  ) => void
  deleteKapitola: (knihaId: string, kapitolaId: string) => void
  presunKapitolu: (knihaId: string, kapitolaId: string, smer: 'nahoru' | 'dolu') => void
  // Založí víc kapitol najednou podle šablony (viz SABLONY_KAPITOL v
  // types.ts) — stejná odměna jako za kapitolu přidanou po jedné.
  pridatSablonu: (knihaId: string, nazvyKapitol: string[]) => void
  // Najde a nahradí zadaný text ve všech kapitolách knihy najednou —
  // vrací počet skutečných záměn, ať UI ví, co se vlastně stalo.
  nahradVKnize: (knihaId: string, hledat: string, nahradit: string) => number
  // Přepíše nazev/cilSlov/kapitoly podle uloženého checkpointu
  // (useWriterCheckpoints.ts) — id/createdAt knihy zůstávají, jen se
  // aktualizuje obsah. Vrací false, pokud checkpoint neprošel
  // sanitizací (poškozená data), true při úspěchu.
  obnovZeCheckpointu: (knihaId: string, snapshot: unknown) => boolean
  // Založí novou knihu jako hlubokou kopii existující (nový vlastní
  // id, "(kopie)" v názvu, kapitoly s vlastními novými id) — žádná XP
  // se nedává, jde o vědomé rozvětvení existujícího díla, ne o novou
  // tvorbu. Vrací id nové knihy, nebo null, když zdrojová kniha
  // neexistuje.
  duplikovatKniha: (id: string) => string | null
}

// Posune položku o jedno místo v poli daným směrem — no-op na kraji
// (žádné zacyklení), sdílené jedním malým helperem, ať se stejná
// swap logika nepíše zvlášť pro kapitoly/scény/strany.
const posunPolozku = <T,>(pole: T[], index: number, smer: 'nahoru' | 'dolu'): T[] => {
  const cil = smer === 'nahoru' ? index - 1 : index + 1
  if (cil < 0 || cil >= pole.length) return pole
  const nove = [...pole]
  ;[nove[index], nove[cil]] = [nove[cil], nove[index]]
  return nove
}

const useBookWriterStore = create<BookWriterState>()(
  persist(
    (set) => ({
      knihy: [],

      addKniha: (nazev) => {
        const id = noveId()
        const ted = new Date().toISOString()
        const nova: Kniha = { id, nazev: nazev.trim() || 'Nová kniha', cilSlov: null, kapitoly: [], createdAt: ted, upravenoAt: ted }
        set((state) => ({ knihy: [nova, ...state.knihy] }))
        return id
      },

      // Živě vázaný vstup jako updateKapitola — bez trimu/fallbacku,
      // stejná volnost jako přejmenování kapitoly už má.
      updateKniha: (id, nazev) =>
        set((state) => ({
          knihy: state.knihy.map((k) => (k.id === id ? { ...k, nazev, upravenoAt: new Date().toISOString() } : k)),
        })),

      deleteKniha: (id) => set((state) => ({ knihy: state.knihy.filter((k) => k.id !== id) })),

      setCilSlov: (knihaId, cil) =>
        set((state) => ({
          knihy: state.knihy.map((k) => (k.id === knihaId ? { ...k, cilSlov: cil, upravenoAt: new Date().toISOString() } : k)),
        })),

      addKapitola: (knihaId, nazev) => {
        const nova = {
          id: noveId(),
          nazev: nazev.trim() || 'Nová kapitola',
          text: '',
          createdAt: new Date().toISOString(),
          stav: 'napad' as StavPolozky,
          poznamka: '',
          stitky: '',
        }
        set((state) => ({
          knihy: state.knihy.map((k) =>
            k.id === knihaId ? { ...k, kapitoly: [...k.kapitoly, nova], upravenoAt: new Date().toISOString() } : k
          ),
        }))
        useGamificationStore.getState().recordAction('book', BOOK_XP)
      },

      updateKapitola: (knihaId, kapitolaId, data) =>
        set((state) => ({
          knihy: state.knihy.map((k) =>
            k.id !== knihaId
              ? k
              : {
                  ...k,
                  kapitoly: k.kapitoly.map((kap) => (kap.id === kapitolaId ? { ...kap, ...data } : kap)),
                  upravenoAt: new Date().toISOString(),
                }
          ),
        })),

      deleteKapitola: (knihaId, kapitolaId) =>
        set((state) => ({
          knihy: state.knihy.map((k) =>
            k.id !== knihaId
              ? k
              : { ...k, kapitoly: k.kapitoly.filter((kap) => kap.id !== kapitolaId), upravenoAt: new Date().toISOString() }
          ),
        })),

      presunKapitolu: (knihaId, kapitolaId, smer) =>
        set((state) => ({
          knihy: state.knihy.map((k) => {
            if (k.id !== knihaId) return k
            const index = k.kapitoly.findIndex((kap) => kap.id === kapitolaId)
            if (index < 0) return k
            return { ...k, kapitoly: posunPolozku(k.kapitoly, index, smer), upravenoAt: new Date().toISOString() }
          }),
        })),

      pridatSablonu: (knihaId, nazvyKapitol) => {
        const ted = new Date().toISOString()
        const nove = nazvyKapitol.map((nazev) => ({
          id: noveId(),
          nazev,
          text: '',
          createdAt: ted,
          stav: 'napad' as StavPolozky,
          poznamka: '',
          stitky: '',
        }))
        set((state) => ({
          knihy: state.knihy.map((k) =>
            k.id === knihaId ? { ...k, kapitoly: [...k.kapitoly, ...nove], upravenoAt: ted } : k
          ),
        }))
        // Odměna za každou skutečně založenou kapitolu, stejně jako by
        // je autor přidal ručně jednu po druhé.
        nove.forEach(() => useGamificationStore.getState().recordAction('book', BOOK_XP))
      },

      nahradVKnize: (knihaId, hledat, nahradit) => {
        let celkemZamen = 0
        set((state) => ({
          knihy: state.knihy.map((k) => {
            if (k.id !== knihaId) return k
            const kapitoly = k.kapitoly.map((kap) => {
              const { text, pocet } = nahradVTextu(kap.text, hledat, nahradit)
              celkemZamen += pocet
              return pocet > 0 ? { ...kap, text } : kap
            })
            return celkemZamen > 0 ? { ...k, kapitoly, upravenoAt: new Date().toISOString() } : k
          }),
        }))
        return celkemZamen
      },

      obnovZeCheckpointu: (knihaId, snapshot) => {
        const sanitizovano = sanitizujKnihu(snapshot)
        if (!sanitizovano) return false
        set((state) => ({
          knihy: state.knihy.map((k) =>
            k.id === knihaId
              ? { ...k, nazev: sanitizovano.nazev, cilSlov: sanitizovano.cilSlov, kapitoly: sanitizovano.kapitoly, upravenoAt: new Date().toISOString() }
              : k
          ),
        }))
        return true
      },

      duplikovatKniha: (id) => {
        let novaId: string | null = null
        set((state) => {
          const original = state.knihy.find((k) => k.id === id)
          if (!original) return state
          const ted = new Date().toISOString()
          novaId = noveId()
          const kopie: Kniha = {
            ...original,
            id: novaId,
            nazev: `${original.nazev} (kopie)`,
            createdAt: ted,
            upravenoAt: ted,
            kapitoly: original.kapitoly.map((k) => ({ ...k, id: noveId() })),
          }
          return { knihy: [kopie, ...state.knihy] }
        })
        return novaId
      },
    }),
    {
      name: 'schoolbuddy-book-writer-storage',
      storage: createJSONStorage(() => secureStorage),
      // merge, ne migrate — stejná zásada jako Music Studio's store:
      // poškozená kniha/kapitola se má zahodit po jedné, ne shodit celý
      // uložený stav.
      merge: (persisted, current) => {
        const validation = validateBookWriterData(persisted)
        if (!validation.success) {
          console.error('Data Knihy v LocalStorage byla poškozena. Obnovuji výchozí stav.')
          return current
        }
        return { ...current, ...validation.data }
      },
    }
  )
)

export const useBookWriter = () => useBookWriterStore()
