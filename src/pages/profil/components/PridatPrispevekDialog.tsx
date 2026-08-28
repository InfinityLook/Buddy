import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { SocialIcon } from '@/social/components/SocialIcon'
import * as socialApi from '@/social/api'

interface Props {
  soubor: File
  onZavrit: () => void
  onHotovo: () => void
}

/**
 * Náhled + volitelný popisek před zveřejněním — stejný jednokrokový
 * tvar jako social/components/PridatStoryDialog.tsx (Stories), jen
 * nahrává přes api.nahratPrispevek() a umí navíc video, ne jen fotku —
 * trvalý příspěvek na profilu na rozdíl od story video nabízí.
 */
export const PridatPrispevekDialog: React.FC<Props> = ({ soubor, onZavrit, onHotovo }) => {
  const [nahled, setNahled] = useState<string | null>(null)
  const jeVideo = soubor.type.startsWith('video/')
  const [popisek, setPopisek] = useState('')
  const [odesila, setOdesila] = useState(false)
  const [chyba, setChyba] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(soubor)
    setNahled(url)
    return () => URL.revokeObjectURL(url)
  }, [soubor])

  const zverejnit = async () => {
    setOdesila(true)
    setChyba(null)
    const vysledek = await socialApi.nahratPrispevek(soubor, popisek)
    setOdesila(false)
    if (vysledek.ok) onHotovo()
    else setChyba(vysledek.chyba ?? 'Nepovedlo se to.')
  }

  return createPortal(
    <div className="social-story-dialog" role="dialog" aria-modal="true" aria-label="Nový příspěvek">
      <div className="social-story-dialog-hlavicka">
        <button className="social-story-zavrit" onClick={onZavrit} aria-label="Zavřít">
          <SocialIcon name="x" size={22} />
        </button>
      </div>

      {nahled &&
        (jeVideo ? (
          <video src={nahled} className="social-story-nahled" controls playsInline />
        ) : (
          <img src={nahled} alt="Náhled příspěvku" className="social-story-nahled" />
        ))}

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
        <button className="social-btn" onClick={zverejnit} disabled={odesila}>
          {odesila ? 'Zveřejňuje se…' : 'Zveřejnit'}
        </button>
      </div>
    </div>,
    // Portál do document.body — stejný "vlastní stacking context by
    // fixed vrstvu porazil, ne skryl" důvod jako u StoryProhlizec.tsx.
    document.body
  )
}
