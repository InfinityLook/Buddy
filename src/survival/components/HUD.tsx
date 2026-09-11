import React from 'react'
import { SurvivalHerniStav } from '../types'
import { vypocitejVlnu } from '../data/waves'
import { ZBRANE } from '../data/weapons'
import { SCHOPNOSTI } from '../data/abilities'

// ==========================================
// Herní HUD (bod 3 zadání) — čistě prezentační, čte throttlovaný
// snímek stavu (viz useSurvivalEngine.ts's komentář, proč se HUD
// neaktualizuje 60×/s). Schopnosti (🔮) jsou zatím jen informativní
// ikony bez cooldownu — aktivní používání schopností a výběr zbraně
// (⚔️) je až v dalším kroku, appka to nepředstírá jako funkční.
// ==========================================

interface Props {
  stav: SurvivalHerniStav
  onUkoncit: () => void
}

export const HUD: React.FC<Props> = ({ stav, onUkoncit }) => {
  const config = vypocitejVlnu(stav.vlna)
  const jeBoss = stav.faceVlny === 'boss-boj' || stav.faceVlny === 'boss-spawnuje'
  const boss = jeBoss ? stav.aktivniNepratele.find((n) => n.jeBoss) : null

  let progres = 0
  if (jeBoss && boss) {
    progres = 1 - boss.hp / boss.maxHp
  } else if (config.pocetNepratel > 0) {
    const zbyvaCelkem = stav.zbyvaSpawnovat + stav.aktivniNepratele.length
    progres = Math.max(0, Math.min(1, (config.pocetNepratel - zbyvaCelkem) / config.pocetNepratel))
  }

  const hpProcenta = Math.max(0, Math.min(100, (stav.hrac.hp / stav.hrac.maxHp) * 100))
  const cas = Math.floor(stav.cas / 1000)
  const minuty = Math.floor(cas / 60)
  const vteriny = cas % 60

  return (
    <div className="sn-hud">
      <div className="sn-hud-top">
        <button className="sn-hud-back" onClick={onUkoncit} aria-label="Ukončit běh">
          ←
        </button>
        <div className="sn-hud-wave-wrap">
          <span className="sn-hud-wave-label">{jeBoss ? '👹 BOSS WAVE' : `WAVE ${String(stav.vlna).padStart(2, '0')}`}</span>
          <div className="sn-hud-progress" role="progressbar" aria-valuenow={Math.round(progres * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className={`sn-hud-progress-fill${jeBoss ? ' sn-hud-progress-fill--boss' : ''}`} style={{ width: `${progres * 100}%` }} />
          </div>
        </div>
        <span className="sn-hud-cas">
          {minuty}:{vteriny.toString().padStart(2, '0')}
        </span>
      </div>

      <div className="sn-hud-log" aria-live="polite">
        {stav.log.slice(0, 3).map((z) => (
          <div key={z.id} className="sn-hud-log-radek">
            {z.text}
          </div>
        ))}
      </div>

      <div className="sn-hud-bottom">
        <div className="sn-hud-stats">
          <div className="sn-hud-hp-wrap">
            <span className="sn-hud-hp-label">
              ❤️ {Math.round(stav.hrac.hp)} / {stav.hrac.maxHp}
            </span>
            <div className="sn-hud-hp-bar">
              <div className="sn-hud-hp-fill" style={{ width: `${hpProcenta}%` }} />
            </div>
          </div>
          <div className="sn-hud-cisla">
            <span>⭐ {stav.xpZaBeh} XP</span>
            <span>🪙 {stav.goldZaBeh}</span>
            <span>💎 {stav.krystalZaBeh}</span>
            <span>💀 {stav.zabitiCelkem}</span>
          </div>
        </div>

        <div className="sn-hud-akce">
          <span className="sn-hud-akce-ikona sn-hud-akce-ikona--aktivni" title={ZBRANE[0].jmeno}>
            {ZBRANE[0].ikona}
          </span>
          {SCHOPNOSTI.slice(0, 3).map((s) => (
            <span key={s.id} className="sn-hud-akce-ikona sn-hud-akce-ikona--zamceno" title={`${s.jmeno} (zatím nedostupné)`}>
              {s.ikona}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
