import { useCallback, useState } from 'react'
import { KARTY } from './karty'
import { Karta, Nepritel } from './types'
import { Postava } from '../types'
import { useWalletStore } from '@/core/store/useWalletStore'
import { useGameCharacter } from '../useGameCharacter'
import { useInventarStore } from '../useInventarStore'
import { useVybaveniStore } from '../useVybaveniStore'
import { LUP } from '../data/items'
import { VYBAVENI } from '../data/equipment'
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

/** Efektivní bojové bonusy postavy — sečtené ze TŘÍ nezávislých zdrojů:
 *  obchodu (useWalletStore.ownedItems, účtové a trvalé), úrovně/
 *  dovedností té konkrétní postavy (leveling.ts) a jejího aktuálně
 *  nasazeného vybavení (Fáze 9, useVybaveniStore — na rozdíl od obchodu
 *  jde vyměnit/sundat, na rozdíl od dovedností to nejde "přerozdělit",
 *  jen nahradit jiným kusem). Používá jak samotný souboj (zahratKartu
 *  níž), tak Hrdina.tsx pro zobrazení statistik mimo boj — jeden zdroj
 *  pravdy, ať čísla v souboji a na kartě postavy nikdy nerozjedou. */
export const vypocitejBojoveStatistiky = (
  postava: Postava,
  progres: PostavaProgres,
  ownedItems: string[],
  nasazenaVybaveniId?: string
): BojoveStatistiky => {
  const obchodVydrz = ownedItems.includes('elixir-vytrvalosti') ? 15 : 0
  const obchodPoskozeni = ownedItems.includes('nabrousena-cepel') ? 0.1 : 0
  const obchodKriticka = ownedItems.includes('stastna-mince') ? 0.05 : 0

  const bonusyProgresu = bojoveBonusyZProgresu(progres)
  const vybaveni = nasazenaVybaveniId ? VYBAVENI.find((p) => p.id === nasazenaVybaveniId) : undefined

  return {
    maxVydrz: postava.bojVydrz + obchodVydrz + bonusyProgresu.vydrz + (vybaveni?.bonusVydrz ?? 0),
    poskozeniBonus: obchodPoskozeni + bonusyProgresu.poskozeni + (vybaveni?.bonusPoskozeni ?? 0),
    kritickaBonus: obchodKriticka + bonusyProgresu.kriticka + (vybaveni?.bonusKriticka ?? 0),
  }
}

export type SoubojFaze = 'probiha' | 'vyhra' | 'prohra'

interface SoubojStav {
  faze: SoubojFaze
  indexNepritele: number
  hracZivoty: number
  nepritelZivoty: number
  ruka: Karta[]
  /** Zbytek zamíchaného balíčku, ze kterého se dealuje další ruka —
   *  viz dalsiRuka níž. Když v něm nezbývá dost karet, zamíchá se
   *  čerstvá kopie celého balíčku, ne že by hráči "došly karty". */
  balicek: Karta[]
  log: string[]
  odmenaXp: number
  odmenaKredity: number
  /** Signální schopnost jde použít jen jednou za souboj — viz
   *  pouzitSchopnost níž. Nezresetuje se mezi soupeři v dungeonu,
   *  jen mezi celými souboji (zkusitZnovu). */
  schopnostPouzita: boolean
  /** Lup vydrolený z poražených nepřátel tohohle souboje (Fáze 6,
   *  inventory) — id z game/data/items.ts, jedno na poraženého
   *  nepřítele, co lup má. Souboj.tsx ho po výhře přidá do batohu přes
   *  useInventarStore.pridatPredmet — sám useSouboj do žádného storu
   *  nezapisuje, jen si výsledky pamatuje ve svém stavu (stejně jako
   *  odmenaXp/odmenaKredity). */
  ziskanyLup: string[]
  /** Fáze 8 (bossové) — true od chvíle, kdy aktuální boss poprvé klesl
   *  pod svůj zuriPodHp práh, do konce souboje s ním. Resetuje se na
   *  false při přechodu na dalšího soupeře (dungeon) i při zkusitZnovu —
   *  je to vlastnost AKTUÁLNÍHO souboje s AKTUÁLNÍM nepřítelem, ne
   *  postavy. */
  nepritelZuri: boolean
}

