import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateWriterCheckpointsData } from '@/core/utils/writerCheckpointsValidation'

// ==========================================
// Ruční záložní verze (checkpointy) celého díla — Kniha/Scénář/Komiks
// sdílejí jeden malý store, protože jde o identickou funkci ("ulož mi
// snímek téhle knihy/scénáře/komiksu, ať se k němu můžu vrátit před
// velkou úpravou"), ne o tři nezávislé mechanismy. Schválně to NENÍ to
// samé jako appkina "Zálohy v aplikaci" (backupHistory.ts) — ta dělá
// snímek úplně celé appky (localStorage snapshot) automaticky/ručně
// jako záchrannou síť proti nechtěnému smazání dat; tohle je autorova
// vlastní, pojmenovaná verze JEDNOHO konkrétního díla, kterou zakládá
// vědomě, ne appka za něj.
//
// Žádná plná historie verzí — jen posledních MAX_CHECKPOINTU_NA_DILO
// pojmenovaných snímků na jedno dílo, stejné vědomé omezení jako u
// smazání zprávy/story (appka neřeší "nekonečná historie", jen "malá
// bezpečnostní síť před velkou úpravou").
// ==========================================

export type DruhDila = 'kniha' | 'scenar' | 'komiks'

export interface WriterCheckpoint {
  id: string
  druh: DruhDila
  dilaId: string
  nazev: string
  createdAt: string
  // Plný snímek díla v okamžiku uložení (Kniha/Scenar/Komiks objekt) —
  // typované jako unknown, protože store je společný pro tři různé
  // appky a typ se rozliší až podle `druh` při obnově.
  data: unknown
}

export const MAX_CHECKPOINTU_NA_DILO = 5

interface WriterCheckpointsState {
  checkpointy: WriterCheckpoint[]
  vytvorCheckpoint: (druh: DruhDila, dilaId: string, nazev: string, data: unknown) => void
  smazCheckpoint: (id: string) => void
}

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

// Store samotný je exportovaný přímo (ne přes wrapper hook), stejná
// zásada jako useGamificationStore/useQuestStore — jednoduché akce bez
// odvozeného stavu si žádný wrapper nezaslouží, a přímý export navíc
// umožňuje testovat store's akce přímo přes getState()/setState(), bez
// komponenty (viz tests/unit/writer-checkpoints.test.ts).
export const useWriterCheckpoints = create<WriterCheckpointsState>()(
  persist(
    (set) => ({
      checkpointy: [],

      vytvorCheckpoint: (druh, dilaId, nazev, data) =>
        set((state) => {
          const jine = state.checkpointy.filter((c) => !(c.druh === druh && c.dilaId === dilaId))
          const tehoDila = state.checkpointy.filter((c) => c.druh === druh && c.dilaId === dilaId)
          const novy: WriterCheckpoint = {
            id: noveId(),
            druh,
            dilaId,
            nazev: nazev.trim() || 'Záloha',
            createdAt: new Date().toISOString(),
            data,
          }
          // Nejstarší checkpoint téhož díla zahodíme první, ať se strop
          // drží i po přidání nového — .slice(-N) na poli seřazeném podle
          // vzniku (appka je vždycky přidává na konec) nechá právě
          // posledních N položek.
          const zbyle = [...tehoDila, novy].slice(-MAX_CHECKPOINTU_NA_DILO)
          return { checkpointy: [...jine, ...zbyle] }
        }),

      smazCheckpoint: (id) => set((state) => ({ checkpointy: state.checkpointy.filter((c) => c.id !== id) })),
    }),
    {
      name: 'schoolbuddy-writer-checkpoints-storage',
      storage: createJSONStorage(() => secureStorage),
      merge: (persisted, current) => {
        const validation = validateWriterCheckpointsData(persisted)
        if (!validation.success) {
          console.error('Data ručních záloh Writer\'s Roomu byla poškozena. Obnovuji výchozí stav.')
          return current
        }
        return { ...current, ...validation.data }
      },
    }
  )
)

// Čistá funkce, ne metoda store — stejná lekce, jakou si tenhle projekt
// už jednou vysloužil u useQuestStore's stavQuestu/jeCilSplneny: metoda
// definovaná uvnitř create() by zůstala napořád stejnou referencí a
// komponenta by se po přidání/smazání checkpointu vůbec nepřekreslila.
export const checkpointyProDilo = (vsechny: WriterCheckpoint[], druh: DruhDila, dilaId: string): WriterCheckpoint[] =>
  vsechny.filter((c) => c.druh === druh && c.dilaId === dilaId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
