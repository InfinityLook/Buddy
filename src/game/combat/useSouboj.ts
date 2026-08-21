import { useCallback, useState } from 'react'
import { KARTY } from './karty'
import { Karta, Nepritel } from './types'
import { Postava } from '../types'
import { useWalletStore } from '@/core/store/useWalletStore'
import { useGameCharacter } from '../useGameCharacter'
import { bojoveBonusyZProgresu, PostavaProgres, vychoziProgres } from '../leveling'

export interface BojoveStatistiky {
  maxVydrz: number
  /** Násobitel poškození (0.1 = +10 %) platný pro KAŽDOU zahranou kartu,
   *  bez ohledu na živel — na rozdíl od postava.bojNasobicPoskozeni, který
   *  platí jen bonusovému živlu té postavy (viz zahratKartu níž). */
  poskozeniBonus: number
  /** Přičítá se k postava.bojKriticka, ať vznikne celková šance. */
  kritickaBonus: number
}

/** Efektivní bojové bonusy postavy — sečtené z obchodu (useWalletStore.
 *  ownedItems) a z úrovně/dovedností té konkrétní postavy (leveling.ts).
 *  Používá jak samotný souboj (zahratKartu níž), tak Hrdina.tsx pro
 *  zobrazení statistik mimo boj — jeden zdroj pravdy, ať čísla v souboji
 *  a na kartě postavy nikdy nerozjedou. */
export const vypocitejBojoveStatistiky = (
  postava: Postava,
  progres: PostavaProgres,
  ownedItems: string[]
): BojoveStatistiky => {
  const obchodVydrz = ownedItems.includes('elixir-vytrvalosti') ? 15 : 0
  const obchodPoskozeni = ownedItems.includes('nabrousena-cepel') ? 0.1 : 0
  const obchodKriticka = ownedItems.includes('stastna-mince') ? 0.05 : 0

  const bonusyProgresu = bojoveBonusyZProgresu(progres)

  return {
    maxVydrz: postava.bojVydrz + obchodVydrz + bonusyProgresu.vydrz,
    poskozeniBonus: obchodPoskozeni + bonusyProgresu.poskozeni,
    kritickaBonus: obchodKriticka + bonusyProgresu.kriticka,
  }
}

export type SoubojFaze = 'probiha' | 'vyhra' | 'prohra'

interface SoubojStav {
  faze: SoubojFaze
  indexNepritele: number
  hracZivoty: number
  nepritelZivoty: number
  ruka: Karta[]
  log: string[]
  odmenaXp: number
  odmenaKredity: number
}

const nahodnaRuka = (): Karta[] => {
  const zbyva = [...KARTY]
  const vybrane: Karta[] = []
  for (let i = 0; i < 3 && zbyva.length > 0; i++) {
    const idx = Math.floor(Math.random() * zbyva.length)
    vybrane.push(zbyva.splice(idx, 1)[0])
  }
  return vybrane
}

const vRozsahu = (od: number, doC: number) => Math.floor(od + Math.random() * (doC - od + 1))

const pocatecniStav = (maxVydrz: number, nepratele: Nepritel[]): SoubojStav => ({
  faze: 'probiha',
  indexNepritele: 0,
  hracZivoty: maxVydrz,
  nepritelZivoty: nepratele[0].zivoty,
  ruka: nahodnaRuka(),
  log:
    nepratele.length > 1
      ? [`Souboj se ${nepratele[0].jmeno} začíná! (1. ze ${nepratele.length})`]
      : [`Souboj s ${nepratele[0].jmeno} začíná!`],
  odmenaXp: 0,
  odmenaKredity: 0,
})

// ==========================================
// Tahový soubojový stav — žije jen jako React state uvnitř Souboj.tsx,
// nic se nepersistuje (souboj se dá kdykoli přerušit návratem na mapu
// beze ztráty postavy). Karta se hraje, hráč dá poškození (s bonusem za
// postavin živel a šancí na kritický zásah), pak automaticky odpoví
// nepřítel — dokud jedna ze stran nedojde na nulu.
//
// Nepřátel může být víc za sebou (dungeon) — hráčova výdrž se mezi nimi
// NEOBNOVUJE, jen se plynule pokračuje na dalšího, a odměna se sčítá.
// Aréna s jedním nepřítelem funguje úplně stejně, jen bez přechodu.
//
// Bonusy se sčítají ze dvou nezávislých zdrojů: koupené předměty
// z obchodu (useWalletStore.ownedItems, platí pro kohokoli z party) a
// úroveň/dovednosti té KONKRÉTNÍ postavy (useGameCharacter.progres,
// viz leveling.ts) — obojí se přičítá k postaviným vlastním číslům.
// ==========================================

