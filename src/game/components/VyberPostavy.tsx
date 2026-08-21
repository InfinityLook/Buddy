import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Postava, PostavaId } from '../types'
import { PostavaKarta } from './PostavaKarta'
import './VyberPostavy.css'

interface Props {
  /** Postavy hráčovy party, v pořadí vytvoření. */
  postavy: Postava[]
  mozneVytvoritDalsi: boolean
  onZvolit: (id: PostavaId) => void
  onSmazat: (id: PostavaId) => void
  onPridatDalsi: () => void
}

// ==========================================
// Obrazovka mezi Hubem a mapou, když už hráč má aspoň jednu postavu.
// Na rozdíl od dřívějšího "vyber jednou a appka se už neptá" se teď
// ptá při KAŽDÉM vstupu do /hra — volba, za koho se hraje, žije jen
// jako React state v GameModule.tsx po dobu jedné návštěvy, nikam se
// neukládá. Smazání postavy nebere žádný postup (XP, kredity, odznaky
// jsou sdílené přes core/store, ne vázané na konkrétní postavu).
// ==========================================

export const VyberPostavy: React.FC<Props> = ({ postavy, mozneVytvoritDalsi, onZvolit, onSmazat, onPridatDalsi }) => {
  const navigate = useNavigate()
  const [vybrana, setVybrana] = useState<PostavaId | null>(null)

  const detail = postavy.find((p) => p.id === vybrana) ?? null

  const smazat = (p: Postava) => {
    if (!window.confirm(`Smazat postavu ${p.jmeno}? O nic nepřijdeš — jen ji budeš muset případně vytvořit znovu.`)) {
      return
    }
    if (vybrana === p.id) setVybrana(null)
    onSmazat(p.id)
  }

  return (
    <div className="vyber-postavy">
      <div className="vp-top-bar">
        <button className="game-back-btn" onClick={() => navigate('/hub')}>
          ← Zpět do Hubu
        </button>
        <h1 className="vp-title">Za koho hraješ?</h1>
        <p className="vp-hint">Vyber si postavu z party — příště můžeš klidně vzít jinou.</p>
      </div>

      <div className="vp-mrizka">
        {postavy.map((p) => (
          <PostavaKarta
            key={p.id}
            postava={p}
            vybrana={vybrana === p.id}
            onClick={() => setVybrana(p.id)}
            onSmazat={() => smazat(p)}
          />
        ))}

        {mozneVytvoritDalsi && (
          <button className="vp-pridat" onClick={onPridatDalsi}>
            <span className="vp-pridat-ikona" aria-hidden="true">+</span>
            Přidat další postavu
          </button>
        )}
      </div>

      <div className="vp-akce">
        <button
          className={`vp-hrat ${detail ? 'vp-hrat--zvolena' : ''}`}
          style={detail ? ({ '--tp-barva': detail.barva } as React.CSSProperties) : undefined}
          disabled={!detail}
          onClick={() => detail && onZvolit(detail.id)}
        >
          {detail ? `Hrát jako ${detail.jmeno}` : 'Vyber postavu'}
        </button>
      </div>
    </div>
  )
}
