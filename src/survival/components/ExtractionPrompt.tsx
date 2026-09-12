import React from 'react'
import { SurvivalHerniStav } from '../types'
import { EXTRAKCE_BONUS_NASOBIC } from '../engine/engine'

// ==========================================
// "Extrahovat, nebo pokračovat?" (bod 18 zadání) — celoobrazovkový
// překryv nad arénou, zobrazí se přesně dokud stav.faceVlny ===
// 'extrakce' (viz Hra.tsx). Engine sám žádné nové nepřátele ve téhle
// fázi nespawnuje (viz engine.ts), takže hra nepokračuje, dokud hráč
// nevybere jednu z obou akcí.
// ==========================================

interface Props {
  stav: SurvivalHerniStav
  onExtrahovat: () => void
  onPokracovat: () => void
}

export const ExtractionPrompt: React.FC<Props> = ({ stav, onExtrahovat, onPokracovat }) => {
  const bonusProcenta = Math.round((EXTRAKCE_BONUS_NASOBIC - 1) * 100)
  const goldSBonusem = Math.round(stav.goldZaBeh * EXTRAKCE_BONUS_NASOBIC)
  const krystalSBonusem = Math.round(stav.krystalZaBeh * EXTRAKCE_BONUS_NASOBIC)

  return (
    <div className="sn-extrakce-prekryv">
      <div className="sn-extrakce-karta">
        <h2 className="sn-extrakce-nadpis">🚪 Vlna {stav.vlna} hotová!</h2>
        <p className="sn-extrakce-popis">
          Extrahuj teď a bezpečně si odnes odměnu s bonusem, nebo pokračuj dál a riskuj další, těžší vlnu.
        </p>

        <div className="sn-extrakce-odmena">
          <div className="sn-extrakce-radek">
            <span>🪙 Gold</span>
            <span>
              {stav.goldZaBeh} → <strong>{goldSBonusem}</strong>
            </span>
          </div>
          <div className="sn-extrakce-radek">
            <span>💎 Crystal</span>
            <span>
              {stav.krystalZaBeh} → <strong>{krystalSBonusem}</strong>
            </span>
          </div>
        </div>

        <div className="sn-extrakce-akce">
          <button className="sn-extrakce-btn sn-extrakce-btn--extrahovat" onClick={onExtrahovat}>
            🚪 EXTRAHOVAT (+{bonusProcenta} %)
          </button>
          <button className="sn-extrakce-btn sn-extrakce-btn--pokracovat" onClick={onPokracovat}>
            ⚔️ POKRAČOVAT (Vlna {stav.vlna + 1})
          </button>
        </div>
      </div>
    </div>
  )
}
