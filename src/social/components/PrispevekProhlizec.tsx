import React from 'react'
import { createPortal } from 'react-dom'
import { SocialIcon } from './SocialIcon'
import * as api from '../api'
import type { Prispevek } from '../types'

interface Props {
  prispevek: Prispevek
  /** Smazat smí jen autor — na vlastním profilu appka žádnou jinou
   *  mřížku nikdy nezobrazí, ale VerejnyProfilDialog.tsx (cizí profil)
   *  ukazuje tenhle prohlížeč i nad příspěvky, které přihlášenému
   *  nepatří, takže tlačítko smazání se tu (na rozdíl od dřívější
   *  verze, která žila jen v pages/profil/) musí umět skrýt. */
  jeMoje: boolean
  onZavrit: () => void
  onSmazano: () => void
}

/**
 * Celoobrazovkové zobrazení jednoho příspěvku z mřížky — sdílené mezi
 * appčiným vlastním profilem a cizím profilem tady v Social, stejný
 * "jedna komponenta, ne dvě skoro identické" princip jako u
 * VerejnyProfilDialog.tsx samotného.
 */
export const PrispevekProhlizec: React.FC<Props> = ({ prispevek, jeMoje, onZavrit, onSmazano }) => {
  const smazat = async () => {
    if (!window.confirm('Smazat tenhle příspěvek?')) return
    const vysledek = await api.smazatPrispevek(prispevek.id)
    if (vysledek.ok) onSmazano()
  }

  return createPortal(
    <div className="social-story-prohlizec" role="dialog" aria-modal="true" aria-label="Příspěvek">
      <div className="social-story-prohlizec-hlavicka">
        <span className="social-story-autor-jmeno" />
        {jeMoje && (
          <button className="social-story-akce-btn" onClick={smazat} aria-label="Smazat příspěvek">
            <SocialIcon name="trash" size={18} />
          </button>
        )}
        <button className="social-story-zavrit" onClick={onZavrit} aria-label="Zavřít">
          <SocialIcon name="x" size={22} />
        </button>
      </div>

      <div className="social-story-plocha">
        {prispevek.mediaType === 'video' ? (
          <video src={prispevek.mediaUrl} className="social-story-obrazek" controls playsInline autoPlay />
        ) : (
          <img src={prispevek.mediaUrl} alt="" className="social-story-obrazek" />
        )}
      </div>

      {prispevek.caption && <p className="social-story-popisek">{prispevek.caption}</p>}
    </div>,
    // Portál do document.body — stejný důvod jako u StoryProhlizec.tsx/
    // pages/profil/components/PridatPrispevekDialog.tsx.
    document.body
  )
}
