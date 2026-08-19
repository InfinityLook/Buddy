import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameScene } from './useGameScene'
import { HOTSPOTS } from './constants'
import type { HotspotId } from './types'
import './GameModule.css'

// ==========================================
// Herní hub — 3D město jako rozcestník.
//
// Zatím nikam nevede: každá část města je tlačítko, které jen řekne, co
// se za ním jednou objeví. Až bude co otevřít, mění se jediné místo —
// funkce otevriCast níž.
//
// Modul se načítá odděleně (React.lazy v App.tsx), protože si s sebou
// nese Three.js. Zbytek aplikace tím nezůstane těžší.
// ==========================================

export const GameModule: React.FC = () => {
  const navigate = useNavigate()
  const [vybrana, setVybrana] = useState<HotspotId | null>(null)

  const otevriCast = useCallback((id: HotspotId) => {
    // Sem povede otevření jednotlivých částí hry, až budou existovat.
    setVybrana(id)
  }, [])

  const { containerRef, labels, hovered, setHovered, ready, failed } =
    useGameScene(otevriCast)

  const popisy = useMemo(
    () => new Map(HOTSPOTS.map((meta) => [meta.id, meta])),
    []
  )

  // Vzdálenější popisky se kreslí dřív, takže bližší leží navrchu
  const serazene = useMemo(
    () => [...labels].sort((a, b) => b.depth - a.depth),
    [labels]
  )

  const detail = vybrana ? popisy.get(vybrana) : null

  if (failed) {
    return (
      <div className="game-page game-page--fallback">
        <button className="game-back-btn" onClick={() => navigate('/hub')}>
          ← Zpět do Hubu
        </button>
        <div className="game-fallback">
          <span className="game-fallback-icon" aria-hidden="true">🏔️</span>
          <h2>Město se nepodařilo vykreslit</h2>
          <p>
            Tvůj prohlížeč nemá zapnuté 3D vykreslování (WebGL). Zkus to
            v jiném prohlížeči nebo zapni hardwarovou akceleraci v nastavení.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="game-page">
      {/* Platno se scénou. Zabírá celou plochu, ovládací prvky leží nad ním. */}
      <div className="game-canvas" ref={containerRef} />

      {!ready && <div className="game-loading">Stavím město…</div>}

      <button className="game-back-btn" onClick={() => navigate('/hub')}>
        ← Zpět do Hubu
      </button>

      <div className="game-title-bar">
        <h1 className="game-title">Buddyheim</h1>
        <p className="game-hint">Táhni pro otočení, štípni pro přiblížení</p>
      </div>

      {/* Popisky se vznášejí nad svými místy ve městě a jsou to tlačítka */}
      <div className="game-labels">
        {serazene.map((label) => {
          const meta = popisy.get(label.id)
          if (!meta || !label.visible) return null

          return (
            <button
              key={label.id}
              className={`game-label ${hovered === label.id ? 'is-hovered' : ''}`}
              style={{
                transform: `translate(-50%, -100%) translate(${label.x}px, ${label.y}px)`,
                borderColor: meta.color,
              }}
              onClick={() => otevriCast(label.id)}
              onMouseEnter={() => setHovered(label.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="game-label-icon" aria-hidden="true">{meta.icon}</span>
              <span className="game-label-text">
                <span className="game-label-title" style={{ color: meta.color }}>
                  {meta.title}
                </span>
                <span className="game-label-sub">{meta.subtitle}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Panel po klepnutí. Poctivě říká, že za tlačítkem zatím nic není. */}
      {detail && (
        <>
          <div className="game-sheet-overlay" onClick={() => setVybrana(null)} />
          <div className="game-sheet" style={{ borderColor: detail.color }}>
            <span className="game-sheet-icon" aria-hidden="true">{detail.icon}</span>
            <h2 className="game-sheet-title" style={{ color: detail.color }}>
              {detail.title}
            </h2>
            <p className="game-sheet-sub">{detail.subtitle}</p>
            <p className="game-sheet-note">
              Tahle část města zatím nikam nevede — je připravená a obsah do ní
              teprve přibude.
            </p>
            <button className="game-sheet-close" onClick={() => setVybrana(null)}>
              Zavřít
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default GameModule
