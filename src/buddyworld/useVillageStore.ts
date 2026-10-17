import { FUNKCNI_BUDOVY, muzePostavitFunkcni, overFunkcniBudovy, type FunkcniBudovaId } from './funkcniBudovy'
import { MIRA_STAVBA_ODMENA, fazeMiraStavby, overMiraStavba, type MiraStavba } from './miraStavba'
import { KAEL_VYCVIK_ODMENA, overKaelTraining, stavVycvikuV2, type KaelTrainingProgress } from './kaelTrainingV2'
import { ODMENA_STRAZCE, overPorazenehoStrazce } from './data/chramovyBoss'
import { ODMENA_PODZEMI, lzeAktivovatRunu, lzeDokoncitPodzemi, overRuny, overDokoncenePodzemi, type ChramovaRunaId } from './data/chramovePodzemi'
import { CHRAM_ODMENA, lzeProzkoumatChram, overDokoncenyChram } from './data/chramStrazcu'
import type { Pozice2D } from './types'
import { TRI_PECETE_ID, TRI_PECETE_ODMENA, lzeProbuditStrazce, overUdalostiPeceti } from './data/triPecete'
import { NPC_VYPRAVY, stavVypravy, overSplneneVypravy } from './npcVypravy'
import { lzeZaznamenatUdalost, overZaznamenaneUdalosti } from './npcUdalosti'
import { lzeVyzvednoutOdmenuVztahu, overPrevzateOdmenyVztahu, ODMENA_VZTAHU } from './npcVztahy'
import { VEDLEJSI_UKOLY, lzePrevzitVedlejsiOdmenu, overSplneneVedlejsiUkoly, type VedlejsiUkolId } from './sideQuests'
import { ODMENY_ZA_OBJEVENTI, overObjeveneOblasti, type IdOblasti } from './data/objevovani'
import { RELIKVIE, lzeAktivovatRelikvii, overAktivovaneRelikvie } from './data/relikvie'
import { POKLADY, lzeOtevritPoklad, overOtevrenePoklady } from './data/poklady'
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
  funkcniBudovy: FunkcniBudovaId[]
  postavFunkcniBudovu: (id: FunkcniBudovaId) => boolean
  miraStavba: MiraStavba
  zahajMiraStavbu: () => boolean
  prevzitMiraStavbu: () => boolean
  kaelTraining: KaelTrainingProgress
  zahajKaelTraining: () => boolean
  prevzitKaelTraining: () => boolean
  porazenChramovyStrazce: boolean
  odmenChramovehoStrazce: () => boolean
  splneneNpcVypravy: string[]
  dokonciNpcVypravu: (id: string) => boolean
  zaznamenaneNpcUdalosti: string[]
  zaznamenejNpcUdalost: (id: string) => boolean
  prevzateOdmenyVztahu: string[]
  vyzvedniOdmenuVztahu: (id: string) => boolean
  objeveneOblasti: IdOblasti[]
  objevOblast: (id: IdOblasti) => boolean
  aktivovaneChramoveRuny: ChramovaRunaId[]
  aktivujChramovouRunu: (id: ChramovaRunaId, pozice: Pozice2D) => boolean
  dokoncenePodzemi: boolean
  dokonciPodzemi: (pozice: Pozice2D) => boolean
  dokoncenyChram: boolean
  prozkoumejChram: (pozice: Pozice2D) => boolean
  udalostiPeceti: string[]
  probudStrazce: () => boolean
  aktivovaneRelikvie: string[]
  aktivujRelikvii: (id: string) => boolean
  otevrenePoklady: string[]
  otevriPoklad: (id: string) => boolean
  splneneVedlejsiUkoly: VedlejsiUkolId[]
  prevzitVedlejsiOdmenu: (id: VedlejsiUkolId) => boolean
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
      funkcniBudovy: [],
      postavFunkcniBudovu: (id) => {
        let ok = false
        set(s => {
          if (!muzePostavitFunkcni(s, s.funkcniBudovy, id)) return s
          const b = FUNKCNI_BUDOVY.find(x => x.id === id)!
          ok = true
          return { funkcniBudovy: [...s.funkcniBudovy, id], drevo: s.drevo - b.drevo, kamen: s.kamen - b.kamen, krystaly: s.krystaly - b.krystaly }
        })
        return ok
      },
      kaelTraining: { zacatek: null, prevzato: false },
      miraStavba: { zacatek: null, prevzato: false },
      zahajMiraStavbu: () => {
        let ok = false
        set(s => {
          if (s.miraStavba.zacatek !== null) return s
          ok = true
          return { miraStavba: { zacatek: s.umisteneStavby.length, prevzato: false } }
        })
        return ok
      },
      prevzitMiraStavbu: () => {
        let ok = false
        set(s => {
          if (fazeMiraStavby(s.miraStavba, s.umisteneStavby.length) !== 'pripraveno') return s
          ok = true
          return {
            miraStavba: { ...s.miraStavba, prevzato: true },
            drevo: Math.min(1_000_000, s.drevo + MIRA_STAVBA_ODMENA.drevo),
            kamen: Math.min(1_000_000, s.kamen + MIRA_STAVBA_ODMENA.kamen),
            krystaly: Math.min(1_000_000, s.krystaly + MIRA_STAVBA_ODMENA.krystaly),
          }
        })
        return ok
      },
      zahajKaelTraining: () => {
        let ok = false
        set(s => {
          if (s.kaelTraining.zacatek !== null) return s
          ok = true
          return { kaelTraining: { zacatek: s.porazeniNepratele, prevzato: false } }
        })
        return ok
      },
      prevzitKaelTraining: () => {
        let ok = false
        set(s => {
          if (stavVycvikuV2(s.kaelTraining, s.porazeniNepratele) !== 'pripraveno') return s
          ok = true
          return {
            kaelTraining: { ...s.kaelTraining, prevzato: true },
            drevo: Math.min(1_000_000, s.drevo + KAEL_VYCVIK_ODMENA.drevo),
            kamen: Math.min(1_000_000, s.kamen + KAEL_VYCVIK_ODMENA.kamen),
            krystaly: Math.min(1_000_000, s.krystaly + KAEL_VYCVIK_ODMENA.krystaly),
          }
        })
        return ok
      },
      splneneNpcVypravy: [],
      dokonciNpcVypravu: (id) => {
        let uspesne = false
        set(s => {
          if (stavVypravy(id, s.zaznamenaneNpcUdalosti, s.objeveneOblasti, s.splneneNpcVypravy, s) !== 'pripraveno') return s
          const vyprava = NPC_VYPRAVY.find(v => v.id === id)
          if (!vyprava) return s
          uspesne = true
          return {
            splneneNpcVypravy: [...s.splneneNpcVypravy, id],
            drevo: Math.min(1_000_000, s.drevo + vyprava.odmena.drevo),
            kamen: Math.min(1_000_000, s.kamen + vyprava.odmena.kamen),
            krystaly: Math.min(1_000_000, s.krystaly + vyprava.odmena.krystaly),
          }
        })
        return uspesne
      },
      zaznamenaneNpcUdalosti: [],
      zaznamenejNpcUdalost: (id) => {
        let uspesne = false
        set(stav => {
          if (!lzeZaznamenatUdalost(id, stav.splneneVedlejsiUkoly, stav.zaznamenaneNpcUdalosti)) return stav
          uspesne = true
          return { zaznamenaneNpcUdalosti: [...stav.zaznamenaneNpcUdalosti, id] }
        })
        return uspesne
      },
      prevzateOdmenyVztahu: [],
      vyzvedniOdmenuVztahu: (id) => {
        let uspesne = false
        set(stav => {
          if (!lzeVyzvednoutOdmenuVztahu(id, stav.splneneVedlejsiUkoly, stav.prevzateOdmenyVztahu)) return stav
          uspesne = true
          return {
            prevzateOdmenyVztahu: [...stav.prevzateOdmenyVztahu, id],
            drevo: Math.min(1_000_000, stav.drevo + ODMENA_VZTAHU.drevo),
            kamen: Math.min(1_000_000, stav.kamen + ODMENA_VZTAHU.kamen),
            krystaly: Math.min(1_000_000, stav.krystaly + ODMENA_VZTAHU.krystaly),
          }
        })
        return uspesne
      },
      aktivovaneChramoveRuny: [],
      aktivujChramovouRunu: (id, pozice) => {
        let uspech = false
        set(s => {
          if (!lzeAktivovatRunu(id, s.aktivovaneChramoveRuny, pozice, s.dokoncenyChram)) return s
          uspech = true
          return { aktivovaneChramoveRuny: [...s.aktivovaneChramoveRuny, id] }
        })
        return uspech
      },
      porazenChramovyStrazce: false,
      odmenChramovehoStrazce: () => {
        let uspech = false
        set(s => {
          if (!s.dokoncenePodzemi || s.porazenChramovyStrazce) return s
          uspech = true
          return { porazenChramovyStrazce: true,
            kamen: Math.min(1_000_000, s.kamen + ODMENA_STRAZCE.kamen),
            krystaly: Math.min(1_000_000, s.krystaly + ODMENA_STRAZCE.krystaly) }
        })
        return uspech
      },
      dokoncenePodzemi: false,
      dokonciPodzemi: (pozice) => {
        let uspech = false
        set(s => {
          if (!s.dokoncenyChram || !lzeDokoncitPodzemi(s.aktivovaneChramoveRuny, s.dokoncenePodzemi, pozice)) return s
          uspech = true
          return { dokoncenePodzemi: true, kamen: Math.min(1_000_000, s.kamen + ODMENA_PODZEMI.kamen), krystaly: Math.min(1_000_000, s.krystaly + ODMENA_PODZEMI.krystaly) }
        })
        return uspech
      },
      dokoncenyChram: false,
      prozkoumejChram: (pozice) => {
        let uspech = false
        set(stav => {
          if (!lzeProzkoumatChram(stav.udalostiPeceti, stav.dokoncenyChram, pozice)) return stav
          uspech = true
          return {
            dokoncenyChram: true,
            drevo: Math.min(1_000_000, stav.drevo + CHRAM_ODMENA.drevo),
            kamen: Math.min(1_000_000, stav.kamen + CHRAM_ODMENA.kamen),
            krystaly: Math.min(1_000_000, stav.krystaly + CHRAM_ODMENA.krystaly),
          }
        })
        return uspech
      },
      udalostiPeceti: [],
      probudStrazce: () => {
        let uspech = false
        set(stav => {
          if (!lzeProbuditStrazce(stav.aktivovaneRelikvie, stav.udalostiPeceti)) return stav
          uspech = true
          return {
            udalostiPeceti: [...stav.udalostiPeceti, TRI_PECETE_ID],
            drevo: Math.min(1_000_000, stav.drevo + TRI_PECETE_ODMENA.drevo),
            kamen: Math.min(1_000_000, stav.kamen + TRI_PECETE_ODMENA.kamen),
            krystaly: Math.min(1_000_000, stav.krystaly + TRI_PECETE_ODMENA.krystaly),
          }
        })
        return uspech
      },
      aktivovaneRelikvie: [],
      aktivujRelikvii: (id) => {
        let uspech = false
        set(stav => {
          if (!lzeAktivovatRelikvii(id, stav.aktivovaneRelikvie)) return stav
          const relikvie = RELIKVIE.find(r => r.id === id)!
          uspech = true
          return { aktivovaneRelikvie: [...stav.aktivovaneRelikvie, id],
            krystaly: Math.min(1_000_000, stav.krystaly + relikvie.krystaly) }
        })
        return uspech
      },
      otevrenePoklady: [],
      objeveneOblasti: [],
      objevOblast: (id) => {
        let nove = false
        set((stav) => {
          if (stav.objeveneOblasti.includes(id) || !Object.prototype.hasOwnProperty.call(ODMENY_ZA_OBJEVENTI, id)) return stav
          nove = true
          const odmena = ODMENY_ZA_OBJEVENTI[id]
          return {
            objeveneOblasti: [...stav.objeveneOblasti, id],
            drevo: Math.min(1_000_000, stav.drevo + odmena.drevo),
            kamen: Math.min(1_000_000, stav.kamen + odmena.kamen),
            krystaly: Math.min(1_000_000, stav.krystaly + odmena.krystaly),
          }
        })
        return nove
      },
      otevriPoklad: (id) => {
        let otevreno = false
        set((stav) => {
          if (!lzeOtevritPoklad(id, stav.otevrenePoklady)) return stav
          const poklad = POKLADY.find((p) => p.id === id)!
          otevreno = true
          return {
            otevrenePoklady: [...stav.otevrenePoklady, id],
            drevo: Math.min(1_000_000, stav.drevo + poklad.drevo),
            kamen: Math.min(1_000_000, stav.kamen + poklad.kamen),
            krystaly: Math.min(1_000_000, stav.krystaly + poklad.krystaly),
          }
        })
        return otevreno
      },
      splneneVedlejsiUkoly: [],
      prevzitVedlejsiOdmenu: (id) => {
        let prevzato = false
        set(s => {
          if (!lzePrevzitVedlejsiOdmenu(id, s.splneneVedlejsiUkoly, s)) return s
          const ukol = VEDLEJSI_UKOLY.find(q => q.id === id)!
          prevzato = true
          return {
            splneneVedlejsiUkoly: [...s.splneneVedlejsiUkoly, id],
            drevo: Math.min(1_000_000, s.drevo + ukol.odmena.drevo),
            kamen: Math.min(1_000_000, s.kamen + ukol.odmena.kamen),
            krystaly: Math.min(1_000_000, s.krystaly + ukol.odmena.krystaly),
          }
        })
        return prevzato
      },
      splneneUkoly: [],
      prevzitOdmenu: (id) => {
        let prevzato = false
        set(s => {
          const ukol = UKOLY.find(q => q.id === id)
          if (!ukol || s.splneneUkoly.includes(id) || !ukol.hotovo(s)) return s
          const poradi = UKOLY.findIndex(q => q.id === id)
          if (poradi > 0 && !s.splneneUkoly.includes(UKOLY[poradi - 1].id)) return s
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
          return { ...vysledek.stav, drevo: Math.min(1_000_000, vysledek.stav.drevo + (s.funkcniBudovy.includes('sklad') ? pocet : 0)), posledniProdukce: vysledek.cas }
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
        return recept ? vyrobPredmet(s, s.funkcniBudovy.includes('dilna') ? { ...recept, drevo: Math.max(0, recept.drevo - 1) } : recept) : s
      }),
      zaznamenejVyhru: (boss) => set((s) => { const dalsi = odmenaZaSouboj(s, boss); return { ...dalsi, kamen: Math.min(1_000_000, dalsi.kamen + (s.funkcniBudovy.includes('vez') ? 1 : 0)) } }),
      vylepsiOsadu: () => set((s) => rozsiritOsadu(s)),
      seberSurovinu: (typ) => set((s) => pridejSurovinu(s, typ)),
    }),
    {
      name: 'schoolbuddy-buddyworld-village-v1',
      storage: createJSONStorage(() => secureStorage),
      partialize: (s) => ({
        funkcniBudovy: s.funkcniBudovy,
        kaelTraining: s.kaelTraining,
        miraStavba: s.miraStavba,
        uroven: s.uroven, drevo: s.drevo, kamen: s.kamen, krystaly: s.krystaly,
        porazeniNepratele: s.porazeniNepratele, porazeniBossove: s.porazeniBossove,
        inventar: s.inventar,
        posledniProdukce: s.posledniProdukce,
        umisteneStavby: s.umisteneStavby,
        splneneUkoly: s.splneneUkoly,
        splneneVedlejsiUkoly: s.splneneVedlejsiUkoly,
        otevrenePoklady: s.otevrenePoklady,
        aktivovaneRelikvie: s.aktivovaneRelikvie,
        udalostiPeceti: s.udalostiPeceti,
        dokoncenyChram: s.dokoncenyChram,
        aktivovaneChramoveRuny: s.aktivovaneChramoveRuny,
        dokoncenePodzemi: s.dokoncenePodzemi,
        porazenChramovyStrazce: s.porazenChramovyStrazce,
        prevzateOdmenyVztahu: s.prevzateOdmenyVztahu,
        zaznamenaneNpcUdalosti: s.zaznamenaneNpcUdalosti,
        splneneNpcVypravy: s.splneneNpcVypravy,
        objeveneOblasti: s.objeveneOblasti,
      }),
      merge: (saved, current) => ({
        ...current, ...overVillageProgress(saved),
        funkcniBudovy: overFunkcniBudovy((saved as { funkcniBudovy?: unknown } | null)?.funkcniBudovy),
        kaelTraining: overKaelTraining((saved as { kaelTraining?: unknown } | null)?.kaelTraining),
        miraStavba: overMiraStavba((saved as { miraStavba?: unknown } | null)?.miraStavba),
        posledniProdukce: typeof (saved as { posledniProdukce?: unknown } | null)?.posledniProdukce === 'number'
          && Number.isFinite((saved as { posledniProdukce: number }).posledniProdukce)
          && (saved as { posledniProdukce: number }).posledniProdukce > 0
          && (saved as { posledniProdukce: number }).posledniProdukce <= Date.now()
          ? (saved as { posledniProdukce: number }).posledniProdukce : Date.now(),
        inventar: overInventar((saved as { inventar?: unknown } | null)?.inventar),
        umisteneStavby: overStavby((saved as { umisteneStavby?: unknown } | null)?.umisteneStavby),
        splneneVedlejsiUkoly: overSplneneVedlejsiUkoly((saved as { splneneVedlejsiUkoly?: unknown } | null)?.splneneVedlejsiUkoly),
        splneneUkoly: overSplneneUkoly((saved as { splneneUkoly?: unknown } | null)?.splneneUkoly),
        splneneNpcVypravy: overSplneneVypravy((saved as { splneneNpcVypravy?: unknown } | null)?.splneneNpcVypravy),
        zaznamenaneNpcUdalosti: overZaznamenaneUdalosti((saved as { zaznamenaneNpcUdalosti?: unknown } | null)?.zaznamenaneNpcUdalosti),
        prevzateOdmenyVztahu: overPrevzateOdmenyVztahu((saved as { prevzateOdmenyVztahu?: unknown } | null)?.prevzateOdmenyVztahu),
        aktivovaneChramoveRuny: overRuny((saved as { aktivovaneChramoveRuny?: unknown } | null)?.aktivovaneChramoveRuny),
        porazenChramovyStrazce: overPorazenehoStrazce((saved as { porazenChramovyStrazce?: unknown } | null)?.porazenChramovyStrazce),
        dokoncenePodzemi: overDokoncenePodzemi((saved as { dokoncenePodzemi?: unknown } | null)?.dokoncenePodzemi),
        dokoncenyChram: overDokoncenyChram((saved as { dokoncenyChram?: unknown } | null)?.dokoncenyChram),
        udalostiPeceti: overUdalostiPeceti((saved as { udalostiPeceti?: unknown } | null)?.udalostiPeceti),
        aktivovaneRelikvie: overAktivovaneRelikvie((saved as { aktivovaneRelikvie?: unknown } | null)?.aktivovaneRelikvie),
        otevrenePoklady: overOtevrenePoklady((saved as { otevrenePoklady?: unknown } | null)?.otevrenePoklady),
        objeveneOblasti: overObjeveneOblasti((saved as { objeveneOblasti?: unknown } | null)?.objeveneOblasti),
      }),
    }
  )
)
