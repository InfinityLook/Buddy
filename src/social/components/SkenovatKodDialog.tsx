import React, { useEffect, useRef, useState } from 'react'
import { SocialIcon } from './SocialIcon'
import * as api from '../api'
import type { SocialStav } from '../useSocial'

interface Props {
  stav: SocialStav
  onOtevritProfil: (userId: string) => void
  onZavrit: () => void
}

// Odkaz sdílený přes profilOdkaz() vypadá jako ".../social?kod=ABCD1234" —
// z naskenovaného textu se vytáhne buď ten parametr, nebo (starší QR/kód
// nadiktovaný napřímo) rovnou surový kód, ať appka umí obojí.
const kodZTextu = (text: string): string => {
  try {
    const url = new URL(text)
    return url.searchParams.get('kod') ?? text
  } catch {
    return text
  }
}

// ==========================================
// Přidání přítele naskenováním QR/kódu z jeho profilu — párovací cesta
// navíc vedle hledání podle jména (PratelePanel.tsx), ne jeho náhrada.
// Stejný "zjisti podporu, nabídni typovaný fallback" vzor jako Buddyho
// hlasové rozhraní pro iOS Safari (src/buddy/BuddyOverlay.tsx): appka
// nikoho s nepodporovaným prohlížečem/bez kamery nenechá bez cesty
// dovnitř, jen mu chybí ta rychlejší.
//
// Kamera + detekční smyčka žije v tomhle komponentu přímo (ne ve
// vlastním hooku jako usePoseEngine.ts) — je o dost jednodušší (žádný
// ML model, žádné landmarky), ale úklid při odchodu platí stejně:
// zastavit stream, jinak by kamera běžela na pozadí dál.
// ==========================================

export const SkenovatKodDialog: React.FC<Props> = ({ stav, onOtevritProfil, onZavrit }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detekceRef = useRef<number | null>(null)
  const zpracovavaRef = useRef(false)

  const [podporovano, setPodporovano] = useState<boolean | null>(null)
  const [chybaKamery, setChybaKamery] = useState(false)
  const [rucneKod, setRucneKod] = useState('')
  const [hleda, setHleda] = useState(false)

  const zpracujKod = async (surovy: string) => {
    if (zpracovavaRef.current) return
    zpracovavaRef.current = true
    setHleda(true)

    const nalez = await api.najdiPodleKodu(kodZTextu(surovy))
    setHleda(false)

    if (nalez.stav === 'nalezen') {
      onOtevritProfil(nalez.profil.id)
      onZavrit()
      return
    }

    stav.rekni(
      nalez.stav === 'vlastni'
        ? 'To je tvůj vlastní kód.'
        : nalez.stav === 'chyba'
          ? (nalez.chyba ?? 'Nepovedlo se to.')
          : 'Takový kód nikomu nepatří.'
    )
    zpracovavaRef.current = false
  }

  useEffect(() => {
    if (!window.BarcodeDetector) {
      setPodporovano(false)
      return
    }
    setPodporovano(true)

    let zruseno = false

    const spustit = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (zruseno) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        const detektor = new window.BarcodeDetector!({ formats: ['qr_code'] })
        detekceRef.current = window.setInterval(async () => {
          if (!videoRef.current || zpracovavaRef.current) return
          try {
            const vysledky = await detektor.detect(videoRef.current)
            if (vysledky[0]) void zpracujKod(vysledky[0].rawValue)
          } catch {
            // Snímek se nepovedlo přečíst — příští tik to zkusí znovu,
            // nemá cenu appku kvůli jednomu výpadku shazovat.
          }
        }, 400)
      } catch {
        setChybaKamery(true)
      }
    }

    void spustit()

    return () => {
      zruseno = true
      if (detekceRef.current) window.clearInterval(detekceRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const odeslatRucne = async (e: React.FormEvent) => {
    e.preventDefault()
    if (api.ocistiKod(rucneKod).length !== 8 || hleda) return
    await zpracujKod(rucneKod)
  }

  return (
    <>
      <div className="social-overlay" onClick={onZavrit} />
      <div className="social-dialog">
        <h3 className="social-dialog-title">Naskenovat kód</h3>

        {podporovano && !chybaKamery && (
          <div className="social-sken-video-obal">
            <video ref={videoRef} className="social-sken-video" muted playsInline />
            <span className="social-sken-ramecek" aria-hidden="true" />
          </div>
        )}

        {podporovano === false && (
          <p className="social-dialog-sub">
            Tenhle prohlížeč skenování nepodporuje — zadej kód ručně.
          </p>
        )}
        {chybaKamery && (
          <p className="social-dialog-sub">
            Kamera není dostupná — zadej kód ručně.
          </p>
        )}

        <form className="social-add-row" onSubmit={odeslatRucne}>
          <input
            className="social-input"
            placeholder="Nebo napiš kód ručně…"
            value={rucneKod}
            maxLength={9}
            onChange={(e) => setRucneKod(e.target.value)}
          />
          <button className="social-btn" type="submit" disabled={hleda || api.ocistiKod(rucneKod).length !== 8}>
            {hleda ? '…' : 'Najít'}
          </button>
        </form>

        <div className="social-dialog-akce">
          <button className="social-btn social-btn--tlumene" onClick={onZavrit}>
            <SocialIcon name="x" size={14} />
            Zavřít
          </button>
        </div>
      </div>
    </>
  )
}
