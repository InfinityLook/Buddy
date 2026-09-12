import React from 'react'
import { SurvivalHerniStav } from '../types'
import { PERKY } from '../data/perky'

// ==========================================
// "Level up! Vyber perk." (bod 11 zadání, krok 2/4) — celoobrazovkový
// překryv nad arénou, stejný tvar jako ExtractionPrompt.tsx vedle
// tohohle souboru: appka ho zobrazí přesně dokud stav.levelUpNabidka
// není `null` (viz Hra.tsx). Engine sám v tuhle chvíli CELÝ tik
// zamrzne (viz engine.ts's `if (stav.levelUpNabidka) return stav`,
// krok 1) — appka proto nemusí nic zvlášť pauzovat, jen počkat na
// klik na jednu ze tří karet.
//
// `levelUpNabidka` nese jen id perků (viz engine.ts's
// vyberNabidkuPerku) — appka je tu přeloží na jméno/popis/ikonu proti
// PERKY katalogu, ne že by je engine posílal už hotové.
// ==========================================

interface Props {
  stav: SurvivalHerniStav
  onVyberPerk: (perkId: string) => void
}

export const LevelUpPrompt: React.FC<Props> = ({ stav, onVyberPerk }) => {
  const nabidka = stav.levelUpNabidka ?? []

  return (
    <div className="sn-levelup-prekryv">
      <div className="sn-levelup-karta">
        <h2 className="sn-levelup-nadpis">⭐ Level {stav.hrac.uroven}!</h2>
        <p className="sn-levelup-popis">Vyber si jedno vylepšení.</p>

        <div className="sn-levelup-volby">
          {nabidka.map((perkId) => {
            const perk = PERKY.find((p) => p.id === perkId)
            if (!perk) return null
            return (
              <button
                key={perk.id}
                className="sn-levelup-volba"
                onClick={() => onVyberPerk(perk.id)}
              >
                <span className="sn-levelup-volba-ikona">{perk.ikona}</span>
                <span className="sn-levelup-volba-info">
                  <span className="sn-levelup-volba-jmeno">{perk.jmeno}</span>
                  <span className="sn-levelup-volba-popis">{perk.popis}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