export const useSouboj = (postava: Postava, nepratele: Nepritel[]) => {
  const ownedItems = useWalletStore((s) => s.ownedItems)
  const progres = useGameCharacter((s) => s.progres[postava.id]) ?? vychoziProgres()
  const { maxVydrz, poskozeniBonus, kritickaBonus } = vypocitejBojoveStatistiky(postava, progres, ownedItems)

  const [stav, setStav] = useState<SoubojStav>(() => pocatecniStav(maxVydrz, nepratele))

  const zahratKartu = useCallback(
    (karta: Karta) => {
      setStav((s) => {
        if (s.faze !== 'probiha') return s
        const aktualni = nepratele[s.indexNepritele]

        let poskozeni = vRozsahu(karta.poskozeniOd, karta.poskozeniDo)
        if (poskozeniBonus > 0) poskozeni = Math.round(poskozeni * (1 + poskozeniBonus))

        const bonus = karta.zivel === postava.bojZivel
        if (bonus) poskozeni = Math.round(poskozeni * postava.bojNasobicPoskozeni)

        const kriticky = Math.random() < postava.bojKriticka + kritickaBonus
        if (kriticky) poskozeni = Math.round(poskozeni * postava.bojKritickyNasobic)

        const nepritelZivotyNove = Math.max(0, s.nepritelZivoty - poskozeni)
        const zprava = `${postava.jmeno} zahrál/a ${karta.nazev}${bonus ? ' (bonus živlu)' : ''}${
          kriticky ? ' — kritický zásah!' : ''
        } → ${poskozeni} poškození.`

        if (nepritelZivotyNove <= 0) {
          const odmenaXp = s.odmenaXp + aktualni.odmenaXp
          const odmenaKredity = s.odmenaKredity + aktualni.odmenaKredity
          const dalsiIndex = s.indexNepritele + 1

          if (dalsiIndex >= nepratele.length) {
            return {
              ...s,
              nepritelZivoty: 0,
              faze: 'vyhra',
              odmenaXp,
              odmenaKredity,
              log: [...s.log, zprava, nepratele.length > 1 ? `${aktualni.jmeno} poražen! Dungeon dokončen.` : `${aktualni.jmeno} poražen! Výhra.`],
            }
          }

          // Další soupeř v řadě — výdrž se neobnovuje, jen se jde dál.
          const dalsi = nepratele[dalsiIndex]
          return {
            ...s,
            indexNepritele: dalsiIndex,
            nepritelZivoty: dalsi.zivoty,
            ruka: nahodnaRuka(),
            odmenaXp,
            odmenaKredity,
            log: [...s.log, zprava, `${aktualni.jmeno} poražen! Před tebou další soupeř: ${dalsi.jmeno}.`],
          }
        }

        const protiutok = vRozsahu(aktualni.poskozeniOd, aktualni.poskozeniDo)
        const hracZivotyNove = Math.max(0, s.hracZivoty - protiutok)
        const zpravaProtiutoku = `${aktualni.jmeno} útočí za ${protiutok} poškození.`

        if (hracZivotyNove <= 0) {
          return {
            ...s,
            hracZivoty: 0,
            nepritelZivoty: nepritelZivotyNove,
            faze: 'prohra',
            log: [...s.log, zprava, zpravaProtiutoku, `${postava.jmeno} padl/a v boji...`],
          }
        }

        return {
          ...s,
          hracZivoty: hracZivotyNove,
          nepritelZivoty: nepritelZivotyNove,
          ruka: nahodnaRuka(),
          log: [...s.log, zprava, zpravaProtiutoku],
        }
      })
    },
    [postava, nepratele, poskozeniBonus, kritickaBonus]
  )

  const zkusitZnovu = useCallback(() => {
    setStav(pocatecniStav(maxVydrz, nepratele))
  }, [maxVydrz, nepratele])

  const aktualniNepritel = nepratele[stav.indexNepritele]

  return {
    faze: stav.faze,
    hracZivoty: stav.hracZivoty,
    hracMaxZivoty: maxVydrz,
    nepritel: aktualniNepritel,
    nepritelZivoty: stav.nepritelZivoty,
    nepritelMaxZivoty: aktualniNepritel.zivoty,
    poradiSoupere: stav.indexNepritele + 1,
    celkemSouperu: nepratele.length,
    ruka: stav.ruka,
    log: stav.log,
    odmenaXp: stav.odmenaXp,
    odmenaKredity: stav.odmenaKredity,
    zahratKartu,
    zkusitZnovu,
  }
}
