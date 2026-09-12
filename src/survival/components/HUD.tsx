import React, { useState } from 'react'
import { SurvivalHerniStav, ZbranDef } from '../types'
import { vypocitejVlnu } from '../data/waves'
import { VYCHOZI_ZBRAN } from '../data/weapons'
import { SCHOPNOSTI } from '../data/abilities'
import { SCHOPNOSTI_IMPLEMENTOVANE } from '../engine/engine'
import { BuildPanel } from './BuildPanel'

// ==========================================
// Herní HUD (bod 3 zadání) — čistě prezentační, čte throttlovaný
// snímek stavu (viz useSurvivalEngine.ts's komentář, proč se HUD
// neaktualizuje 60×/s). Bod 11/12 zadání — appka umí doopravdy POUŽÍT
// čtyři z pěti katalogových schopností jako tlačítka s cooldownem
// (SCHOPNOSTI_IMPLEMENTOVANE, viz engine.ts's vlastní komentář); páté,
// Vampire, appka vykresluje TŘETím, samostatným způsobem — ne jako
// tlačítko (nemá žádnou akci k použití), ne jako "zatím zamčeno" (je
// doopravdy implementovaná, jen pasivně, viz engine.ts's
// aplikujVampirovoLeceni) — plochá "aktivní" ikonka bez cooldownu.
// `zbran` (bod 10 zadání, appčino "co dál tam chybí" bod 4) je teď
// skutečně vybraná/vybavená zbraň, ne natvrdo Iron Sword —
// StartScreen.tsx/SurvivalModule.tsx/Hra.tsx ji sem posílají jako
// obyčejný prop, HUD sám nic nepočítá, jen zobrazuje.
//
// zobrazBuild je čistě lokální UI přepínač (appka si nic nepersistuje
// ani nepauzuje) — otevírá BuildPanel.tsx, poslední zbývající kus bodu
// 12 zadání (viz jeho vlastní komentář).
// ==========================================

interface Props {
  stav: SurvivalHerniStav
  zbran?: ZbranDef
  onUkoncit: () => void
  onPouzitSchopnost: (schopnostId: string) => void
}

export const HUD: React.FC<Props> = ({ stav, zbran = VYCHOZI_ZBRAN, onUkoncit, onPouzitSchopnost }) => {
  const [zobrazBuild, setZobrazBuild] = useState(false)
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
        <button className="sn-hud-build-btn" onClick={() => setZobrazBuild(true)} aria-label="Zobrazit můj build">
          📊
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
              {stav.hrac.stitAbsorpce > 0 && stav.cas <= stav.hrac.stitVyprsiMs && (
                <span className="sn-hud-stit-znacka"> 🛡️ +{Math.round(stav.hrac.stitAbsorpce)}</span>
              )}
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
          <span className="sn-hud-akce-ikona sn-hud-akce-ikona--aktivni" title={zbran.jmeno}>
            {zbran.ikona}
          </span>
          {SCHOPNOSTI.map((s) => {
            if (s.id === 'vampire') {
              return (
                <span
                  key={s.id}
                  className="sn-hud-akce-ikona sn-hud-akce-ikona--pasivni"
                  title={`${s.jmeno} — pasivní, vždy aktivní`}
                >
                  {s.ikona}
                </span>
              )
            }
            if (!SCHOPNOSTI_IMPLEMENTOVANE.has(s.id)) {
              return (
                <span key={s.id} className="sn-hud-akce-ikona sn-hud-akce-ikona--zamceno" title={`${s.jmeno} (zatím nedostupné)`}>
                  {s.ikona}
                </span>
              )
            }
            const posledni = stav.hrac.posledniPouzitiSchopnosti[s.id] ?? -Infinity
            const zbyvaMs = Math.max(0, s.cooldownMs - (stav.cas - posledni))
            const naCooldownu = zbyvaMs > 0
            return (
              <button
                key={s.id}
                type="button"
                className={`sn-hud-akce-ikona sn-hud-akce-ikona--schopnost${naCooldownu ? ' sn-hud-akce-ikona--cooldown' : ''}`}
                title={naCooldownu ? `${s.jmeno} (${Math.ceil(zbyvaMs / 1000)} s)` : s.jmeno}
                disabled={naCooldownu}
                onClick={() => onPouzitSchopnost(s.id)}
              >
                {s.ikona}
                {naCooldownu && <span className="sn-hud-akce-cooldown-cislo">{Math.ceil(zbyvaMs / 1000)}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {zobrazBuild && <BuildPanel stav={stav} onZavrit={() => setZobrazBuild(false)} />}
    </div>
  )
}