/** Výsledek jedné hráčovy akce (karta i schopnost) v jednotném tvaru —
 *  vyhodnotAkci níž z něj složí nový stav, ať karty a schopnosti
 *  nemají dvě oddělené kopie logiky "co se stane po zásahu". */
interface VysledekAkce {
  poskozeniNepriteli: number
  /** Kladné = léčení (Elara), záporné = vlastní újma navíc (Drakon). */
  zmenaVlastniVydrze: number
  zprava: string
  /** Štít (Kael) pohltí bezprostředně následující protiútok beze ztráty. */
  blokujeProtiutok: boolean
}

/** Fisher–Yates zamíchání celého balíčku — nová kopie, originál KARTY
 *  nikdy nemutuje. */
const zamichanyBalicek = (): Karta[] => {
  const pole = [...KARTY]
  for (let i = pole.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pole[i], pole[j]] = [pole[j], pole[i]]
  }
  return pole
}

/** Vytáhne novou trojici karet z balíčku — Fáze 5 (cards): dřív se
 *  ruka losovala pokaždé znovu z celého poolu nezávisle, takže se
 *  klidně mohla stejná karta objevit v ruce čtyřikrát za sebou. Teď
 *  se dealuje z jednoho zamíchaného balíčku bez opakování, dokud
 *  nedojde — pak se zamíchá čerstvá kopie a pokračuje se dál, jako
 *  nové "kolo" balíčku, ne že by hráči něco došlo. */
const dalsiRuka = (balicek: Karta[]): { ruka: Karta[]; balicek: Karta[] } => {
  const zdroj = balicek.length >= 3 ? balicek : zamichanyBalicek()
  return { ruka: zdroj.slice(0, 3), balicek: zdroj.slice(3) }
}

const vRozsahu = (od: number, doC: number) => Math.floor(od + Math.random() * (doC - od + 1))

const pocatecniStav = (maxVydrz: number, nepratele: Nepritel[]): SoubojStav => {
  const { ruka, balicek } = dalsiRuka(zamichanyBalicek())
  return {
    faze: 'probiha',
    indexNepritele: 0,
    hracZivoty: maxVydrz,
    nepritelZivoty: nepratele[0].zivoty,
    ruka,
    balicek,
    log:
      nepratele.length > 1
        ? [`Souboj se ${nepratele[0].jmeno} začíná! (1. ze ${nepratele.length})`]
        : [`Souboj s ${nepratele[0].jmeno} začíná!`],
    odmenaXp: 0,
    odmenaKredity: 0,
    schopnostPouzita: false,
    ziskanyLup: [],
    nepritelZuri: false,
  }
}

/** Rozhodne, jestli poražený nepřítel zrovna upustil svůj loot —
 *  čistá funkce (žádný zápis do storu), aby vyhodnotAkci níž zůstala
 *  čistá taky. */
const vyhodnotLup = (nepritel: Nepritel): string | null =>
  nepritel.lupId && Math.random() < (nepritel.sanceNaLup ?? 0) ? nepritel.lupId : null

/** Aplikuje jednu vyhodnocenou hráčovu akci na aktuální stav — poškození/
 *  léčení, kontrola výhry (a případně dalšího soupeře v dungeonu), a
 *  pokud souboj nekončí, protiútok nepřítele (nebo jeho zablokování
 *  štítem). Sdílené mezi zahratKartu a pouzitSchopnost níž. */
