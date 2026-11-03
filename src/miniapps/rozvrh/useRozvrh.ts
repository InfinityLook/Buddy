import { useMemo } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateRozvrhData } from '@/core/utils/rozvrhValidation'
import {
  DenVTydnu,
  DochazkaZaznam,
  HodinaRozvrhu,
  Prazdniny,
  Presun,
  Semestr,
  TydenCyklus,
  ZrusenaHodina,
  dochazkaJakoRecord,
  klicDochazky,
  serazenoPodleCasu,
} from './types'

const XP_ZA_HODINU = 5

const novyId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

interface RozvrhState {
  hodiny: HodinaRozvrhu[]
  dochazkaZaznamy: DochazkaZaznam[]
  prazdniny: Prazdniny[]
  zruseneHodiny: ZrusenaHodina[]
  presuny: Presun[]
  semestry: Semestr[]
  pridatHodinu: (
    den: DenVTydnu,
    casOd: string,
    casDo: string,
    predmet: string,
    mistnost: string,
    vyucujici: string,
    tyden?: TydenCyklus
  ) => void
  updateHodinu: (id: string, patch: Partial<Omit<HodinaRozvrhu, 'id'>>) => void
  smazatHodinu: (id: string) => void
  /** null smaže záznam docházky (návrat na "nezaznamenáno"). */
  oznacitDochazku: (hodinaId: string, datum: string, byl: boolean | null) => void
  pridatPrazdniny: (nazev: string, datumOd: string, datumDo: string) => void
  smazatPrazdniny: (id: string) => void
  /** Jednorázové zrušení/obnovení KONKRÉTNÍHO výskytu (ne šablony) —
   *  cancelled den zároveň měkce smaže i jakoukoli už zapsanou
   *  docházku pro tenhle výskyt, ať zrušená hodina nikdy nezůstane
   *  počítaná jako zameškaná ani zpětně. */
  zrusitVyskyt: (hodinaId: string, datum: string) => void
  obnovitVyskyt: (hodinaId: string, datum: string) => void
  presunoutVyskyt: (
    hodinaId: string,
    puvodniDatum: string,
    novyDatum: string,
    novyCasOd: string,
    novyCasDo: string
  ) => void
  zrusitPresun: (presunId: string) => void
  /** Vezme zmrzlý snímek aktuálních (viditelných) hodin do archivu a —
   *  když vycistitRozvrh je true — zároveň měkce smaže živé hodiny, ať
   *  appka může začít nový semestr s čistým rozvrhem. */
  archivovatSemestr: (nazev: string, datumOd: string, datumDo: string, vycistitRozvrh: boolean) => void
  smazatSemestr: (id: string) => void
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
      prazdniny: [],
      zruseneHodiny: [],
      presuny: [],
      semestry: [],

