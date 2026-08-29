import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { SocialIcon } from '@/social/components/SocialIcon'
import * as socialApi from '@/social/api'

interface Props {
  /** Jedna položka = obyčejný příspěvek jako dřív, víc = karusel
   *  (viz api.ts's nahratPrispevek — první jde do posts.media_path,
   *  zbytek do post_media). */
  soubory: File[]
  onZavrit: () => void
  onHotovo: () => void
}

/**
 * Náhled + volitelný popisek před zveřejněním — stejný jednokrokový
 * tvar jako social/components/PridatStoryDialog.tsx (Stories), jen
 * nahrává přes api.nahratPrispevek() a umí navíc video i karusel víc
 * položek najednou, ne jen jednu fotku.
 */
export const PridatPrispevekDialog: React.FC<Props> = ({ soubory, onZavrit, onHotovo }) => {
  const [nahledy, setNahledy] = useState<string[]>([])
  const [popisek, setPopisek] = useState('')
  const [odesila, setOdesila] = useState(false)
  const [chyba, setChyba] = useState<string | null>(null)

  useEffect(() => {
    const url = soubory.map((s) => URL.createObjectURL(s))
    setNahledy(url)
    return () => url.forEach((u) => URL.revokeObjectURL(u))
  }, [soubory])

  const zverejnit = async () => {
    setOdesila(true)
    setChyba(null)
    const vysledek = await socialApi.nahratPrispevek(soubory, popisek)
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

      {soubory.length > 1 ? (
        // Karusel — horizontální posuvný pruh náhledů, stejné
        // scroll-snap chování jako appka už používá jinde (např.
        // TvorbaPostavy.css's karty), ne stavěné znova od nuly.
        <div className="social-prispevek-karusel-nahledy">
          {soubory.map((s, i) => (
            <div key={i} className="social-prispevek-karusel-polozka">
              {s.type.startsWith('video/') ? (
                <video src={nahledy[i]} muted playsInline />
              ) : (
                <img src={nahledy[i]} alt="" />
              )}
            </div>
          ))}
        </div>
      ) : (
        nahledy[0] &&
        (soubory[0].type.startsWith('video/') ? (
          <video src={nahledy[0]} className="social-story-nahled" controls playsInline />
        ) : (
          <img src={nahledy[0]} alt="Náhled příspěvku" className="social-story-nahled" />
        ))
      )}

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