const vyhodnotAkci = (
  s: SoubojStav,
  postava: Postava,
  nepratele: Nepritel[],
  maxVydrz: number,
  akce: VysledekAkce
): SoubojStav => {
  const aktualni = nepratele[s.indexNepritele]
  const nepritelZivotyNove = Math.max(0, s.nepritelZivoty - akce.poskozeniNepriteli)
  const hracZivotyPoAkci = Math.max(0, Math.min(maxVydrz, s.hracZivoty + akce.zmenaVlastniVydrze))

  // Fáze 8 (bossové) — jednou nastoupí, nepřestane platit dřív, než
  // souboj s tímhle konkrétním soupeřem skončí (life > 0, i kdyby ho
  // hráč mezitím doléčil — zuřivost neustupuje, jen zesiluje protiútok).
  const zuriTeto =
    s.nepritelZuri ||
    (!!aktualni.jeBoss &&
      aktualni.zuriPodHp !== undefined &&
      nepritelZivotyNove > 0 &&
      nepritelZivotyNove <= aktualni.zivoty * aktualni.zuriPodHp)
  const zuriPoprve = zuriTeto && !s.nepritelZuri
  const zpravaZuri = zuriPoprve ? [`😡 ${aktualni.jmeno} se rozzuřil! Jeho útoky teď bolí víc.`] : []

  if (nepritelZivotyNove <= 0) {
    const odmenaXp = s.odmenaXp + aktualni.odmenaXp
    const odmenaKredity = s.odmenaKredity + aktualni.odmenaKredity
    const novyLup = vyhodnotLup(aktualni)
    const ziskanyLup = novyLup ? [...s.ziskanyLup, novyLup] : s.ziskanyLup
    const zpravaLupu = novyLup ? ` ${LUP.find((l) => l.id === novyLup)?.ikona ?? ''} Získáváš loot!` : ''
    const dalsiIndex = s.indexNepritele + 1

    if (dalsiIndex >= nepratele.length) {
      return {
        ...s,
        hracZivoty: hracZivotyPoAkci,
        nepritelZivoty: 0,
        faze: 'vyhra',
        odmenaXp,
        odmenaKredity,
        ziskanyLup,
        nepritelZuri: false,
        log: [
          ...s.log,
          akce.zprava,
          `${aktualni.jmeno} poražen! ${nepratele.length > 1 ? 'Dungeon dokončen.' : 'Výhra.'}${zpravaLupu}`,
        ],
      }
    }

    const dalsi = nepratele[dalsiIndex]
    const rukaDalsihoSoupere = dalsiRuka(s.balicek)
    return {
      ...s,
      hracZivoty: hracZivotyPoAkci,
      indexNepritele: dalsiIndex,
      nepritelZivoty: dalsi.zivoty,
      ...rukaDalsihoSoupere,
      odmenaXp,
      odmenaKredity,
      ziskanyLup,
      nepritelZuri: false,
      log: [...s.log, akce.zprava, `${aktualni.jmeno} poražen!${zpravaLupu} Před tebou další soupeř: ${dalsi.jmeno}.`],
    }
  }

  if (akce.blokujeProtiutok) {
    const rukaPoStitu = dalsiRuka(s.balicek)
    return {
      ...s,
      hracZivoty: hracZivotyPoAkci,
      nepritelZivoty: nepritelZivotyNove,
      ...rukaPoStitu,
      nepritelZuri: zuriTeto,
      log: [...s.log, akce.zprava, ...zpravaZuri, `${aktualni.jmeno} útočí, ale štít ho odráží beze ztráty výdrže!`],
    }
  }

  const zuriNasobic = zuriTeto ? (aktualni.zuriNasobicPoskozeni ?? 1) : 1
  const protiutok = Math.round(vRozsahu(aktualni.poskozeniOd, aktualni.poskozeniDo) * zuriNasobic)
  const hracZivotyNove = Math.max(0, hracZivotyPoAkci - protiutok)
  const zpravaProtiutoku = `${aktualni.jmeno} útočí za ${protiutok} poškození.`

  if (hracZivotyNove <= 0) {
    return {
      ...s,
      hracZivoty: 0,
      nepritelZivoty: nepritelZivotyNove,
      faze: 'prohra',
      nepritelZuri: zuriTeto,
      log: [...s.log, akce.zprava, ...zpravaZuri, zpravaProtiutoku, `${postava.jmeno} padl/a v boji...`],
    }
  }

  return {
    ...s,
    hracZivoty: hracZivotyNove,
    nepritelZivoty: nepritelZivotyNove,
    ...dalsiRuka(s.balicek),
    nepritelZuri: zuriTeto,
    log: [...s.log, akce.zprava, ...zpravaZuri, zpravaProtiutoku],
  }
}

