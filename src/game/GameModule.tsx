import React from 'react'
import { useNavigate } from 'react-router-dom'
import { TvorbaPostavy } from './components/TvorbaPostavy'
import { useGameCharacter } from './useGameCharacter'
import { POSTAVY } from './postavy'
import './GameModule.css'

// ==========================================
// Herní hub — vstupní bod za tlačítkem Play v Hubu.
//
// Bez zvolené postavy vede rovnou na její výběr; jakmile je vybraná,
// appka se na to už neptá znovu. Mapa světa (města, dungeony, arény,
// tržiště...) je záměrně jen krátký zástupný panel — stavíme to po
// menších krocích, mapa přijde jako další krok.
// ==========================================

export const GameModule: React.FC = () => {
  const navigate = useNavigate()
  const postavaId = useGameCharacter((s) => s.postavaId)
  const postava = POSTAVY.find((p) => p.id === postavaId) ?? null

  if (!postava) {
    return <TvorbaPostavy />
  }

  return (
    <div className="game-page game-page--zastupny">
      <button className="game-back-btn" onClick={() => navigate('/hub')}>
        ← Zpět do Hubu
      </button>

      <div className="game-zastupny">
        <span className="game-zastupny-ikona" style={{ color: postava.barva }} aria-hidden="true">
          {postava.ikona}
        </span>
        <h2>Postava zvolena: {postava.jmeno}</h2>
        <p>Mapa světa — města, dungeony, arény, tržiště — přichází jako další krok.</p>
      </div>
    </div>
  )
}

export default GameModule
