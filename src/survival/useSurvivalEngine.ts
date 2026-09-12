import { useCallback, useRef, useState } from 'react'
import { krokHry, vytvorPocatecniStav, extrahovat, pokracovatVeVlne } from './engine/engine'
import { SurvivalHerniStav, Pozice2D, PostavaDef, DuvodKonceBehu } from './types'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useSurvivalStore } from '@/core/store/useSurvivalStore'

// ==========================================
// Hook vlastnící BĚŽÍCÍ STAV jednoho runu (bod 27 zadání: gameStatus/
// currentWave/player/enemies/... state shape) — sám o sobě nekreslí nic,
// to dělá scene/useSurvivalScene.ts, a nevlastní ani requestAnimationFrame
// smyčku samotnou — tu vlastní volající komponenta (SurvivalModule.tsx),
// stejný vzor jako Souboj's TvHost.tsx: appka nechce dvě nezávislé
// smyčky (jednu na engine, druhou na scénu) běžet zvlášť.
//
// DVĚ ODDĚLENÉ "XP" appka schválně nikdy neplete dohromady:
// - stav.xpZaBeh (⭐ v HUD) je Survival Night's VLASTNÍ, jen tohohle
//   běhu se týkající zdroj — nemá nic společného s appčiným účtovým
//   levelem.
// - recordAction('survival_kill'/'survival_wave'/'boss', ...) níž
//   přidává malé, PEVNÉ množství XP do SDÍLENÉHO gamifikačního
//   systému (useGamificationStore) — to je appčin skutečný level/
//   odznaky, co vidí i Profil/Odměny. Stejná "dvě různé věci, dva
//   různé účely" zásada jako Pomodoro's completedSessions vs.
//   counters.pomodoro (viz CLAUDE.md).
// ==========================================

const XP_ZA_ZABITI = 2
const XP_ZA_VLNU = 5
const XP_ZA_BOSSE = 30

const HUD_OBNOVA_MS = 150

export interface VysledekBehu {
  vlnaDosazena: number
  zabiti: number
  cas: number
  xp: number
  gold: number
  krystal: number
  bossPorazeno: number
  jeRekord: boolean
  /** 'extrakce' vs. 'smrt' — RunEndScreen.tsx podle toho ukazuje jiný
   *  nadpis/barvu (úspěšný odchod, ne prohra). */
  duvodKonce: DuvodKonceBehu
}

interface UseSurvivalEngineResult {
  /** Poslední throttlovaný snímek stavu pro HUD (viz komentář výš —
   *  ne 60×/s, jen ~7×/s, ať appka neposílá do Reactu stovky updatů
   *  za vteřinu jen kvůli číslům v hlavičce). */
  hud: SurvivalHerniStav
  /** Přímá reference na živý stav — scéna (useSurvivalScene.ts) ho čte
   *  KAŽDÝ snímek sama, mimo React, ať appka nemá stovky pozičních
   *  aktualizací za vteřinu procházet přes setState. */
  stavRef: React.RefObject<SurvivalHerniStav>
  nastavSmer: (x: number, z: number) => void
  /** Zavolat z rAF smyčky vlastněné SurvivalModule.tsx/Arena3D.tsx. */
  krok: (dtMs: number) => void
  vysledekBehu: VysledekBehu | null
  restartovat: () => void
  /** Předčasné ukončení běhu (tlačítko "Ukončit" v HUD) — nastaví
   *  `konec`, další volání `krok()` (pořád běžící v rAF smyčce)
   *  vyhodnotí a uloží běh úplně stejně jako smrt. */
  ukoncitPredcasne: () => void
  /** Bod 18 zadání — zavolat z ExtractionPrompt.tsx's "EXTRAHOVAT"
   *  tlačítka. No-op mimo fázi 'extrakce' (viz engine.ts's vlastní
   *  guard), appka nevěří UI o nic víc, než engine věří appce. */
  extrahovat: () => void
  /** ...a z jejího "POKRAČOVAT" tlačítka. */
  pokracovat: () => void
}