// ==========================================
// Tahový soubojový stav — žije jen jako React state uvnitř Souboj.tsx,
// nic se nepersistuje (souboj se dá kdykoli přerušit návratem na mapu
// beze ztráty postavy). Hráč v jednom tahu zahraje kartu, NEBO jednou
// za souboj použije postavinu signální schopnost (pouzitSchopnost),
// NEBO spotřebuje batohový předmět (pouzitPredmet, Fáze 6, inventory)
// — všechny tři běží přes stejnou vyhodnotAkci výš, dá poškození/
// léčení, pak automaticky odpoví nepřítel — dokud jedna ze stran
// nedojde na nulu.
//
// Nepřátel může být víc za sebou (dungeon) — hráčova výdrž se mezi nimi
// NEOBNOVUJE, jen se plynule pokračuje na dalšího, a odměna (XP, kredity,
// i případný loot) se sčítá.
// Aréna s jedním nepřítelem funguje úplně stejně, jen bez přechodu.
//
// Bossové (Fáze 8) jsou obyčejný Nepritel s pár volitelnými poli navíc
// (jeBoss, zuriPodHp, zuriNasobicPoskozeni v combat/types.ts) — žádný
// nový soubojový systém, jen jedna podmínka uvnitř vyhodnotAkci výš,
// co jednou (a nevratně, dokud s ním souboj trvá) zesílí jeho
// protiútok, jakmile klesne pod svůj práh životů. Souboj.tsx z toho
// vyčte nepritelZuri a jeBoss čistě pro zobrazení (štítek, zář,
// varování v logu) — nic z toho neovlivňuje karty/schopnosti/předměty
// samotné, ty útočí úplně stejně jako na kohokoli jiného.
//
// Bonusy se sčítají ze dvou nezávislých zdrojů: koupené předměty
// z obchodu (useWalletStore.ownedItems, platí pro kohokoli z party) a
// úroveň/dovednosti té KONKRÉTNÍ postavy (useGameCharacter.progres,
// viz leveling.ts) — obojí se přičítá k postaviným vlastním číslům.
// Batohový loot (useInventarStore) je oddělený systém — obchodní
// položky jsou trvalé, loot je spotřební, viz komentář v data/items.ts.
// ==========================================

