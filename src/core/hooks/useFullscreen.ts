import { useCallback, useEffect, useState } from 'react'

// ==========================================
// Celoobrazovkový režim (Fullscreen API) pro CELOU appku — jeden
// sdílený hook, jedno tlačítko (FullscreenToggle.tsx), vykreslené
// jednou z App.tsx a viditelné na každé obrazovce (mobil/PC/tablet/
// TV/notebook), ne řešení schované uvnitř jedné appky/hry.
//
// Zapíná se vždy nad document.documentElement (celou stránku), nikdy
// nad jedním konkrétním prvkem — appka jako celek se má vejít na
// celou obrazovku zařízení, ne jen jedna miniaplikace.
//
// iOS Safari (iPhone i iPad) záměrně Fullscreen API pro obyčejné DOM
// prvky vůbec nepodporuje, jen pro <video> — document.fullscreenEnabled
// tam vrací false. Stejná "feature-detect, appka bez podpory tlačítko
// vůbec nenabídne" disciplína jako u BarcodeDetector/MediaRecorder/
// Vibration API jinde v appce (viz CLAUDE.md), ne pokus o náhradu.
// Ostatní prohlížeče (Chrome/Edge/Firefox/starší Safari na macOS)
// mají buď nativní, nebo vendor-prefixovanou verzi téhož API — appka
// zkouší všechny varianty v pořadí, ne jen tu bezprefixovou.
// ==========================================

interface DokumentSFullscreenem extends Document {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void>
  webkitFullscreenEnabled?: boolean
  mozFullScreenElement?: Element | null
  mozCancelFullScreen?: () => Promise<void>
  mozFullScreenEnabled?: boolean
  msFullscreenElement?: Element | null
  msExitFullscreen?: () => Promise<void>
  msFullscreenEnabled?: boolean
}

interface PrvekSFullscreenem extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>
  mozRequestFullScreen?: () => Promise<void>
  msRequestFullscreen?: () => Promise<void>
}

const UDALOSTI_ZMENY = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'mozfullscreenchange',
  'MSFullscreenChange',
] as const

function ziskejFullscreenPrvek(): Element | null {
  const d = document as DokumentSFullscreenem
  return (
    document.fullscreenElement ??
    d.webkitFullscreenElement ??
    d.mozFullScreenElement ??
    d.msFullscreenElement ??
    null
  )
}

/** Zjistí jednou (mimo React), jestli prohlížeč Fullscreen API vůbec umí. */
export function jeFullscreenPodporovan(): boolean {
  if (typeof document === 'undefined') return false
  const d = document as DokumentSFullscreenem
  return !!(
    document.fullscreenEnabled ??
    d.webkitFullscreenEnabled ??
    d.mozFullScreenEnabled ??
    d.msFullscreenEnabled
  )
}

/** Je PRÁVĚ TEĎ nějaký prvek v dokumentu ve fullscreenu (mimo React)? */
export function jeAktualneFullscreen(): boolean {
  return !!ziskejFullscreenPrvek()
}

/**
 * Požádá o fullscreen nad daným prvkem — sdílená implementace pro
 * useFullscreen()'s vlastní zapnout() i pro useAutoFullscreen.ts
 * (automatický vstup při prvním gestu, viz tam), ať existuje jen
 * jedna kopie řetězce vendor-prefixovaných variant k vyzkoušení.
 *
 * Prohlížeč tohle tiše odmítne, pokud nejde o skutečné gesto
 * uživatele (klik/dotyk/klávesa) — volající za to nemůže, appka
 * na to nic nepředstírá, jen se tiše nic nestane.
 */
export async function pozadejOFullscreen(elBazovy: HTMLElement): Promise<void> {
  const el = elBazovy as PrvekSFullscreenem
  try {
    if (el.requestFullscreen) await el.requestFullscreen()
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
    else if (el.mozRequestFullScreen) await el.mozRequestFullScreen()
    else if (el.msRequestFullscreen) await el.msRequestFullscreen()
  } catch {
    // Prohlížeč odmítl (např. appka to nezavolala uvnitř skutečného
    // gesta uživatele, nebo to zařízení fullscreen prostě zakazuje) —
    // appka nic nepředstírá, zůstane, jak je.
  }
}

interface UseFullscreenVysledek {
  /** Umí to tenhle prohlížeč vůbec (viz iOS Safari výš)? */
  podporovano: boolean
  /** Je appka PRÁVĚ TEĎ v celoobrazovkovém režimu? */
  jeFullscreen: boolean
  zapnout: () => Promise<void>
  vypnout: () => Promise<void>
  prepnout: () => Promise<void>
}

export function useFullscreen(): UseFullscreenVysledek {
  const [podporovano] = useState(jeFullscreenPodporovan)
  const [jeFullscreen, setJeFullscreen] = useState(() => !!ziskejFullscreenPrvek())

  useEffect(() => {
    if (!podporovano) return
    const aktualizuj = () => setJeFullscreen(!!ziskejFullscreenPrvek())
    UDALOSTI_ZMENY.forEach((u) => document.addEventListener(u, aktualizuj))
    return () => UDALOSTI_ZMENY.forEach((u) => document.removeEventListener(u, aktualizuj))
  }, [podporovano])

  const zapnout = useCallback(async () => {
    await pozadejOFullscreen(document.documentElement)
  }, [])

  const vypnout = useCallback(async () => {
    const d = document as DokumentSFullscreenem
    try {
      if (document.exitFullscreen) await document.exitFullscreen()
      else if (d.webkitExitFullscreen) await d.webkitExitFullscreen()
      else if (d.mozCancelFullScreen) await d.mozCancelFullScreen()
      else if (d.msExitFullscreen) await d.msExitFullscreen()
    } catch {
      // stejně tiše — nic se nerozbije, appka zůstane, jak je
    }
  }, [])

  const prepnout = useCallback(async () => {
    if (ziskejFullscreenPrvek()) await vypnout()
    else await zapnout()
  }, [zapnout, vypnout])

  return { podporovano, jeFullscreen, zapnout, vypnout, prepnout }
}
