import { useCallback, useState } from 'react'
import { KARTY } from './karty'
import { Karta, Nepritel } from './types'
import { Postava } from '../types'

export type SoubojFaze = 'probiha' | 'vyhra' | 'prohra'

interface SoubojStav {
  faze: SoubojFaze
  hracZivoty: number
  nepritelZivoty: number
  ruka: Karta[]
  log: string[]
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

const pocatecniStav = (postava: Postava, nepritel: Nepritel): SoubojStav => ({
  faze: 'probiha',
  hracZivoty: postava.bojVydrz,
  nepritelZivoty: nepritel.zivoty,
  ruka: nahodnaRuka(),
  log: [`Souboj s ${nepritel.jmeno} začíná!`],
})

// ==========================================
// Tahový soubojový stav jednoho utkání — žije jen jako React state uvnitř
// Souboj.tsx, nic se nepersistuje (souboj se dá kdykoli přerušit návratem
// na mapu beze ztráty postavy). Karta se hraje, hráč dá poškození
// (s bonusem za postavin živel a šancí na kritický zásah), pak automaticky
// odpoví nepřítel — dokud jedna ze stran nedojde na nulu.
// ==========================================

export const useSouboj = (postava: Postava, nepritel: Nepritel) => {
  const [stav, setStav] = useState<SoubojStav>(() => pocatecniStav(postava, nepritel))

  const zahratKartu = useCallback(
    (karta: Karta) => {
      setStav((s) => {
        if (s.faze !== 'probiha') return s

        let poskozeni = vRozsahu(karta.poskozeniOd, karta.poskozeniDo)
        const bonus = karta.zivel === postava.bojZivel
        if (bonus) poskozeni = Math.round(poskozeni * postava.bojNasobicPoskozeni)

        const kriticky = Math.random() < postava.bojKriticka
        if (kriticky) poskozeni = Math.round(poskozeni * postava.bojKritickyNasobic)

        const nepritelZivotyNove = Math.max(0, s.nepritelZivoty - poskozeni)
        const zprava = `${postava.jmeno} zahrál/a ${karta.nazev}${bonus ? ' (bonus živlu)' : ''}${
          kriticky ? ' — kritický zásah!' : ''
        } → ${poskozeni} poškození.`

        if (nepritelZivotyNove <= 0) {
          return {
            ...s,
            nepritelZivoty: 0,
            faze: 'vyhra',
            log: [...s.log, zprava, `${nepritel.jmeno} poražen! Výhra.`],
          }
        }

        const protiutok = vRozsahu(nepritel.poskozeniOd, nepritel.poskozeniDo)
        const hracZivotyNove = Math.max(0, s.hracZivoty - protiutok)
        const zpravaProtiutoku = `${nepritel.jmeno} útočí za ${protiutok} poškození.`

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
    [postava, nepritel]
  )

  const zkusitZnovu = useCallback(() => {
    setStav(pocatecniStav(postava, nepritel))
  }, [postava, nepritel])

  return {
    faze: stav.faze,
    hracZivoty: stav.hracZivoty,
    hracMaxZivoty: postava.bojVydrz,
    nepritelZivoty: stav.nepritelZivoty,
    nepritelMaxZivoty: nepritel.zivoty,
    ruka: stav.ruka,
    log: stav.log,
    zahratKartu,
    zkusitZnovu,
  }
}
