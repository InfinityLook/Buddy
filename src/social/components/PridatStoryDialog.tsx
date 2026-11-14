import type { SurfaceId } from '@/features/appearance/themeCatalog'
import React, { useEffect, useState } from 'react'
import { CommunityDialog } from './CommunityDialog'
import * as api from '../api'

interface Props {
  surfaceId?: SurfaceId
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
export const PridatStoryDialog: React.FC<Props> = ({ surfaceId = 'feed', soubor, onZavrit, onHotovo }) => {
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

  return (
    <CommunityDialog title="Nová story" surfaceId={surfaceId} onClose={onZavrit} fullscreen>
      <div className="social-story-dialog community-media-view">

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
          {chyba && <p className="social-story-chyba" role="alert">{chyba}</p>}
          <button className="social-btn" onClick={sdilet} disabled={odesila}>
            {odesila ? 'Sdílí se…' : 'Sdílet story'}
          </button>
        </div>
      </div>
    </CommunityDialog>
  )
}
