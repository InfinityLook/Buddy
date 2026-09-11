import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DrawingUtils,
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import {
  PRAHY_OPAKOVANI,
  POCATECNI_STAV,
  bodyStrany,
  jePrknoSpravne,
  jeZadaNarovnana,
  krokOpakovani,
  odklonTrupu,
  uhelVeVrcholu,
  vyberViditelnejsiStranu,
} from './poseMath'
import { StavKamery, StavOpakovani, TypCviku, Zpetnavazba } from './types'

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
  start: (zachovatPocitadlo?: boolean) => void
  stop: () => { pocetOpakovani: number; trvaniSekund: number; cvik: TypCviku }
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

export const usePoseEngine = (cvik: TypCviku = 'dřep'): UsePoseEngineResult => {
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
  // Prkno (viz JE_CVIK_NA_CAS v types.ts) se počítá jinak než ostatní tři
  // cviky — vydrzMsRef drží celkový čas ve správné poloze, přičítaný jen
  // v okamžicích, kdy tělo doopravdy je rovné (viz smycka níž).
  // posledniSnimekCasRef drží čas POSLEDNÍHO zpracovaného snímku, aby šlo
  // spočítat, kolik času od něj uplynulo — null znamená "první snímek po
  // startu (nebo po chvíli, kdy appka tělo neviděla)", kdy se nemá
  // přičítat nic, jinak by se do výdrže omylem započítala i mezera.
  const vydrzMsRef = useRef<number>(0)
  const posledniSnimekCasRef = useRef<number | null>(null)
  const deviceIdRef = useRef<string | undefined>(undefined)
  const bezimRef = useRef(false)

  // Cvik se smí měnit jen ve stavu "vypnuto" (viz FormCheck.tsx — výběr
  // se skryje, jakmile kamera běží), ale smycka() ho čte přes ref, ne
  // přímo z argumentu — poslední zvolená hodnota v okamžiku start() je
  // ta, se kterou se pak celé sezení počítá.
  const cvikRef = useRef<TypCviku>(cvik)
  useEffect(() => {
    cvikRef.current = cvik
  }, [cvik])

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
          const cvikNyni = cvikRef.current

          if (cvikNyni === 'prkno') {
            // Prkno se neměří hysterezí nahoře/dole jako ostatní tři
            // cviky — počítá se ČAS strávený v rovné poloze
            // (rameno–bok–kotník blízko 180°, viz jePrknoSpravne).
            const uhelVBoku = uhelVeVrcholu(body[b.rameno], body[b.bok], body[b.kotnik])
            const spravnaPoloha = jePrknoSpravne(uhelVBoku)

            const ted = performance.now()
            const delta = posledniSnimekCasRef.current !== null ? ted - posledniSnimekCasRef.current : 0
            posledniSnimekCasRef.current = ted
            if (spravnaPoloha) vydrzMsRef.current += delta

            const vydrzS = Math.floor(vydrzMsRef.current / 1000)
            if (vydrzS !== stavOpakovaniRef.current.pocet) setPocetOpakovani(vydrzS)
            // faze se u prkna nikde nečte (žádný cyklus nahoře/dole),
            // drží se jen kvůli sdílenému tvaru StavOpakovani.
            stavOpakovaniRef.current = { faze: 'nahore', pocet: vydrzS }

            setZpetnaVazba(spravnaPoloha ? 'v-poradku' : 'narovnej-zada')
          } else {
            // Dřep i výpad počítají úhel v koleně (bok–koleno–kotník),
            // klik úhel v lokti (rameno–loket–zápěstí) — stejná geometrie,
            // jiná trojice bodů; prahy pro všechny tři drží PRAHY_OPAKOVANI
            // v jednom místě (poseMath.ts), ať se nemůžou rozejít.
            const uhel =
              cvikNyni === 'klik'
                ? uhelVeVrcholu(body[b.rameno], body[b.loket], body[b.zapesti])
                : uhelVeVrcholu(body[b.bok], body[b.koleno], body[b.kotnik])
            const prahy = PRAHY_OPAKOVANI[cvikNyni]

            const novyStav = krokOpakovani(stavOpakovaniRef.current, uhel, prahy.dole, prahy.nahore)
            if (novyStav.pocet !== stavOpakovaniRef.current.pocet) setPocetOpakovani(novyStav.pocet)
            stavOpakovaniRef.current = novyStav

            // Zpětná vazba na záda dává smysl u dřepu i výpadu (trup má
            // zůstat vzpřímený u obou) — a jen v dolní fázi, na začátku se
            // každý přirozeně předklání a hlásit to jako chybu by jen
            // mátlo (viz komentář u jeZadaNarovnana). U kliku by
            // odklonTrupu na vodorovně natažené tělo hlásilo "narovnej
            // záda" pořád, i při dokonalé technice — appka radši žádnou
            // zpětnou vazbu než mylnou.
            if ((cvikNyni === 'dřep' || cvikNyni === 'výpad') && novyStav.faze === 'dole') {
              const odklon = odklonTrupu(body[b.rameno], body[b.bok])
              setZpetnaVazba(jeZadaNarovnana(odklon) ? 'v-poradku' : 'narovnej-zada')
            } else {
              setZpetnaVazba(null)
            }
          }
        } else {
          // Tělo zrovna není v záběru vidět — nulovat časovou základnu
          // prkna, ať se po návratu do záběru nezapočítá celá mezera
          // jako by v ní bylo tělo rovné.
          posledniSnimekCasRef.current = null
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

  // `zachovatPocitadlo` je jen pro přepnutí kamery mid-session (viz
  // prepnoutKameru níž) — normální start (tlačítko "Zapnout kameru")
  // vždycky počítadlo i čas začátku vynuluje, jako doteď.
  const start = useCallback((zachovatPocitadlo = false) => {
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

        // Přepnutí kamery mid-session si počítadlo i čas začátku
        // schválně ponechává — jinak by "🔄 Přepnout kameru" uprostřed
        // cvičení potichu smazal už napočítaná opakování, aniž by se
        // cokoliv uložilo (viz komentář u prepnoutKameru).
        if (!zachovatPocitadlo) {
          stavOpakovaniRef.current = POCATECNI_STAV
          setPocetOpakovani(0)
          zacatekRef.current = Date.now()
          vydrzMsRef.current = 0
        }
        // Bez ohledu na zachovatPocitadlo — nový/obnovený stream znamená
        // nový první snímek, ať se časová mezera od PŘED přepnutím kamery
        // nezapočítá do prknovy výdrže.
        posledniSnimekCasRef.current = null
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

    return { pocetOpakovani: stavOpakovaniRef.current.pocet, trvaniSekund, cvik: cvikRef.current }
  }, [])

  const resetovatPocitadlo = useCallback(() => {
    stavOpakovaniRef.current = POCATECNI_STAV
    setPocetOpakovani(0)
    vydrzMsRef.current = 0
    posledniSnimekCasRef.current = null
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
        // true = zachovej napočítaná opakování a čas začátku, mění se
        // jen zdroj obrazu — bez toho by se počítadlo tiše vynulovalo.
        start(true)
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
