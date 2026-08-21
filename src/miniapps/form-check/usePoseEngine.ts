import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DrawingUtils,
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import {
  POCATECNI_STAV,
  bodyStrany,
  jeZadaNarovnana,
  krokOpakovani,
  odklonTrupu,
  uhelVeVrcholu,
  vyberViditelnejsiStranu,
} from './poseMath'
import { StavKamery, StavOpakovani, Zpetnavazba } from './types'

// ==========================================
// Životní cyklus kamery a rozpoznávání pozice.
//
// Stejný princip jako u 3D scény v pozadí Socialu (social/scene/
// useAmbientScene.ts): kamera, video element a MediaPipe žijí mimo
// React a kreslí se ve vlastní smyčce přes requestAnimationFrame.
// React dostává jen to, co se
// má vykreslit jako UI (počet opakování, stav, zpětná vazba) — kdyby
// každý snímek pozice vyvolával re-render celé komponenty, běželo by to
// na telefonu trhaně.
// ==========================================

// Soubory jedou z vlastní domény, ne z Googlu — viz komentář u
// globIgnores v vite.config.ts. Model ani WASM runtime nejsou
// v předcache: stáhnou se až tady, při prvním spuštění.
// public/mediapipe/wasm/ obsahuje jen "vision_wasm_internal.*" (SIMD) a
// "vision_wasm_nosimd_internal.*" (záloha pro starší prohlížeče bez
// SIMD) — balíček nabízí ještě třetí dvojici, "vision_wasm_module_
// internal.*", jenže tu FilesetResolver nikdy nežádá (ověřeno sledováním
// síťových požadavků), takže by ležela v repozitáři zbytečně (~12 MB).
const WASM_CESTA = '/mediapipe/wasm'
const MODEL_CESTA = '/mediapipe/models/pose_landmarker_lite.task'

interface UsePoseEngineResult {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  stav: StavKamery
  chyba: string | null
  pocetOpakovani: number
  zpetnaVazba: Zpetnavazba
  vidimTe: boolean
  pocetKamer: number
  start: () => void
  stop: () => { pocetOpakovani: number; trvaniSekund: number }
  resetovatPocitadlo: () => void
  prepnoutKameru: () => void
}

const CHYBY_KAMERY: Record<string, string> = {
  NotAllowedError: 'Přístup ke kameře je zakázaný. Povol ho v nastavení prohlížeče a zkus to znovu.',
  NotFoundError: 'Žádnou kameru se nepodařilo najít.',
  NotReadableError: 'Kamera je obsazená jinou aplikací.',
  OverconstrainedError: 'Kameru se nepodařilo nastavit v požadovaném rozlišení.',
  SecurityError: 'Kamera je dostupná jen přes zabezpečené připojení (HTTPS).',
}

const popisChybyKamery = (err: unknown): string => {
  if (err instanceof DOMException && CHYBY_KAMERY[err.name]) return CHYBY_KAMERY[err.name]
  return 'Kameru se nepodařilo spustit.'
}

