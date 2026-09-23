import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateSpanekHodiny, validateSpanekCil } from '@/core/utils/spanekValidation'

// ==========================================
// Deník spánku — appka nemá senzor spánku nikde v kódu (na rozdíl od
// Kalorií/Tréninku, co appka odvozuje z Form Checkových sezení), takže
// jde o čistě RUČNÍ záznam, stejný duch jako Jídelníček/Pitný režim
// vedle. Nahrazuje dřívější natvrdo dané "Spánek: Zatím nesledujeme"
// v FitnessRoomModule.tsx's Moje přehled/Dnešní cíl reálným, byť ručně
// zadaným číslem — appka pořád nic sama nevymýšlí, jen teď má odkud
// číst, když uživatel sám zapíše.
//
// hodiny je klíčované datem ('YYYY-MM-DD', stejná zone-less opatrnost
// jako Kalendář/Planer/Pitný režim jinde v appce) — appku tu zajímá jen
// "kolik hodin tu noc", ne rostoucí historie jednotlivých záznamů jako
// u tělesných měr. cilHod žije ve stejném storu jako hodiny, stejný
// "data + jejich vlastní cíl, jeden store" tvar jako usePitnyRezim.ts.
//
// Appka za zápis spánku záměrně neuděluje XP — stejná zásada jako u
// jídelníčku/pitného režimu/tělesných měr: osobní záznam dat, ne
// cvičební výkon, a navíc mírně opakovatelný zápis (přepsání stejného
// dne), co by jinak šlo zneužít k XP farmení.
// ==========================================

interface SpanekState {
  hodiny: Record<string, number>
  cilHod: number | null
  /** null smaže záznam pro daný den — appka nemá zvlášť "smazat" akci,
   *  přepsání na null má stejný efekt. */
  setHodinySpanku: (datum: string, hodiny: number | null) => void
  setCilHod: (hod: number | null) => void
}

export const useSpanek = create<SpanekState>()(
  persist(
    (set) => ({
      hodiny: {},
      cilHod: null,

      setHodinySpanku: (datum, hodiny) =>
        set((state) => {
          if (hodiny === null || hodiny <= 0) {
            const zbyle = { ...state.hodiny }
            delete zbyle[datum]
            return { hodiny: zbyle }
          }
          return { hodiny: { ...state.hodiny, [datum]: hodiny } }
        }),

      setCilHod: (hod) => set({ cilHod: hod !== null && hod > 0 ? hod : null }),
    }),
    {
      name: 'schoolbuddy-spanek-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const saved = persisted as Partial<SpanekState> | undefined
        const validace = validateSpanekHodiny(saved?.hodiny)
        return {
          ...current,
          hodiny: validace.success ? validace.data : current.hodiny,
          cilHod: 'cilHod' in (saved ?? {}) ? validateSpanekCil(saved?.cilHod) : current.cilHod,
        }
      },
    }
  )
)
