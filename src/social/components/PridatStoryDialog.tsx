import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { SocialIcon } from './SocialIcon'
import * as api from '../api'

interface Props {
  soubor: File
  onZavrit: () => void
  onHotovo: () => void
}

/**
 * Náhled + volitelný popisek před sdílením — celoobrazovkově, stejný
 * "krátká scéna, ne dialog nad něčím jiným" přístup jako StoryDialog.tsx
 * v herním hubu, jen bez postupujících řádků (tady je jen jeden krok).
 * Nahrání i založení řádku obstará jedno volání (api.pridatStory), appka
 * tu neřeší dvě různé operace.
 */
export const PridatStoryDialog: React.FC<Props> = ({ soubor, onZavrit, onHotovo }) => {
  const [nahled, setNahled] = useState<string | null>(null)
  const [popisek, setPopisek] = useState('')
  const [odesila, setOdesila] = useState(false)
  const [chyba, setChyba] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(soubor)
    setNahled(url)
    return () => URL.revokeObjectURL(url)
  }, [soubor])

  const sdilet = async () => {
    setOdesila(true)
    setChyba(null)
    const vysledek = await api.pridatStory(soubor, popisek)
    setOdesila(false)
    if (vysledek.ok) onHotovo()
    else setChyba(vysledek.chyba ?? 'Nepovedlo se to.')
  }

  return createPortal(
    <div className="social-story-dialog" role="dialog" aria-modal="true" aria-label="Nová story">
      <div className="social-story-dialog-hlavicka">
        <button className="social-story-zavrit" onClick={onZavrit} aria-label="Zavřít">
          <SocialIcon name="x" size={22} />
        </button>
      </div>

      {nahled && <img src={nahled} alt="Náhled story" className="social-story-nahled" />}

      <div className="social-story-dialog-spodek">
        <input
          type="text"
          value={popisek}
          onChange={(e) => setPopisek(e.target.value)}
          placeholder="Popisek (nepovinné)…"
          maxLength={200}
          className="social-story-popisek-input"
          disabled={odesila}
        />
        {chyba && <p className="social-story-chyba">{chyba}</p>}
        <button className="social-btn" onClick={sdilet} disabled={odesila}>
          {odesila ? 'Sdílí se…' : 'Sdílet story'}
        </button>
      </div>
    </div>,
    // Portál do document.body — stejný důvod jako StoryProhlizec.tsx:
    // .social-panel je vlastní stacking context, uvnitř by z-index téhle
    // vrstvy prohrával proti .social-bottom-nav, ne že by nad ním ležel.
    document.body
  )
}
