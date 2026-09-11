import React from 'react'
import { VysledekBehu } from '../useSurvivalEngine'

// ==========================================
// Run End (bod 17 zadání) — wave/kills/time/XP/Gold/Crystal a "NEW
// RECORD", pokud šlo o rekord. `vysledek` přichází z
// useSurvivalEngine.ts přesně jednou za běh, hned jak je trvalý
// postup skutečně zapsaný (zapocitatBeh), ne dřív.
// ==========================================

interface Props {
  vysledek: VysledekBehu
  onHratZnovu: () => void
  onHlavniMenu: () => void
}

export const RunEndScreen: React.FC<Props> = ({ vysledek, onHratZnovu, onHlavniMenu }) => {
  const minuty = Math.floor(vysledek.cas / 60000)
  const vteriny = Math.floor((vysledek.cas % 60000) / 1000)

  return (
    <div className="sn-screen sn-konec">
      <h1 className="sn-konec-nadpis">RUN ENDED</h1>

      {vysledek.jeRekord && <div className="sn-konec-rekord">🏆 NEW RECORD!</div>}

      <div className="sn-konec-staty">
        <div className="sn-konec-radek">
          <span>Wave</span>
          <span>{vysledek.vlnaDosazena}</span>
        </div>
        <div className="sn-konec-radek">
          <span>Monster kills</span>
          <span>{vysledek.zabiti}</span>
        </div>
        <div className="sn-konec-radek">
          <span>Time</span>
          <span>
            {minuty}:{vteriny.toString().padStart(2, '0')}
          </span>
        </div>
        {vysledek.bossPorazeno > 0 && (
          <div className="sn-konec-radek">
            <span>Bossové poraženi</span>
            <span>{vysledek.bossPorazeno}</span>
          </div>
        )}
        <div className="sn-konec-radek sn-konec-radek--odmena">
          <span>⭐ XP</span>
          <span>+{vysledek.xp}</span>
        </div>
        <div className="sn-konec-radek sn-konec-radek--odmena">
          <span>🪙 Gold</span>
          <span>+{vysledek.gold}</span>
        </div>
        <div className="sn-konec-radek sn-konec-radek--odmena">
          <span>💎 Crystal</span>
          <span>+{vysledek.krystal}</span>
        </div>
      </div>

      <div className="sn-konec-akce">
        <button className="sn-hrat-btn" onClick={onHratZnovu}>
          ▶ HRÁT ZNOVU
        </button>
        <button className="sn-menu-btn" onClick={onHlavniMenu}>
          HLAVNÍ MENU
        </button>
      </div>
    </div>
  )
}