      pridatHodinu: (den, casOd, casDo, predmet, mistnost, vyucujici, tyden = 'kazdy') => {
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
          tyden,
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

      pridatPrazdniny: (nazev, datumOd, datumDo) => {
        if (!nazev.trim() || !datumOd || !datumDo || datumOd > datumDo) return
        const ted = Date.now()
        const nove: Prazdniny = {
          id: novyId(),
          nazev: nazev.trim(),
          datumOd,
          datumDo,
          createdAt: new Date(ted).toISOString(),
          updatedAt: ted,
          deletedAt: null,
        }
        set((state) => ({ prazdniny: [...state.prazdniny, nove] }))
      },

      smazatPrazdniny: (id) =>
        set((state) => {
          const ted = Date.now()
          return {
            prazdniny: state.prazdniny.map((p) => (p.id === id ? { ...p, deletedAt: ted, updatedAt: ted } : p)),
          }
        }),

      zrusitVyskyt: (hodinaId, datum) =>
        set((state) => {
          const ted = Date.now()
          const jizExistuje = state.zruseneHodiny.some(
            (z) => !z.deletedAt && z.hodinaId === hodinaId && z.datum === datum
          )
          const zruseneHodiny = jizExistuje
            ? state.zruseneHodiny
            : [
                ...state.zruseneHodiny,
                {
                  id: novyId(),
                  hodinaId,
                  datum,
                  createdAt: new Date(ted).toISOString(),
                  updatedAt: ted,
                  deletedAt: null,
                },
              ]
          // Zrušení dnem napoprvé napočítanou docházku pro TENHLE
          // konkrétní výskyt zase odznačí — bez tohohle by hodina
          // zrušená AŽ PO zapsání "byl jsem"/"nebyl jsem" zůstala
          // navždy počítaná do procent, i když se podle rozvrhu dál
          // nenabízí vůbec.
          const klic = klicDochazky(hodinaId, datum)
          const dochazkaZaznamy = state.dochazkaZaznamy.map((z) =>
            z.id === klic && !z.deletedAt ? { ...z, deletedAt: ted, updatedAt: ted } : z
          )
          return { zruseneHodiny, dochazkaZaznamy }
        }),

      obnovitVyskyt: (hodinaId, datum) =>
        set((state) => {
          const ted = Date.now()
          return {
            zruseneHodiny: state.zruseneHodiny.map((z) =>
              z.hodinaId === hodinaId && z.datum === datum && !z.deletedAt
                ? { ...z, deletedAt: ted, updatedAt: ted }
                : z
            ),
          }
        }),

      presunoutVyskyt: (hodinaId, puvodniDatum, novyDatum, novyCasOd, novyCasDo) => {
        if (!novyDatum || !novyCasOd || !novyCasDo) return
        const ted = Date.now()
        const novy: Presun = {
          id: novyId(),
          hodinaId,
          puvodniDatum,
          novyDatum,
          novyCasOd,
          novyCasDo,
          createdAt: new Date(ted).toISOString(),
          updatedAt: ted,
          deletedAt: null,
        }
        set((state) => ({ presuny: [...state.presuny, novy] }))
      },

      zrusitPresun: (presunId) =>
        set((state) => {
          const ted = Date.now()
          return {
            presuny: state.presuny.map((p) => (p.id === presunId ? { ...p, deletedAt: ted, updatedAt: ted } : p)),
          }
        }),

      archivovatSemestr: (nazev, datumOd, datumDo, vycistitRozvrh) => {
        if (!nazev.trim() || !datumOd || !datumDo) return
        const ted = Date.now()
        set((state) => {
          const viditelneHodiny = state.hodiny.filter((h) => !h.deletedAt)
          const novy: Semestr = {
            id: novyId(),
            nazev: nazev.trim(),
            datumOd,
            datumDo,
            // Zmrzlý snímek — hluboká kopie s NOVÝMI id, ať případná
            // pozdější úprava/smazání živé hodiny nikdy nezasáhne do
            // archivu (ten je od tohohle okamžiku úplně samostatný).
            hodiny: viditelneHodiny.map((h) => ({ ...h, id: `archiv-${novyId()}` })),
            createdAt: new Date(ted).toISOString(),
            updatedAt: ted,
            deletedAt: null,
          }
          if (!vycistitRozvrh) return { semestry: [...state.semestry, novy] }
          return {
            semestry: [...state.semestry, novy],
            hodiny: state.hodiny.map((h) => (h.deletedAt ? h : { ...h, deletedAt: ted, updatedAt: ted })),
          }
        })
      },

      smazatSemestr: (id) =>
        set((state) => {
          const ted = Date.now()
          return {
            semestry: state.semestry.map((s) => (s.id === id ? { ...s, deletedAt: ted, updatedAt: ted } : s)),
          }
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
  const {
    hodiny,
    dochazkaZaznamy,
    prazdniny,
    zruseneHodiny,
    presuny,
    semestry,
    pridatHodinu,
    updateHodinu,
    smazatHodinu,
    oznacitDochazku,
    pridatPrazdniny,
    smazatPrazdniny,
    zrusitVyskyt,
    obnovitVyskyt,
    presunoutVyskyt,
    zrusitPresun,
    archivovatSemestr,
    smazatSemestr,
  } = useRozvrhStore()

  // Smazané hodiny appka drží v úložišti dál (viz HodinaRozvrhu.deletedAt)
  // jen kvůli synchronizaci mezi zařízeními — kdokoli appku volá jako
  // dřív je nikdy nesmí vidět, stejná zásada jako Writer's Roomovy/Goal
  // Trackerovy filtrované hooky. Stejně tak appka nikdy neukáže smazanou
  // prázdninu/zrušení/přesun/semestr — jen jejich viditelnou podmnožinu.
  const viditelneHodiny = useMemo(() => hodiny.filter((h) => !h.deletedAt), [hodiny])
  const dochazka = useMemo(() => dochazkaJakoRecord(dochazkaZaznamy), [dochazkaZaznamy])
  const viditelnePrazdniny = useMemo(() => prazdniny.filter((p) => !p.deletedAt), [prazdniny])
  const viditelneZruseni = useMemo(() => zruseneHodiny.filter((z) => !z.deletedAt), [zruseneHodiny])
  const viditelnePresuny = useMemo(() => presuny.filter((p) => !p.deletedAt), [presuny])
  const viditelneSemestry = useMemo(() => semestry.filter((s) => !s.deletedAt), [semestry])

  return {
    hodiny: serazenoPodleCasu(viditelneHodiny),
    dochazka,
    prazdniny: viditelnePrazdniny,
    zruseneHodiny: viditelneZruseni,
    presuny: viditelnePresuny,
    semestry: viditelneSemestry,
    pridatHodinu,
    updateHodinu,
    smazatHodinu,
    oznacitDochazku,
    pridatPrazdniny,
    smazatPrazdniny,
    zrusitVyskyt,
    obnovitVyskyt,
    presunoutVyskyt,
    zrusitPresun,
    archivovatSemestr,
    smazatSemestr,
  }
}
