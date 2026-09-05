import { useCallback, useEffect, useRef, useState } from 'react'
import { naplanujBuben, ziskejKontext } from './audioEngine'
import { DRUM_SOUNDS, KROKU_V_PATTERNU, type BeatPattern } from './types'

// Jak daleko dopředu appka naplánuje noty (sekundy) a jak často se na
// to podívá (ms) — klasický "look-ahead scheduler" vzor pro Web Audio
// (setInterval sám o sobě je nepřesný, ale plánování skutečného zvuku
// přes AudioContext.currentTime přesné je; interval jen včas doplňuje
// frontu). Bez tohohle by krokový sekvencer trhal tempo podle toho,
// kdy se prohlížeči zrovna zachce spustit setTimeout.
const LOOKAHEAD_S = 0.1
const INTERVAL_MS = 25

/** Krokový sekvencer jednoho BeatPatternu — appka ho volá z Beat Makeru
 *  (živé přehrávání rozehrané mřížky) i ze Skladeb (přehrání uloženého
 *  patternu na pozadí skladby), stejný hook pro obojí. */
export const useBeatSequencer = (pattern: BeatPattern | null) => {
  const [hraje, setHraje] = useState(false)
  const [aktualniKrok, setAktualniKrok] = useState(-1)

  // Ref, ne jen pattern samotný — plánovací smyčka běží uvnitř
  // setInterval a musí vždycky číst nejčerstvější pattern (uživatel
  // může kliknout na buňku, zatímco to hraje), ne ten, co byl platný
  // v okamžiku spuštění.
  const patternRef = useRef(pattern)
  patternRef.current = pattern

  const dalsiKrokRef = useRef(0)
  const dalsiCasRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const zastavit = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setHraje(false)
    setAktualniKrok(-1)
  }, [])

  const spustit = useCallback(() => {
    if (!patternRef.current || intervalRef.current !== null) return
    const ctx = ziskejKontext()
    dalsiKrokRef.current = 0
    dalsiCasRef.current = ctx.currentTime + 0.05

    intervalRef.current = setInterval(() => {
      const p = patternRef.current
      if (!p) return
      const sekundNaKrok = 60 / p.bpm / 2 // osminové noty (2 kroky na dobu)

      while (dalsiCasRef.current < ctx.currentTime + LOOKAHEAD_S) {
        const krok = dalsiKrokRef.current
        for (const buben of DRUM_SOUNDS) {
          if (p.kroky[buben][krok]) naplanujBuben(ctx, buben, dalsiCasRef.current)
        }

        const zobrazitKrok = krok
        const zpozdeniMs = Math.max(0, (dalsiCasRef.current - ctx.currentTime) * 1000)
        setTimeout(() => setAktualniKrok(zobrazitKrok), zpozdeniMs)

        dalsiCasRef.current += sekundNaKrok
        dalsiKrokRef.current = (krok + 1) % KROKU_V_PATTERNU
      }
    }, INTERVAL_MS)

    setHraje(true)
  }, [])

  // Úklid při odmontování — nesmí zůstat běžet interval po zavření
  // Beat Makeru/Skladeb, stejná "ukliď za sebou" disciplína jako
  // usePoseEngine.ts's kamera nebo TajnyChatView.tsx's mikrofon.
  useEffect(() => () => zastavit(), [zastavit])

  return { hraje, aktualniKrok, spustit, zastavit }
}
