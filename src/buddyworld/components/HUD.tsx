import React from 'react'
import { MaskotDef, NepritelDef } from '../types'
import { BuddyWorldHud } from '../scene/useBuddyWorldScene'

// ==========================================
// 2D HUD přes 3D scénu — hráčovo HP/XP/level, útočné tlačítko a
// nepřítelovo HP (jen během boje). Tahle komponenta nic nekreslí
// uvnitř Threejs, je to plain React/DOM přes scénu — stejná
// konvence jako Survival Nightovo HUD.tsx.
// ==========================================

interface Props {
  hud: BuddyWorldHud
  maskot: MaskotDef
  nepritelDef: NepritelDef
  onUtocit: () => void
  onZpet: () => void
  onZkusitZnovu: () => void
}

export const HUD: React.FC<Props> = ({ hud, maskot, nepritelDef, onUtocit, onZpet, onZkusitZnovu }) => {
  const hpProcenta = Math.max(0, Math.min(100, (hud.hrac.hp / hud.hrac.maxHp) * 100))
  const xpProcenta = Math.max(0, Math.min(100, (hud.hrac.xp / hud.xpProDalsiUroven) * 100))
  const nepritelProcenta = Math.max(0, Math.min(100, (hud.nepritelHp / hud.nepritelMaxHp) * 100))
  const vBoji = hud.nepritelFaze !== 'klid' && hud.nepritelFaze !== 'mrtvy'

  return (
    <div className="bw-hud">
      <div className="bw-hud-horni">
        <div className="bw-hud-hrac">
          <div className="bw-hud-radek">
            <span className="bw-hud-level">Lv {hud.hrac.level}</span>
            <div className="bw-hud-bar bw-hud-bar--hp">
              <div className="bw-hud-bar-vypln" style={{ width: `${hpProcenta}%` }} />
              <span className="bw-hud-bar-text">
                {Math.ceil(hud.hrac.hp)} / {hud.hrac.maxHp} HP
              </span>
            </div>
          </div>
          <div className="bw-hud-bar bw-hud-bar--xp">
            <div className="bw-hud-bar-vypln" style={{ width: `${xpProcenta}%` }} />
            <span className="bw-hud-bar-text">
              {hud.hrac.xp} / {hud.xpProDalsiUroven} XP
            </span>
          </div>
        </div>

        <button type="button" className="bw-hud-zpet" onClick={onZpet} aria-label="Zpět do Hubu">
          ✕
        </button>
      </div>

      {vBoji && (
        <div className="bw-hud-nepritel">
          <span className="bw-hud-nepritel-jmeno">
            {nepritelDef.ikona} {nepritelDef.jmeno}
          </span>
          <div className="bw-hud-bar bw-hud-bar--nepritel">
            <div className="bw-hud-bar-vypln" style={{ width: `${nepritelProcenta}%` }} />
          </div>
        </div>
      )}

      <div className="bw-hud-maskot" aria-hidden="true">
        <span className="bw-hud-maskot-ikona" style={{ color: maskot.barvaJadro }}>
          {maskot.ikona}
        </span>
        <span className="bw-hud-maskot-jmeno">{maskot.jmeno}</span>
      </div>

      <div className="bw-hud-spodni">
        <button
          type="button"
          className={`bw-hud-utok${hud.utokPripraven ? ' bw-hud-utok--pripraven' : ''}`}
          onClick={onUtocit}
          disabled={!hud.utokPripraven}
        >
          ⚔️ Útok
        </button>
      </div>

      {hud.mrtvyHrac && (
        <div className="bw-hud-smrt">
          <div className="bw-hud-smrt-karta">
            <p className="bw-hud-smrt-text">Poraženo…</p>
            <button type="button" className="bw-hud-smrt-btn" onClick={onZkusitZnovu}>
              Zkusit znovu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
