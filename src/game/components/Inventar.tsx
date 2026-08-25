import React from 'react'
import { LUP } from '../data/items'
import { useInventarStore } from '../useInventarStore'
import './Inventar.css'

interface Props {
  onOdejit: () => void
}

// ==========================================
// Batoh — přehled loot předmětů posbíraných v boji (viz
// combat/types.ts Nepritel.lupId, useInventarStore.ts). Čistě čtecí
// obrazovka jako Questy.tsx — použití předmětu žije jinde, přímo v
// souboji (Souboj.tsx), tady se jen vidí, co hráč má. Otevírá se
// z mapa-menu (MapaSveta.tsx), třetí dlaždice vedle Hrdiny a Questů.
// ==========================================

export const Inventar: React.FC<Props> = ({ onOdejit }) => {
  const predmety = useInventarStore((s) => s.predmety)
  const vlastnene = LUP.filter((l) => (predmety[l.id] ?? 0) > 0)

  return (
    <div className="inventar">
      <div className="inv-top-bar">
        <button className="game-back-btn" onClick={onOdejit}>
          ← Zpět na mapu
        </button>
      </div>

      <h1 className="inv-title">Batoh</h1>
      <p className="inv-hint">Loot z bojů — použij ho přímo v souboji, kdy se to bude hodit.</p>

      {vlastnene.length === 0 ? (
        <p className="inv-prazdno">Zatím prázdný — poražení nepřátelé občas něco upustí.</p>
      ) : (
        <div className="inv-mrizka">
          {vlastnene.map((lup) => (
            <div key={lup.id} className="inv-karta">
              <span className="inv-karta-ikona" aria-hidden="true">
                {lup.ikona}
              </span>
              <div className="inv-karta-text">
                <span className="inv-karta-nazev">{lup.nazev}</span>
                <span className="inv-karta-popis">{lup.popis}</span>
              </div>
              <span className="inv-karta-pocet">×{predmety[lup.id]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
