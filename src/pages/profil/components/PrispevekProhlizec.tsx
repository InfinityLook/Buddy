import React from 'react'
import { createPortal } from 'react-dom'
import { SocialIcon } from '@/social/components/SocialIcon'
import * as socialApi from '@/social/api'
import type { Prispevek } from '@/social/types'

interface Props {
  prispevek: Prispevek
  onZavrit: () => void
  onSmazano: () => void
}

/**
 * Celoobrazovkové zobrazení jednoho příspěvku z mřížky — appka (zatím)
 * umí mřížku jen na vlastním profilu, takže mazání je tu bez podmínky
 * "jsem autor?" jako u social/components/StoryProhlizec.tsx, kde
 * story může patřit i cizímu účtu.
 */
export const PrispevekProhlizec: React.FC<Props> = ({ prispevek, onZavrit, onSmazano }) => {
  const smazat = async () => {
    if (!window.confirm('Smazat tenhle příspěvek?')) return
    const vysledek = await socialApi.smazatPrispevek(prispevek.id)
    if (vysledek.ok) onSmazano()
  }

  return createPortal(
    <div className="social-story-prohlizec" role="dialog" aria-modal="true" aria-label="Příspěvek">
      <div className="social-story-prohlizec-hlavicka">
        <span className="social-story-autor-jmeno" />
        <button className="social-story-akce-btn" onClick={smazat} aria-label="Smazat příspěvek">
          <SocialIcon name="trash" size={18} />
        </button>
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
    // PridatPrispevekDialog.tsx.
    document.body
  )
}
