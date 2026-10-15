import { UKOLY, overSplneneUkoly, type QuestId } from './quests'
import { obchoduj, vyzvedniProdukci, type ObchodniAkce } from './villageEconomy'
import { StavitelnyTyp, UmistenaStavba, jeVolneMisto, overStavby, presunStavbu, odstranStavbu } from './buildingPlacement'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import {
  VYCHOZI_OSADA, VillageProgress, Surovina, pridejSurovinu, odmenaZaSouboj, overVillageProgress, rozsiritOsadu,
} from './villageProgress'

import { Inventar, PRAZDNY_INVENTAR, RECEPTY, overInventar, vyrobPredmet } from './crafting'

interface VillageStore extends VillageProgress {
  splneneUkoly: QuestId[]
  prevzitOdmenu: (id: QuestId) => boolean
  posledniProdukce: number
  vyzvednoutProdukci: () => number
  obchod: (akce: ObchodniAkce) => void
  inventar: Inventar
  umisteneStavby: UmistenaStavba[]
  presun: (id: string, x: number, z: number) => boolean
  zbourat: (id: string) => void
  postav: (typ: StavitelnyTyp, x: number, z: number) => boolean
  vyrob: (id: keyof Inventar) => void
  zaznamenejVyhru: (boss: boolean) => void
  vylepsiOsadu: () => void
  seberSurovinu: (typ: Surovina) => void
}

export const useVillageStore = create<VillageStore>()(
  persist(
    (set) => ({
      ...VYCHOZI_OSADA,
      splneneUkoly: [],
      prevzitOdmenu: (id) => {
        let prevzato = false
        set(s => {
          const ukol = UKOLY.find(q => q.id === id)
          if (!ukol || s.splneneUkoly.includes(id) || !ukol.hotovo(s)) return s
          prevzato = true
          return {
            splneneUkoly: [...s.splneneUkoly, id],
            drevo: Math.min(1_000_000, s.drevo + ukol.odmena.drevo),
            kamen: Math.min(1_000_000, s.kamen + ukol.odmena.kamen),
            krystaly: Math.min(1_000_000, s.krystaly + ukol.odmena.krystaly),
          }
        })
        return prevzato
      },
      inventar: { ...PRAZDNY_INVENTAR },
      posledniProdukce: Date.now(),
      vyzvednoutProdukci: () => {
        let pocet = 0
        set((s) => {
          const vysledek = vyzvedniProdukci(s, s.posledniProdukce, Date.now())
          pocet = vysledek.cyklu
          return { ...vysledek.stav, posledniProdukce: vysledek.cas }
        })
        return pocet
      },
      obchod: (akce) => set((s) => obchoduj(s, akce)),
      umisteneStavby: [],
      presun: (id, x, z) => {
        let uspesne = false
        set((s) => {
          const dalsi = presunStavbu(s.umisteneStavby, id, x, z)
          if (dalsi.length === s.umisteneStavby.length &&
              dalsi.some((b) => b.id === id && b.x === x && b.z === z)) uspesne = true
          return { umisteneStavby: dalsi }
        })
        return uspesne
      },
      zbourat: (id) => set((s) => {
        const stavba = s.umisteneStavby.find((b) => b.id === id)
        if (!stavba) return s
        return {
          umisteneStavby: odstranStavbu(s.umisteneStavby, id),
          inventar: { ...s.inventar, [stavba.typ]: Math.min(9999, s.inventar[stavba.typ] + 1) },
        }
      }),
      postav: (typ, x, z) => {
        let uspesne = false
        set((s) => {
          if (!jeVolneMisto(s.umisteneStavby, x, z) || s.inventar[typ] < 1) return s
          uspesne = true
          return {
            inventar: { ...s.inventar, [typ]: s.inventar[typ] - 1 },
            umisteneStavby: [...s.umisteneStavby, {
              id: `${Date.now()}-${s.umisteneStavby.length}`, typ, x, z,
            }],
          }
        })
        return uspesne
      },
      vyrob: (id) => set((s) => {
        const recept = RECEPTY.find((r) => r.id === id)
        return recept ? vyrobPredmet(s, recept) : s
      }),
      zaznamenejVyhru: (boss) => set((s) => odmenaZaSouboj(s, boss)),
      vylepsiOsadu: () => set((s) => rozsiritOsadu(s)),
      seberSurovinu: (typ) => set((s) => pridejSurovinu(s, typ)),
    }),
    {
      name: 'schoolbuddy-buddyworld-village-v1',
      storage: createJSONStorage(() => secureStorage),
      partialize: (s) => ({
        uroven: s.uroven, drevo: s.drevo, kamen: s.kamen, krystaly: s.krystaly,
        porazeniNepratele: s.porazeniNepratele, porazeniBossove: s.porazeniBossove,
        inventar: s.inventar,
        posledniProdukce: s.posledniProdukce,
        umisteneStavby: s.umisteneStavby,
        splneneUkoly: s.splneneUkoly,
      }),
      merge: (saved, current) => ({
        ...current, ...overVillageProgress(saved),
        posledniProdukce: typeof (saved as { posledniProdukce?: unknown } | null)?.posledniProdukce === 'number'
          && Number.isFinite((saved as { posledniProdukce: number }).posledniProdukce)
          && (saved as { posledniProdukce: number }).posledniProdukce > 0
          && (saved as { posledniProdukce: number }).posledniProdukce <= Date.now()
          ? (saved as { posledniProdukce: number }).posledniProdukce : Date.now(),
        inventar: overInventar((saved as { inventar?: unknown } | null)?.inventar),
        umisteneStavby: overStavby((saved as { umisteneStavby?: unknown } | null)?.umisteneStavby),
        splneneUkoly: overSplneneUkoly((saved as { splneneUkoly?: unknown } | null)?.splneneUkoly),
      }),
    }
  )
)
