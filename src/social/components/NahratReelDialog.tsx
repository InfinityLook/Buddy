import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SocialIcon } from './SocialIcon'
import { MAX_REEL_TRVANI_S } from '../api'

interface Props {
  /** Natočené video appka jen předá dál — samotné nahrání/popisek/
   *  zveřejnění pak řeší ten samý PridatPrispevekDialog.tsx, který
   *  používá i výběr existujícího souboru, appka nestaví druhou
   *  kopii "náhled + popisek + zveřejnit" jen pro tuhle cestu. */
  onNatoceno: (soubor: File) => void
  onZavrit: () => void
}

// Feature-detekce jednou při načtení modulu — appka vstupní bod
// "Nahrát Reel" vůbec nenabídne bez MediaRecorder/getUserMedia (viz
// volající v ProfilSocialniSekce.tsx), stejný "radši schovej, než
// nabídni něco nefunkčního" přístup jako ChatView.tsx's
// PODPORUJE_NAHRAVANI_HLASU / SkenovatKodDialog.tsx's BarcodeDetector.
export const PODPORUJE_NAHRAVANI_REELU =
  typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

const formatCas = (s: number): string => {
  const cele = Math.max(0, Math.round(s))
  return `${Math.floor(cele / 60)}:${String(cele % 60).padStart(2, '0')}`
}

type Faze = 'priprava' | 'natacim' | 'nahled' | 'chyba'

/**
 * Natočení krátkého videa přímo v appce (přední kamera + mikrofon),
 * ne jen výběr už existujícího souboru z galerie — druhá, rovnocenná
 * cesta k příspěvku vedle PridatPrispevekDialog.tsx's souborového
 * vstupu (ProfilSocialniSekce.tsx nabízí obě dlaždice vedle sebe).
 * Kamera + MediaRecorder žije přímo v komponentě, stejná disciplína
 * jako SkenovatKodDialog.tsx (žádný vlastní hook jako usePoseEngine.ts —
 * o dost jednodušší, žádný ML model): úklid při odchodu (i uprostřed
 * natáčení) vždycky zastaví stream, ať kamera/mikrofon neběží dál na
 * pozadí.
 *
 * Automatické zastavení po MAX_REEL_TRVANI_S dělá z každého videa
 * krátkou formu už při vzniku — appka žádnou další, oddělenou hranici
 * "Reel vs. video příspěvek" nezavádí (viz api.ts's komentář u
 * MAX_REEL_TRVANI_S); stejný strop appka vynucuje i pro video vybrané
 * ze zařízení (nahratMediumPrispevku v api.ts), tahle cesta ho jen
 * navíc hlídá přímo při natáčení, ne až po nahrání.
 */
export const NahratReelDialog: React.FC<Props> = ({ onNatoceno, onZavrit }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunkyRef = useRef<Blob[]>([])
  const intervalRef = useRef<number | null>(null)
  const natoceneUrlRef = useRef<string | null>(null)

  const [faze, setFaze] = useState<Faze>('priprava')
  const [casS, setCasS] = useState(0)
  const [natoceny, setNatoceny] = useState<{ soubor: File; url: string } | null>(null)

  const zastavitStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const ukoncitNatoceni = () => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    if (intervalRef.current) window.clearInterval(intervalRef.current)
    intervalRef.current = null

    recorder.onstop = () => {
      zastavitStream()
      const kusy = chunkyRef.current
      chunkyRef.current = []
      if (kusy.length === 0) {
        setFaze('chyba')
        return
      }
      const blob = new Blob(kusy, { type: recorder.mimeType || 'video/webm' })
      const pripona = recorder.mimeType?.includes('mp4') ? 'mp4' : 'webm'
      const soubor = new File([blob], `reel-${Date.now()}.${pripona}`, { type: blob.type })
      const url = URL.createObjectURL(blob)
      natoceneUrlRef.current = url
      setNatoceny({ soubor, url })
      setFaze('nahled')
    }

    recorder.stop()
  }

  // Vytáhnuté z prvního useEffectu, ať se dá zavolat znovu i z "Znovu
  // natočit" — natáčení podruhé potřebuje nový getUserMedia (starý
  // stream se po zastavení natáčení zase pustil, appka kameru
  // neběžící na pozadí nedrží jen pro případ, že by se hodila znovu).
  const zacitNatoceni = async (zrusenoRef: { zruseno: boolean }) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      })
      if (zrusenoRef.zruseno) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const typ = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ].find((t) => MediaRecorder.isTypeSupported(t))
      const recorder = new MediaRecorder(stream, typ ? { mimeType: typ } : undefined)
      chunkyRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunkyRef.current.push(e.data)
      }
      recorderRef.current = recorder
      recorder.start()

      setFaze('natacim')
      setCasS(0)
      intervalRef.current = window.setInterval(() => {
        setCasS((s) => {
          const dalsi = s + 1
          // Automatické zastavení na stropu, ne jen vizuální varování —
          // appka natáčení samo ukončí, uživatel nemusí hlídat čas sám.
          if (dalsi >= MAX_REEL_TRVANI_S) ukoncitNatoceni()
          return dalsi
        })
      }, 1000)
    } catch {
      if (!zrusenoRef.zruseno) setFaze('chyba')
    }
  }

  useEffect(() => {
    const zrusenoRef = { zruseno: false }
    void zacitNatoceni(zrusenoRef)

    return () => {
      zrusenoRef.zruseno = true
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      zastavitStream()
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.onstop = null
        recorderRef.current.stop()
      }
      if (natoceneUrlRef.current) URL.revokeObjectURL(natoceneUrlRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const znovuNatocit = () => {
    if (natoceny) URL.revokeObjectURL(natoceny.url)
    natoceneUrlRef.current = null
    setNatoceny(null)
    setFaze('priprava')
    void zacitNatoceni({ zruseno: false })
  }

  return createPortal(
    <div className="social-story-dialog" role="dialog" aria-modal="true" aria-label="Nahrát Reel">
      <div className="social-story-dialog-hlavicka">
        <button className="social-story-zavrit" onClick={onZavrit} aria-label="Zavřít">
          <SocialIcon name="x" size={22} />
        </button>
      </div>

      {faze === 'chyba' ? (
        <div className="social-reel-chyba">
          <p className="social-dialog-sub">
            Kameru/mikrofon se nepovedlo získat. Zkontroluj oprávnění a zkus to znovu.
          </p>
        </div>
      ) : faze === 'nahled' && natoceny ? (
        <video src={natoceny.url} className="social-story-nahled" controls playsInline autoPlay loop />
      ) : (
        <div className="social-reel-kamera-obal">
          <video ref={videoRef} className="social-reel-kamera" muted playsInline />
          {faze === 'natacim' && (
            <div className="social-reel-nahravani-znacka" aria-hidden="true">
              <span className="social-nahravani-tecka" />
              <span>{formatCas(casS)} / {formatCas(MAX_REEL_TRVANI_S)}</span>
            </div>
          )}
        </div>
      )}

      <div className="social-story-dialog-spodek">
        {faze === 'natacim' && (
          <button className="social-btn" onClick={ukoncitNatoceni}>
            <SocialIcon name="check" size={16} /> Zastavit natáčení
          </button>
        )}
        {faze === 'nahled' && natoceny && (
          <div className="social-reel-nahled-akce">
            <button className="social-btn social-btn--tlumene" onClick={znovuNatocit}>
              Znovu natočit
            </button>
            <button className="social-btn" onClick={() => onNatoceno(natoceny.soubor)}>
              Použít
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
