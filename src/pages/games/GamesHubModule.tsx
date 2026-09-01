import React from 'react'
import { useNavigate } from 'react-router-dom'
import './GamesHubModule.css'

// ==========================================
// Rozcestník her — nový vstupní bod za tlačítkem Play v Hubu.
//
// Dřív "Play" vedlo rovnou do Buddyheimu (RPG, src/game/), jako by to
// byla jediná hra, co appka kdy bude mít. Teď je Play tahle stránka —
// mřížka her, Buddyheim je první dlaždice, ne rovnou cíl. Sama nic
// z RPG nezná ani neimportuje (žádná Three.js váha navíc tady), jen
// odkazuje na /hra/buddyheim, kde běží úplně beze změny.
// ==========================================

interface Hra {
  id: string
  nazev: string
  popis: string
  cesta: string | null
  nahled: string
  barva: 'violet' | 'cyan'
}

const HRY: Hra[] = [
  {
    id: 'buddyheim',
    nazev: 'Buddyheim',
    popis: 'RPG dobrodružství — postava, mapa, souboje',
    cesta: '/hra/buddyheim',
    nahled: '/backgrounds/mapa-sveta.jpg',
    barva: 'violet',
  },
]

export const GamesHubModule: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="games-page">
      <header className="games-top-bar">
        <button className="games-back-btn" onClick={() => navigate('/hub')}>
          ← Zpět do Hubu
        </button>
        <h1 className="games-title">Hry</h1>
        <p className="games-sub">Vyber si, do čeho se dnes pustíš.</p>
      </header>

      <div className="games-grid">
        {HRY.map((hra) => (
          <button
            key={hra.id}
            className={`games-card games-card--${hra.barva}`}
            onClick={() => hra.cesta && navigate(hra.cesta)}
          >
            <span
              className="games-card-nahled"
              style={{ backgroundImage: `url('${hra.nahled}')` }}
              aria-hidden="true"
            />
            <span className="games-card-body">
              <span className="games-card-nazev">{hra.nazev}</span>
              <span className="games-card-popis">{hra.popis}</span>
            </span>
          </button>
        ))}

        {/* Druhá hra — zatím jen rezervované místo, ať mřížka rovnou
            ukazuje "tady jich bude víc", ne jednu osamocenou dlaždici.
            Obsah/název přibude, jakmile bude jasné, co to vlastně bude. */}
        <div className="games-card games-card--soon" aria-hidden="true">
          <span className="games-card-nahled games-card-nahled--prazdny" />
          <span className="games-card-body">
            <span className="games-card-nazev">
              Další hra
              <span className="games-badge-soon">BRZY</span>
            </span>
            <span className="games-card-popis">Připravujeme</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default GamesHubModule
