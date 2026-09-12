import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateSurvivalData } from '@/core/utils/survivalValidation'
import { ZBRANE } from '@/survival/data/weapons'

// ==========================================
// Survival Night's TRVALÝ postup — Gold/Crystal, odemčené zbraně/
// postavy, nejvyšší dosažená vlna, statistiky. Vlastní malý store,
// stejná appčina zásada jako u každé jiné miniaplikace/hry
// (useFormCheckStore, useGameCharacter, ...) — sekce 24 zadání
// ("nezaváděj novou databázi") mluví o novém BACKENDU (Supabase
// tabulce), ne o novém lokálním storu; appka žádnou novou tabulku
// nezavádí, jen sekurStorage jako všude jinde.
//
// Co se SEM nedává, schválně: kolikrát hráč něco zabil / poražených
// bossů "obecně" — appka to čte přímo z useGamificationStore's
// counters (sdílené počítadlo přes recordAction('survival_kill', ...)/
// recordAction('boss', ...)), ne z druhé, paralelní kopie — přesně
// bod 23 zadání ("nepřidávej druhý paralelní systém").
//
// restorable: false (viz core/utils/backup.ts's BACKUP_STORES) ze
// stejného důvodu jako gamification-storage — Gold/Crystal/odemčené
// věci/nejvyšší vlna jsou vydřený postup, obnova ze starší zálohy ho
// nesmí vrátit zpátky.
// ==========================================

interface SurvivalState {
  gold: number
  krystal: number
  nejvyssiVlna: number
  celkemBehu: number
  nejlepsiSkore: number
  bossPorazenoCelkem: number
  celkemPrezitySekund: number
  odemceneZbrane: string[]
  odemcenePostavy: string[]
  /** Bod 10 zadání (appčino "co dál tam chybí" bod 4) — kterou z
   *  odemčených zbraní hráč vybral pro příští běh. Vždy musí být
   *  v `odemceneZbrane` (viz vybratZbran níž — funkce si to sama
   *  hlídá, appka ji nevěří ani vlastnímu UI o nic víc, než engine
   *  věří appce jinde v týhle hře). */
  vybranaZbran: string

  /** Zavolat po skončení běhu — připočte Gold/Crystal, zaktualizuje
   *  nejvyšší vlnu/skóre/počty. Vrací true, pokud šlo o nový rekord. */
  zapocitatBeh: (vysledek: {
    vlnaDosazena: number
    gold: number
    krystal: number
    skore: number
    bossPorazeno: number
    prezitySekund: number
  }) => boolean

  /** Trvale odemkne zbraň za Gold — no-op (vrátí false), pokud hráč
   *  nemá dost, nebo je zbraň už odemčená (appka nechce dvakrát strhnout
   *  cenu za totéž, stejná "opakovaný požadavek je no-op, ne chyba"
   *  shovívavost jako jinde v appce). */
  odemknoutZbran: (zbranId: string) => boolean
  /** Vybere zbraň pro příští běh — no-op, pokud zbraň není odemčená. */
  vybratZbran: (zbranId: string) => void
}

const VYCHOZI = {
  gold: 0,
  krystal: 0,
  nejvyssiVlna: 0,
  celkemBehu: 0,
  nejlepsiSkore: 0,
  bossPorazenoCelkem: 0,
  celkemPrezitySekund: 0,
  odemceneZbrane: ['iron_sword'],
  odemcenePostavy: ['ranger'],
  vybranaZbran: 'iron_sword',
}

export const useSurvivalStore = create<SurvivalState>()(
  persist(
    (set, get) => ({
      ...VYCHOZI,

      zapocitatBeh: (vysledek) => {
        const jeRekord = vysledek.skore > get().nejlepsiSkore
        set((state) => ({
          gold: state.gold + vysledek.gold,
          krystal: state.krystal + vysledek.krystal,
          nejvyssiVlna: Math.max(state.nejvyssiVlna, vysledek.vlnaDosazena),
          celkemBehu: state.celkemBehu + 1,
          nejlepsiSkore: Math.max(state.nejlepsiSkore, vysledek.skore),
          bossPorazenoCelkem: state.bossPorazenoCelkem + vysledek.bossPorazeno,
          celkemPrezitySekund: state.celkemPrezitySekund + vysledek.prezitySekund,
        }))
        return jeRekord
      },

      odemknoutZbran: (zbranId) => {
        const stav = get()
        if (stav.odemceneZbrane.includes(zbranId)) return false
        const zbran = ZBRANE.find((z) => z.id === zbranId)
        if (!zbran?.odemkovaciCena || stav.gold < zbran.odemkovaciCena) return false
        set((state) => ({
          gold: state.gold - zbran.odemkovaciCena!,
          odemceneZbrane: [...state.odemceneZbrane, zbranId],
        }))
        return true
      },

      vybratZbran: (zbranId) => {
        if (!get().odemceneZbrane.includes(zbranId)) return
        set({ vybranaZbran: zbranId })
      },
    }),
    {
      name: 'schoolbuddy-survival-storage',
      version: 1,
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validation = validateSurvivalData(persisted)
        if (!validation.success) return current
        return { ...current, ...validation.data }
      },

      migrate: (persistedState, _version) => {
        const validation = validateSurvivalData(persistedState)
        return validation.success ? { ...VYCHOZI, ...validation.data } : VYCHOZI
      },
    }
  )
)
