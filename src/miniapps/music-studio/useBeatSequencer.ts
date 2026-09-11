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
 *  patternu na pozadí skladby), stejný hook pro obojí. `onOpakovani`
 *  (volitelné) appka volá pokaždé, když sekvencer dokončí jeden celý
 *  průchod patternem a vrátí se na krok 0 — Skladby's vyvážení
 *  (appka sama zastaví beat po N opakováních) na tuhle jedinou hranu
 *  spoléhá místo počítat kroky zvenku. */
export const useBeatSequencer = (pattern: BeatPattern | null, onOpakovani?: () => void) => {
  const [hraje, setHraje] = useState(false)
  const [aktualniKrok, setAktualniKrok] = useState(-1)

  // Ref, ne jen pattern samotný — plánovací smyčka běží uvnitř
  // setInterval a musí vždycky číst nejčerstvější pattern (uživatel
  // může kliknout na buňku, zatímco to hraje), ne ten, co byl platný
  // v okamžiku spuštění.
  const patternRef = useRef(pattern)
  patternRef.current = pattern

  // Stejný důvod jako patternRef — spustit()'s useCallback má prázdné
  // pole závislostí (interval se nemá znovu zakládat kvůli změně
  // callbacku), takže musí číst přes ref, ne zavřít starou hodnotu.
  const onOpakovaniRef = useRef(onOpakovani)
  onOpakovaniRef.current = onOpakovani

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
      const pocetKroku = p.pocetKroku ?? KROKU_V_PATTERNU
      // 8 kroků = osminové noty (2 na dobu), 16 kroků = šestnáctinové
      // (4 na dobu) — obojí je tak vždycky přesně jeden takt ve 4/4.
      const krokyNaDobu = pocetKroku / 4
      const sekundNaKrok = 60 / p.bpm / krokyNaDobu

      while (dalsiCasRef.current < ctx.currentTime + LOOKAHEAD_S) {
        const krok = dalsiKrokRef.current
        for (const buben of DRUM_SOUNDS) {
          if (p.kroky[buben]?.[krok]) {
            const hlasitost = p.hlasitosti?.[buben] ?? 100
            if (hlasitost > 0) naplanujBuben(ctx, buben, dalsiCasRef.current, hlasitost)
          }
        }

        const zobrazitKrok = krok
        const zpozdeniMs = Math.max(0, (dalsiCasRef.current - ctx.currentTime) * 1000)
        setTimeout(() => setAktualniKrok(zobrazitKrok), zpozdeniMs)

        dalsiCasRef.current += sekundNaKrok
        dalsiKrokRef.current = (krok + 1) % pocetKroku
        if (dalsiKrokRef.current === 0) onOpakovaniRef.current?.()
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