export const useSurvivalEngine = (postava: PostavaDef): UseSurvivalEngineResult => {
  const stavRef = useRef<SurvivalHerniStav>(vytvorPocatecniStav(postava))
  const smerRef = useRef<Pozice2D>({ x: 0, z: 0 })
  const [hud, setHud] = useState<SurvivalHerniStav>(stavRef.current)
  const [vysledekBehu, setVysledekBehu] = useState<VysledekBehu | null>(null)
  const poslHudAktualizaceRef = useRef(0)
  const behUzUlozenRef = useRef(false)

  const nastavSmer = useCallback((x: number, z: number) => {
    smerRef.current = { x, z }
  }, [])

  const restartovat = useCallback(() => {
    stavRef.current = vytvorPocatecniStav(postava)
    smerRef.current = { x: 0, z: 0 }
    poslHudAktualizaceRef.current = 0
    behUzUlozenRef.current = false
    setVysledekBehu(null)
    setHud(stavRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const krok = useCallback((dtMs: number) => {
    const stav = stavRef.current

    // POZOR — skutečná chyba, kterou tohle chránilo: appka dřív vracela
    // hned na začátku, pokud `stav.konec` bylo už true. To fungovalo
    // pro smrt (tu nastavuje `krokHry` UVNITŘ tohohle volání, takže
    // banka-výsledku-běhu níž ještě proběhla ve stejném ticku), ale ne
    // pro "Ukončit" v HUD (`ukoncitPredcasne` nastaví `konec` MIMO
    // krok — z click handleru mezi snímky) — příští volání `krok()` by
    // se hned vrátilo a výsledek běhu by se nikdy nezapsal ani
    // nezobrazil. `krokHry` sama o sobě zůstává no-op, pokud `konec`
    // už platí (viz engine.ts), takže appka ji volá pořád bez rizika,
    // jen banka-výsledku-běhu níž musí proběhnout bez ohledu na to,
    // KDE se `konec` stalo pravdou.
    const zabitiPred = stav.zabitiCelkem
    const bossPred = stav.bossPorazenoZaBeh
    const vlnaPred = stav.vlna

    krokHry(stav, dtMs, smerRef.current)

    // --- sdílený gamifikační systém (viz komentář nahoře souboru) ---
    const novyBossPocet = stav.bossPorazenoZaBeh - bossPred
    const novaZabitiCelkem = stav.zabitiCelkem - zabitiPred
    const novaZabitiMonster = Math.max(0, novaZabitiCelkem - novyBossPocet)

    if (novaZabitiMonster > 0) {
      const melJizZabiti = (useGamificationStore.getState().counters.survival_kill ?? 0) > 0
      for (let i = 0; i < novaZabitiMonster; i++) {
        useGamificationStore.getState().recordAction('survival_kill', XP_ZA_ZABITI)
      }
      if (!melJizZabiti) useGamificationStore.getState().unlockBadge('first_blood')
    }
    if (novyBossPocet > 0) {
      for (let i = 0; i < novyBossPocet; i++) {
        useGamificationStore.getState().recordAction('boss', XP_ZA_BOSSE)
      }
    }
    if (stav.vlna > vlnaPred && !stav.konec) {
      useGamificationStore.getState().recordAction('survival_wave', XP_ZA_VLNU)
    }

    // Vydrž-vlny odznaky — appka kontroluje NEJVYŠŠÍ vlnu DOSAŽENOU V
    // TOMHLE běhu, ne kolikrát se to stalo celkem (COUNT_BADGES na to
    // nemá tvar, stejný problém jako exam_master jinde v appce).
    if (stav.vlna > 10) useGamificationStore.getState().unlockBadge('survivor')
    if (stav.vlna > 50) useGamificationStore.getState().unlockBadge('impossible')
    if (stav.vlna > 100) useGamificationStore.getState().unlockBadge('night_legend')

    // --- konec běhu — zapsat trvalý postup přesně jednou ---
    if (stav.konec && !behUzUlozenRef.current) {
      behUzUlozenRef.current = true
      const skore = stav.zabitiCelkem * 10 + stav.vlna * 100 + stav.xpZaBeh
      const jeRekord = useSurvivalStore.getState().zapocitatBeh({
        vlnaDosazena: stav.vlna,
        gold: stav.goldZaBeh,
        krystal: stav.krystalZaBeh,
        skore,
        bossPorazeno: stav.bossPorazenoZaBeh,
        prezitySekund: Math.floor(stav.cas / 1000),
      })
      setVysledekBehu({
        vlnaDosazena: stav.vlna,
        zabiti: stav.zabitiCelkem,
        cas: stav.cas,
        xp: stav.xpZaBeh,
        gold: stav.goldZaBeh,
        krystal: stav.krystalZaBeh,
        bossPorazeno: stav.bossPorazenoZaBeh,
        jeRekord,
        duvodKonce: stav.duvodKonce,
      })
    }

    // --- throttlovaný HUD snímek ---
    poslHudAktualizaceRef.current += dtMs
    if (poslHudAktualizaceRef.current >= HUD_OBNOVA_MS || stav.konec) {
      poslHudAktualizaceRef.current = 0
      setHud({ ...stav })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ukoncitPredcasne = useCallback(() => {
    stavRef.current.konec = true
  }, [])

  const extrahovatZBehu = useCallback(() => {
    extrahovat(stavRef.current)
  }, [])

  const pokracovatZBehu = useCallback(() => {
    pokracovatVeVlne(stavRef.current)
  }, [])

  return {
    hud,
    stavRef,
    nastavSmer,
    krok,
    vysledekBehu,
    restartovat,
    ukoncitPredcasne,
    extrahovat: extrahovatZBehu,
    pokracovat: pokracovatZBehu,
  }
}
