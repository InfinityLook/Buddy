import { useMemo } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateRozvrhData } from '@/core/utils/rozvrhValidation'
import { DenVTydnu, DochazkaZaznam, HodinaRozvrhu, dochazkaJakoRecord, klicDochazky, serazenoPodleCasu } from './types'

const XP_ZA_HODINU = 5

interface RozvrhState {
  hodiny: HodinaRozvrhu[]
  dochazkaZaznamy: DochazkaZaznam[]
  pridatHodinu: (
    den: DenVTydnu,
    casOd: string,
    casDo: string,
    predmet: string,
    mistnost: string,
    vyucujici: string
  ) => void
  updateHodinu: (id: string, patch: Partial<Omit<HodinaRozvrhu, 'id'>>) => void
  smazatHodinu: (id: string) => void
  /** null smaže záznam docházky (návrat na "nezaznamenáno"). */
  oznacitDochazku: (hodinaId: string, datum: string, byl: boolean | null) => void
}

// Exportovaný přímo (ne jen skrz useRozvrh() níž) — rozvrhReminders.ts
// potřebuje .getState() mimo React, stejný důvod, proč useFormCheckStore/
// useWriterCheckpoints jsou taky exportované napřímo. Ze stejného důvodu
// ho teď volá i skolaSync.ts (cloudová synchronizace) — .getState()/
// .setState()/.subscribe() mu k tomu úplně stačí, žádná další
// getRaw*State/setRaw*State trojice navíc není potřeba.
export const useRozvrhStore = create<RozvrhState>()(
  persist(
    (set) => ({
      hodiny: [],
      dochazkaZaznamy: [],

      pridatHodinu: (den, casOd, casDo, predmet, mistnost, vyucujici) => {
        if (!predmet.trim()) return

        const ted = Date.now()
        const nova: HodinaRozvrhu = {
          id: `${ted}-${Math.random().toString(36).slice(2, 7)}`,
          den,
          casOd,
          casDo,
          predmet: predmet.trim(),
          mistnost: mistnost.trim(),
          vyucujici: vyucujici.trim(),
          createdAt: new Date(ted).toISOString(),
          updatedAt: ted,
          deletedAt: null,
        }

        set((state) => ({ hodiny: [...state.hodiny, nova] }))
        useGamificationStore.getState().recordAction('rozvrh', XP_ZA_HODINU)
      },

      updateHodinu: (id, patch) => {
        // Stejný ořez jako pridatHodinu výš — bez něj šlo úpravou
        // hodiny (na rozdíl od jejího založení) propašovat do
        // předmětu/místnosti/vyučujícího nadbytečné mezery na začátku
        // nebo konci, protože updateHodinu patch dřív jen slepě
        // sloučilo se stávající hodinou.
        const orezanyPatch = { ...patch }
        if (orezanyPatch.predmet !== undefined) orezanyPatch.predmet = orezanyPatch.predmet.trim()
        if (orezanyPatch.mistnost !== undefined) orezanyPatch.mistnost = orezanyPatch.mistnost.trim()
        if (orezanyPatch.vyucujici !== undefined) orezanyPatch.vyucujici = orezanyPatch.vyucujici.trim()

        set((state) => ({
          hodiny: state.hodiny.map((h) => (h.id === id ? { ...h, ...orezanyPatch, updatedAt: Date.now() } : h)),
        }))
      },

      smazatHodinu: (id) =>
        set((state) => {
          const ted = Date.now()
          // Smazaná hodina strhne s sebou i svoje záznamy docházky —
          // měkce, stejný tombstone jako u hodiny samotné, ne fyzické
          // odstranění (viz DochazkaZaznam.deletedAt v types.ts).
          const dochazkaZaznamy = state.dochazkaZaznamy.map((z) =>
            z.hodinaId === id && !z.deletedAt ? { ...z, deletedAt: ted, updatedAt: ted } : z
          )
          const hodiny = state.hodiny.map((h) => (h.id === id ? { ...h, deletedAt: ted, updatedAt: ted } : h))
          return { hodiny, dochazkaZaznamy }
        }),

      oznacitDochazku: (hodinaId, datum, byl) =>
        set((state) => {
          const ted = Date.now()
          const klic = klicDochazky(hodinaId, datum)
          const existujici = state.dochazkaZaznamy.find((z) => z.id === klic)

          if (byl === null) {
            // Zpět na "nezaznamenáno" — měkké smazání, ne fyzické
            // odstranění, ať appka umí zrcadlit i tohle "odznačení" na
            // druhé zařízení.
            if (!existujici || existujici.deletedAt) return {}
            return {
              dochazkaZaznamy: state.dochazkaZaznamy.map((z) =>
                z.id === klic ? { ...z, deletedAt: ted, updatedAt: ted } : z
              ),
            }
          }

          if (existujici) {
            return {
              dochazkaZaznamy: state.dochazkaZaznamy.map((z) =>
                z.id === klic ? { ...z, byl, deletedAt: null, updatedAt: ted } : z
              ),
            }
          }

          const novy: DochazkaZaznam = {
            id: klic,
            hodinaId,
            datum,
            byl,
            createdAt: new Date(ted).toISOString(),
            updatedAt: ted,
            deletedAt: null,
          }
          return { dochazkaZaznamy: [...state.dochazkaZaznamy, novy] }
        }),
    }),
    {
      name: 'schoolbuddy-rozvrh-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateRozvrhData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)

export const useRozvrh = () => {
  const { hodiny, dochazkaZaznamy, pridatHodinu, updateHodinu, smazatHodinu, oznacitDochazku } = useRozvrhStore()

  // Smazané hodiny appka drží v úložišti dál (viz HodinaRozvrhu.deletedAt)
  // jen kvůli synchronizaci mezi zařízeními — kdokoli appku volá jako
  // dřív je nikdy nesmí vidět, stejná zásada jako Writer's Roomovy/Goal
  // Trackerovy filtrované hooky.
  const viditelneHodiny = useMemo(() => hodiny.filter((h) => !h.deletedAt), [hodiny])
  const dochazka = useMemo(() => dochazkaJakoRecord(dochazkaZaznamy), [dochazkaZaznamy])

  return {
    hodiny: serazenoPodleCasu(viditelneHodiny),
    dochazka,
    pridatHodinu,
    updateHodinu,
    smazatHodinu,
    oznacitDochazku,
  }
}
