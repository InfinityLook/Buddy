import React from 'react'
import { useNavigate } from 'react-router-dom'
import './GamesHubModule.css'

// ==========================================
// Rozcestník her — nový vstupní bod za tlačítkem Play v Hubu.
//
// Dřív "Play" vedlo rovnou do Buddyheimu (RPG, src/game/), jako by to
// byla jediná hra, co appka kdy bude mít. Teď je Play tahle stránka —
// mřížka her.
//
// Buddyheim je na žádost dočasně vyřazený z týhle mřížky, ne smazaný —
// appka se nejdřív soustředí na dotažení Souboje (hry pro dva) do
// 100 %, RPG (25 vedlejších questů, viz CLAUDE.md) počká na později.
// Vrátit dlaždici zpátky je jedna položka v HRY níž + odkomentovat
// lazy import GameModule a routu /hra/buddyheim v App.tsx — nic
// v src/game/ samotném se kvůli tomuhle nemění.
// ==========================================

interface Hra {
  id: string
  nazev: string
  popis: string
  cesta: string | null
  /** Obrázkový náhled (URL) — když žádný není (Souboj zatím nemá
   *  žádnou skutečnou grafiku, viz `src/fighting/` v CLAUDE.md),
   *  `emoji` kreslí náhled misto toho, stejné "neházet tam cizí
   *  obrázek jen aby tam něco bylo" pravidlo jako postavy Souboje
   *  samotné. */
  nahled: string | null
  emoji?: string
  barva: 'violet' | 'cyan'
}

const HRY: Hra[] = [
  // Buddyheim (RPG) je tu dočasně vyřazený — viz komentář nahoře.
  // {
  //   id: 'buddyheim',
  //   nazev: 'Buddyheim',
  //   popis: 'RPG dobrodružství — postava, mapa, souboje',
  //   cesta: '/hra/buddyheim',
  //   nahled: '/backgrounds/mapa-sveta.jpg',
  //   barva: 'violet',
  // },
  {
    id: 'souboj',
    nazev: 'Souboj',
    popis: 'Bojovka pro dva — telefon jako ovladač, hraje se na TV',
    cesta: '/hra/souboj',
    nahled: null,
    emoji: '🥊',
    barva: 'cyan',
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
            {hra.nahled ? (
              <span
                className="games-card-nahled"
                style={{ backgroundImage: `url('${hra.nahled}')` }}
                aria-hidden="true"
              />
            ) : (
              <span className="games-card-nahled games-card-nahled--prazdny" aria-hidden="true">
                <span className="games-card-emoji">{hra.emoji}</span>
              </span>
            )}
            <span className="games-card-body">
              <span className="games-card-nazev">{hra.nazev}</span>
              <span className="games-card-popis">{hra.popis}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default GamesHubModule
