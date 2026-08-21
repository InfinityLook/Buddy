import React from 'react'
import { Postava } from '../types'
import './PostavaKarta.css'

interface Props {
  postava: Postava
  vybrana: boolean
  onClick: () => void
  /** Když je zadané, karta dostane tlačítko smazání navíc. */
  onSmazat?: () => void
}

// ==========================================
// Sdílená karta postavy — používá ji jak tvorba nové postavy
// (TvorbaPostavy), tak výběr, za koho tuhle hru hrát (VyberPostavy).
// Tlačítko smazání je schválně SOUROZENEC vybíratelného tlačítka, ne
// vnořené uvnitř něj — vnořené tlačítko v tlačítku je neplatné HTML
// a láme se s ním čtečky obrazovky i klávesnicová navigace.
// ==========================================

export const PostavaKarta: React.FC<Props> = ({ postava, vybrana, onClick, onSmazat }) => {
  return (
    <div className="postava-karta-wrap">
      <button
        className={`postava-karta ${vybrana ? 'is-vybrana' : ''}`}
        style={{ '--tp-barva': postava.barva } as React.CSSProperties}
        onClick={onClick}
      >
        <span className="postava-karta-hlavicka">
          <span className="postava-karta-ikona" aria-hidden="true">
            {postava.ikona}
          </span>
          <span className="postava-karta-jmenovka">
            <span className="postava-karta-jmeno">{postava.jmeno}</span>
            <span className="postava-karta-popis">{postava.popis}</span>
          </span>
        </span>

        <span className="postava-bonusy">
          {postava.bonusy.map((b) => (
            <span key={b} className="postava-bonus">
              <span className="postava-bonus-znak" aria-hidden="true">✓</span>
              {b}
            </span>
          ))}
          {postava.nevyhoda && (
            <span className="postava-nevyhoda">
              <span aria-hidden="true">⚠️</span>
              {postava.nevyhoda}
            </span>
          )}
        </span>

        {vybrana && (
          <span className="postava-znacka" aria-hidden="true">
            ✓
          </span>
        )}
      </button>

      {onSmazat && (
        <button className="postava-karta-smazat" aria-label={`Smazat postavu ${postava.jmeno}`} onClick={onSmazat}>
          🗑️
        </button>
      )}
    </div>
  )
}