export const usePoseEngine = (): UsePoseEngineResult => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [stav, setStav] = useState<StavKamery>('vypnuto')
  const [chyba, setChyba] = useState<string | null>(null)
  const [pocetOpakovani, setPocetOpakovani] = useState(0)
  const [zpetnaVazba, setZpetnaVazba] = useState<Zpetnavazba>(null)
  const [vidimTe, setVidimTe] = useState(false)
  const [pocetKamer, setPocetKamer] = useState(1)

  // Věci, co nesmí vyvolat re-render při každé změně (běží 30–60× za
  // vteřinu), žijí v refech, ne ve stavu.
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const rafRef = useRef<number | null>(null)
  const drawingRef = useRef<DrawingUtils | null>(null)
  const stavOpakovaniRef = useRef<StavOpakovani>(POCATECNI_STAV)
  const zacatekRef = useRef<number>(0)
  const deviceIdRef = useRef<string | undefined>(undefined)
  const bezimRef = useRef(false)

  const zastavitStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  // Hlavní smyčka. Jeden běh detekce na snímek, kresba kostry přes
  // DrawingUtils (dodává balíček sám, není potřeba vlastní SVG).
  const smycka = useCallback(() => {
    if (!bezimRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const landmarker = landmarkerRef.current

    if (video && canvas && landmarker && video.readyState >= 2) {
      const vysledek = landmarker.detectForVideo(video, performance.now())
      const ctx = canvas.getContext('2d')
      const body = vysledek.landmarks[0] as NormalizedLandmark[] | undefined

      if (ctx) {
        ctx.save()
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (body) {
          if (!drawingRef.current) drawingRef.current = new DrawingUtils(ctx)
          drawingRef.current.drawConnectors(body, PoseLandmarker.POSE_CONNECTIONS, {
            color: 'rgba(53, 196, 240, 0.8)',
            lineWidth: 3,
          })
          drawingRef.current.drawLandmarks(body, { color: '#8a5cf6', radius: 4 })

          const strana = vyberViditelnejsiStranu(body)
          const b = bodyStrany(strana)
          const uhelKolena = uhelVeVrcholu(body[b.bok], body[b.koleno], body[b.kotnik])

          const novyStav = krokOpakovani(stavOpakovaniRef.current, uhelKolena)
          if (novyStav.pocet !== stavOpakovaniRef.current.pocet) setPocetOpakovani(novyStav.pocet)
          stavOpakovaniRef.current = novyStav

          // Zpětná vazba na záda dává smysl jen v dolní fázi — na
          // začátku dřepu se každý přirozeně předklání a hlásit to jako
          // chybu by jen mátlo (viz komentář u jeZadaNarovnana).
          if (novyStav.faze === 'dole') {
            const odklon = odklonTrupu(body[b.rameno], body[b.bok])
            setZpetnaVazba(jeZadaNarovnana(odklon) ? 'v-poradku' : 'narovnej-zada')
          } else {
            setZpetnaVazba(null)
          }
        }

        ctx.restore()
        setVidimTe((prev) => (prev !== !!body ? !!body : prev))
      }
    }

    rafRef.current = requestAnimationFrame(smycka)
  }, [])

  const zajistitLandmarker = async (): Promise<PoseLandmarker> => {
    if (landmarkerRef.current) return landmarkerRef.current

    const fileset = await FilesetResolver.forVisionTasks(WASM_CESTA)

    // GPU delegát je rychlejší, ale ne všude dostupný (starší telefony,
    // některé WebView bez WebGL2) — bez záložního CPU běhu by na nich
    // appka jen spadla místo aby jela pomaleji.
    try {
      const landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_CESTA, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
      landmarkerRef.current = landmarker
      return landmarker
    } catch {
      const landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_CESTA, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
      landmarkerRef.current = landmarker
      return landmarker
    }
  }

  const start = useCallback(() => {
    setStav('nacita-se')
    setChyba(null)

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: deviceIdRef.current ? { exact: deviceIdRef.current } : undefined,
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: deviceIdRef.current ? undefined : 'user',
          },
          audio: false,
        })

        streamRef.current = stream
        const video = videoRef.current
        if (!video) throw new Error('Video element není připravené.')

        video.srcObject = stream
        await video.play()
        await new Promise<void>((resolve) => {
          if (video.readyState >= 2) return resolve()
          video.onloadedmetadata = () => resolve()
        })

        const canvas = canvasRef.current
        if (canvas) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }

        // Kamer je dostupných víc, jen když se to zjistí PO povolení
        // přístupu — prohlížeč do té doby ukazuje jedno anonymní zařízení
        // bez ohledu na to, kolik jich telefon doopravdy má.
        const zarizeni = await navigator.mediaDevices.enumerateDevices()
        setPocetKamer(zarizeni.filter((d) => d.kind === 'videoinput').length || 1)

        await zajistitLandmarker()

        stavOpakovaniRef.current = POCATECNI_STAV
        setPocetOpakovani(0)
        zacatekRef.current = Date.now()
        bezimRef.current = true
        setStav('bezi')
        rafRef.current = requestAnimationFrame(smycka)
      } catch (err) {
        zastavitStream()
        setChyba(popisChybyKamery(err))
        setStav('chyba')
      }
    })()
  }, [smycka])

  const stop = useCallback(() => {
    bezimRef.current = false
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    zastavitStream()

    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)

    const trvaniSekund = zacatekRef.current ? Math.round((Date.now() - zacatekRef.current) / 1000) : 0
    setStav('vypnuto')
    setVidimTe(false)
    setZpetnaVazba(null)

    return { pocetOpakovani: stavOpakovaniRef.current.pocet, trvaniSekund }
  }, [])

  const resetovatPocitadlo = useCallback(() => {
    stavOpakovaniRef.current = POCATECNI_STAV
    setPocetOpakovani(0)
  }, [])

  const prepnoutKameru = useCallback(() => {
    void (async () => {
      const zarizeni = (await navigator.mediaDevices.enumerateDevices()).filter(
        (d) => d.kind === 'videoinput'
      )
      if (zarizeni.length < 2) return

      const aktualniIndex = zarizeni.findIndex((d) => d.deviceId === deviceIdRef.current)
      const dalsi = zarizeni[(aktualniIndex + 1) % zarizeni.length]
      deviceIdRef.current = dalsi.deviceId

      if (bezimRef.current) {
        stop()
        start()
      }
    })()
  }, [start, stop])

  // Úklid při odchodu z miniaplikace — bez tohohle by kamera na pozadí
  // dál svítila a rozpoznávač zůstal v paměti, přesně past popsaná
  // u Three.js scény v Game hubu.
  useEffect(() => {
    return () => {
      bezimRef.current = false
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      zastavitStream()
      landmarkerRef.current?.close()
      landmarkerRef.current = null
    }
  }, [])

  return {
    videoRef,
    canvasRef,
    stav,
    chyba,
    pocetOpakovani,
    zpetnaVazba,
    vidimTe,
    pocetKamer,
    start,
    stop,
    resetovatPocitadlo,
    prepnoutKameru,
  }
}
