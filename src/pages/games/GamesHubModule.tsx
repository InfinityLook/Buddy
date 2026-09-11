import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { getLevelProgress } from '@/core/utils/gamificationUtils'
import { SocialIcon } from '@/social/components/SocialIcon'
import './GamesHubModule.css'

// ==========================================
// Buddy Arcade — rozcestník her za tlačítkem Play v Hubu.
//
// Appčiny tři hry — Buddyheim (RPG, src/game/), Souboj (bojovka pro
// dva, src/fighting/) a Buddyho Trh (deskovka, src/boardgame/) — jsou
// na žádost dočasně SCHOVANÉ, ne smazané: appka začíná hry stavět
// úplně od znova, tahle obrazovka mezitím ukazuje jen "Připravuje se".
// Žádný soubor ve všech třech herních složkách se kvůli tomu nemění —
// jen tahle obrazovka přestala nabízet karty a routy v App.tsx
// přestaly na ně odkazovat (viz komentář tam u zakomentovaných lazy
// importů). Vrátit některou hru zpátky znamená: přidat jí sem znovu
// kartu do HRY (dřívější tvar zachovaný v Git historii), odkomentovat
// její lazy import v App.tsx a přehodit její routu z <Navigate
// to="/hra" replace /> zpátky na skutečný element — stejný "hide,
// keep documented, one-line revert" postup, co appka použila jako
// první na samotného Buddyheima.
// ==========================================

export const GamesHubModule: React.FC = () => {
  const navigate = useNavigate()
  const { xp, level } = useGamificationStore()
  const progres = getLevelProgress(xp)

  return (
    <div className="arc-page">
      <div className="arc-top">
        <button className="arc-back" onClick={() => navigate('/hub')} aria-label="Zpět do Hubu">
          <SocialIcon name="arrow-left" size={15} />
        </button>
        <div className="arc-title-wrap">
          <div className="arc-title">
            <span className="arc-vsuvka">🎮</span> Buddy Arcade
          </div>
          <p className="arc-sub">Nové hry se teprve staví</p>
        </div>
        <span
          className="arc-level"
          aria-label={`Úroveň ${level}`}
          style={{
            background: `conic-gradient(var(--accent-cyan) 0deg ${progres * 3.6}deg, rgba(255,255,255,0.1) ${progres * 3.6}deg 360deg)`,
          }}
        >
          <span>Lv {level}</span>
        </span>
      </div>

      <div className="arc-brzy">
        <span className="arc-brzy-znak" aria-hidden="true">
          🛠️
        </span>
        <h2 className="arc-brzy-nadpis">Připravuje se</h2>
        <p className="arc-brzy-popis">
          Buddy Arcade prochází přestavbou — hry tu brzy budou zase k mání. Díky za trpělivost!
        </p>
      </div>
    </div>
  )
}

export default GamesHubModule
