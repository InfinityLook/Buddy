import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { POSTAVY } from '../postavy'
import { useGameCharacter } from '../useGameCharacter'
import { PostavaId } from '../types'
import './TvorbaPostavy.css'

// ==========================================
// Výběr postavy před vstupem do světa. Karetní/soubojový systém se
// bonusy postav skutečně opírá o postavy.ts (viz combat/), tady se jen
// zobrazují jako popisky karty.
//
// Výběr je dvoukrokový schválně: klepnutí kartu jen zvýrazní, teprve
// tlačítko dole ji potvrdí. Bez toho by nepozorné klepnutí rovnou
// zavřelo výběr bez šance si to rozmyslet.
// ==========================================

export const TvorbaPostavy: React.FC = () => {
  const navigate = useNavigate()
  const zvolitPostavu = useGameCharacter((s) => s.zvolit)
  const [vybrana, setVybrana] = useState<PostavaId | null>(null)

  const detail = POSTAVY.find((p) => p.id === vybrana) ?? null

  return (
    <div className="tvorba-postavy">
      <div className="tp-top-bar">
        <button className="game-back-btn" onClick={() => navigate('/hub')}>
          ← Zpět do Hubu
        </button>
        <h1 className="tp-title">Vyber si postavu</h1>
        <p className="tp-hint">Volba je natrvalo — vyber podle stylu hry, který tě baví.</p>
      </div>

      <div className="tp-mrizka">
        {POSTAVY.map((p) => (
          <button
            key={p.id}
            className={`tp-karta ${vybrana === p.id ? 'is-vybrana' : ''}`}
            style={{ '--tp-barva': p.barva } as React.CSSProperties}
            onClick={() => setVybrana(p.id)}
          >
            <span className="tp-karta-hlavicka">
              <span className="tp-karta-ikona" aria-hidden="true">
                {p.ikona}
              </span>
              <span className="tp-karta-jmenovka">
                <span className="tp-karta-jmeno">{p.jmeno}</span>
                <span className="tp-karta-popis">{p.popis}</span>
              </span>
            </span>

            <span className="tp-bonusy">
              {p.bonusy.map((b) => (
                <span key={b} className="tp-bonus">
                  <span className="tp-bonus-znak" aria-hidden="true">✓</span>
                  {b}
                </span>
              ))}
              {p.nevyhoda && (
                <span className="tp-nevyhoda">
                  <span aria-hidden="true">⚠️</span>
                  {p.nevyhoda}
                </span>
              )}
            </span>

            {vybrana === p.id && (
              <span className="tp-znacka" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="tp-akce">
        <button
          className={`tp-pokracovat ${detail ? 'tp-pokracovat--zvolena' : ''}`}
          style={detail ? ({ '--tp-barva': detail.barva } as React.CSSProperties) : undefined}
          disabled={!detail}
          onClick={() => detail && zvolitPostavu(detail.id)}
        >
          {detail ? `Pokračovat jako ${detail.jmeno}` : 'Vyber postavu'}
        </button>
      </div>
    </div>
  )
}