export const useSouboj = (postava: Postava, nepratele: Nepritel[]) => {
  const ownedItems = useWalletStore((s) => s.ownedItems)
  const progres = useGameCharacter((s) => s.progres[postava.id]) ?? vychoziProgres()
  const nasazenaVybaveniId = useVybaveniStore((s) => s.nasazene[postava.id])
  const { maxVydrz, poskozeniBonus, kritickaBonus } = vypocitejBojoveStatistiky(
    postava,
    progres,
    ownedItems,
    nasazenaVybaveniId
  )
  const predmetyVBatohu = useInventarStore((s) => s.predmety)
  const spotrebovatPredmet = useInventarStore((s) => s.spotrebovatPredmet)

  const [stav, setStav] = useState<SoubojStav>(() => pocatecniStav(maxVydrz, nepratele))

  const zahratKartu = useCallback(
    (karta: Karta) => {
      setStav((s) => {
        if (s.faze !== 'probiha') return s

        let poskozeni = vRozsahu(karta.poskozeniOd, karta.poskozeniDo)
        if (poskozeniBonus > 0) poskozeni = Math.round(poskozeni * (1 + poskozeniBonus))

        const bonus = karta.zivel === postava.bojZivel
        if (bonus) poskozeni = Math.round(poskozeni * postava.bojNasobicPoskozeni)

        const kriticky = Math.random() < postava.bojKriticka + kritickaBonus
        if (kriticky) poskozeni = Math.round(poskozeni * postava.bojKritickyNasobic)

        const leceni = karta.vlastniLeceni ?? 0
        const zprava = `${postava.jmeno} zahrál/a ${karta.nazev}${bonus ? ' (bonus živlu)' : ''}${
          kriticky ? ' — kritický zásah!' : ''
        } → ${poskozeni} poškození${leceni > 0 ? ` (+${leceni} vlastní výdrže)` : ''}.`

        return vyhodnotAkci(s, postava, nepratele, maxVydrz, {
          poskozeniNepriteli: poskozeni,
          zmenaVlastniVydrze: leceni,
          zprava,
          blokujeProtiutok: false,
        })
      })
    },
    [postava, nepratele, poskozeniBonus, kritickaBonus, maxVydrz]
  )

  const pouzitSchopnost = useCallback(() => {
    setStav((s) => {
      if (s.faze !== 'probiha' || s.schopnostPouzita) return s
      const schopnost = postava.specialniSchopnost

      let akce: VysledekAkce
      if (schopnost.typ === 'stit') {
        akce = {
          poskozeniNepriteli: 0,
          zmenaVlastniVydrze: 0,
          zprava: `${postava.jmeno} použil/a ${schopnost.nazev}.`,
          blokujeProtiutok: true,
        }
      } else if (schopnost.typ === 'leceni') {
        const uzdraveni = vRozsahu(schopnost.hodnotaOd, schopnost.hodnotaDo)
        akce = {
          poskozeniNepriteli: 0,
          zmenaVlastniVydrze: uzdraveni,
          zprava: `${postava.jmeno} použil/a ${schopnost.nazev} → +${uzdraveni} výdrže.`,
          blokujeProtiutok: false,
        }
      } else {
        const poskozeni = vRozsahu(schopnost.hodnotaOd, schopnost.hodnotaDo)
        akce = {
          poskozeniNepriteli: poskozeni,
          zmenaVlastniVydrze: -schopnost.vlastniNaklad,
          zprava: `${postava.jmeno} použil/a ${schopnost.nazev}${
            schopnost.vlastniNaklad > 0 ? ` (−${schopnost.vlastniNaklad} vlastní výdrže)` : ''
          } → ${poskozeni} poškození.`,
          blokujeProtiutok: false,
        }
      }

      return { ...vyhodnotAkci(s, postava, nepratele, maxVydrz, akce), schopnostPouzita: true }
    })
  }, [postava, nepratele, maxVydrz])

  /** Použije jeden kus batohového předmětu — na rozdíl od pouzitSchopnost
   *  není omezené na jednou za souboj, jen počtem kusů v batohu.
   *  Spotřebování z useInventarStore proběhne ihned (mimo React state
   *  souboje); pokud hráč předmět neměl, spotrebovatPredmet vrátí
   *  false a nic dalšího se neodehraje. */
  const pouzitPredmet = useCallback(
    (lupId: string) => {
      const lup = LUP.find((l) => l.id === lupId)
      if (!lup || !spotrebovatPredmet(lupId)) return

      setStav((s) => {
        if (s.faze !== 'probiha') return s
        if (lup.typ === 'leceni') {
          const uzdraveni = vRozsahu(lup.hodnotaOd, lup.hodnotaDo)
          return vyhodnotAkci(s, postava, nepratele, maxVydrz, {
            poskozeniNepriteli: 0,
            zmenaVlastniVydrze: uzdraveni,
            zprava: `${postava.jmeno} použil/a ${lup.nazev} → +${uzdraveni} výdrže.`,
            blokujeProtiutok: false,
          })
        }
        return s
      })
    },
    [postava, nepratele, maxVydrz, spotrebovatPredmet]
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
    schopnostPouzita: stav.schopnostPouzita,
    ziskanyLup: stav.ziskanyLup,
    nepritelZuri: stav.nepritelZuri,
    predmetyVBatohu,
    zahratKartu,
    pouzitSchopnost,
    pouzitPredmet,
    zkusitZnovu,
  }
}
