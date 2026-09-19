import { useEffect } from 'react'
import { jeAktualneFullscreen, jeFullscreenPodporovan, pozadejOFullscreen } from './useFullscreen'

// ==========================================
// Automatický vstup do celoobrazovkového režimu (viz useFullscreen.ts/
// FullscreenToggle.tsx) — appka se nespoléhá na to, že si uživatel
// sám všimne tlačítka v rohu, ale sama požádá o fullscreen při PRVNÍM
// skutečném gestu (dotyk/klik/klávesa) kdekoli v celé appce.
//
// Fullscreen API to ale nedovolí zavolat samo od sebe hned při
// načtení stránky — prohlížeč bez skutečného gesta uživatele
// požadavek tiše odmítne (bezpečnostní opatření proti stránkám, co by
// jinak fullscreenem "unesly" celou obrazovku bez svolení). Appka
// proto čeká na první pointerdown/keydown v dokumentu a v tom samém
// gestu o fullscreen požádá — přesně stejná "musí běžet uvnitř
// synchronního řetězce gesta" disciplína jako biometrie/notifikace/
// AudioContext.resume() jinde v appce (viz CLAUDE.md).
//
// Protože appka je jedna SPA (React Router, mezi routami žádné
// tvrdé obnovení stránky), stačí o fullscreen požádat JEDNOU za celý
// běh appky — jakmile jednou nastane, appka jím zůstává napříč
// libovolným počtem přechodů mezi moduly (Hub → Social → hry →
// nastavení → miniaplikace…), což je přesně to "každý modul
// automaticky na celou obrazovku", aniž by bylo potřeba volat
// requestFullscreen() zvlášť z každého jednotlivého kliknutí na
// kartu/dlaždici/odkaz kdekoli v appce.
//
// Záměrně se to NEZKOUŠÍ znovu, jakmile uživatel fullscreen sám
// ukončí (klávesa Esc, ruční tlačítko FullscreenToggle, systémové
// gesto) — appka by tím bojovala s jeho vlastním rozhodnutím hned při
// dalším kliknutí, což by působilo nepřátelsky, ne pohodlně. Kdo
// fullscreen vypne, zůstává mimo něj, dokud si ho sám znovu nezapne
// (ručním tlačítkem, které pořád existuje a funguje nezávisle).
//
// Jedna, nevyhnutelná mez: úplně první vykreslení appky (než uživatel
// vůbec cokoli stiskne) proto ještě fullscreen nemá — na to neexistuje
// způsob, jak to obejít, aniž by appka lhala prohlížeči o tom, že jde
// o skutečné gesto. Kdo appku spouští jako nainstalovanou PWA
// (standalone), navíc žádnou lištu prohlížeče vidět nemá vůbec, takže
// tahle mez se ho v praxi ani netýká.
//
// iOS Safari Fullscreen API pro obyčejné DOM prvky vůbec nepodporuje
// (jeFullscreenPodporovan() vrátí false) — appka tam nic nezkouší,
// stejná "feature-detect, appka bez podpory nic nepředstírá"
// disciplína jako u FullscreenToggle.tsx samotného.
// ==========================================

export function useAutoFullscreen(): void {
  useEffect(() => {
    if (!jeFullscreenPodporovan()) return
    if (jeAktualneFullscreen()) return

    const ovladac = new AbortController()
    const zkusitPriGestu = () => {
      ovladac.abort()
      if (!jeAktualneFullscreen()) {
        void pozadejOFullscreen(document.documentElement)
      }
    }
    document.addEventListener('pointerdown', zkusitPriGestu, { signal: ovladac.signal })
    document.addEventListener('keydown', zkusitPriGestu, { signal: ovladac.signal })

    return () => ovladac.abort()
  }, [])
}
