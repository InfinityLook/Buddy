import React, { useState } from 'react'
import { useSurvivalStore } from '@/core/store/useSurvivalStore'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { VYCHOZI_POSTAVA } from '../data/postavy'
import { ZBRANE } from '../data/weapons'
import { SCHOPNOSTI } from '../data/abilities'
import { RARITA_BARVA, RARITA_NAZEV } from '../types'

// ==========================================
// Start screen (bod 4 zadání) — Hrát + reálné statistiky z trvalého
// storu, plus čtyři podobrazovky (Postava/Výbava/Schopnosti/
// Statistiky). Schopnosti zůstává jen ČITELNÝ katalog (aktivní
// používání schopností se řeší v HUD.tsx BĚHEM běhu, ne tady, viz
// SCHOPNOSTI_IMPLEMENTOVANE) — appka to tady neschovává za tlačítko,
// co nic nedělá, jen otevírá seznam a poctivě říká, co zatím funguje.
//
// Výbava (appčino "co dál tam chybí" bod 4) je teď skutečné odemykání
// za Gold (useSurvivalStore's odemknoutZbran) plus výběr, kterou z už
// odemčených zbraní hráč vezme do příštího běhu (vybratZbran) — appka
// se sama nespoléhá na to, že tlačítko "VYBAVIT" zůstane neaktivní pro
// zamčenou zbraň jen díky UI; obě akce ve storu si to hlídají znovu.
// ==========================================

type Podobrazovka = 'menu' | 'postava' | 'vybava' | 'schopnosti' | 'statistiky'

interface Props {
  onHrat: () => void
  onZpet: () => void
}

export const StartScreen: React.FC<Props> = ({ onHrat, onZpet }) => {
  const [podobrazovka, setPodobrazovka] = useState<Podobrazovka>('menu')
  const survival = useSurvivalStore()
  const counters = useGamificationStore((s) => s.counters)

  if (podobrazovka !== 'menu') {
    return (
      <div className="sn-screen">
        <button className="sn-zpet-btn" onClick={() => setPodobrazovka('menu')}>
          ← Zpět do menu
        </button>

        {podobrazovka === 'postava' && (
          <div className="sn-panel">
            <h2 className="sn-panel-nadpis">
              {VYCHOZI_POSTAVA.emoji} {VYCHOZI_POSTAVA.jmeno}
            </h2>
            <div className="sn-panel-radek">
              <span>❤️ HP</span>
              <span>{VYCHOZI_POSTAVA.hp}</span>
            </div>
            <div className="sn-panel-radek">
              <span>⚔️ Damage</span>
              <span>{VYCHOZI_POSTAVA.damage}</span>
            </div>
            <div className="sn-panel-radek">
              <span>🏃 Speed</span>
              <span>{VYCHOZI_POSTAVA.rychlost.toFixed(1)}</span>
            </div>
            <div className="sn-panel-radek">
              <span>🎯 Critical Chance</span>
              <span>{Math.round(VYCHOZI_POSTAVA.kritickaSance * 100)} %</span>
            </div>
            <p className="sn-panel-pozn">Další postavy (Tank/Warrior/Mage/Hunter/Cyber) se připravují.</p>
          </div>
        )}

        {podobrazovka === 'vybava' && (
          <div className="sn-panel">
            <div className="sn-panel-hlavicka-gold">
              <h2 className="sn-panel-nadpis">Výbava</h2>
              <span className="sn-panel-gold">🪙 {survival.gold}</span>
            </div>
            {ZBRANE.map((z) => {
              const odemcena = survival.odemceneZbrane.includes(z.id)
              const vybavena = survival.vybranaZbran === z.id
              const dostatekGoldu = !!z.odemkovaciCena && survival.gold >= z.odemkovaciCena
              return (
                <div key={z.id} className="sn-katalog-radek">
                  <span className="sn-katalog-ikona">{z.ikona}</span>
                  <div className="sn-katalog-info">
                    <span className="sn-katalog-jmeno">
                      {z.jmeno}{' '}
                      <span className="sn-katalog-rarita" style={{ color: RARITA_BARVA[z.rarita] }}>
                        {RARITA_NAZEV[z.rarita]}
                      </span>
                    </span>
                    <span className="sn-katalog-popis">{z.efekt}</span>
                    <span className="sn-katalog-staty">
                      ⚔️ {z.damage} · ⏱️ {z.utokyZaSekundu.toFixed(1)}/s · 🎯 {z.dosah.toFixed(1)}
                    </span>
                  </div>
                  {vybavena ? (
                    <span className="sn-katalog-znacka">VYBAVENO</span>
                  ) : odemcena ? (
                    <button className="sn-katalog-btn" onClick={() => survival.vybratZbran(z.id)}>
                      VYBAVIT
                    </button>
                  ) : (
                    <button
                      className="sn-katalog-btn sn-katalog-btn--odemknout"
                      disabled={!dostatekGoldu}
                      onClick={() => survival.odemknoutZbran(z.id)}
                    >
                      🔒 {z.odemkovaciCena}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {podobrazovka === 'schopnosti' && (
          <div className="sn-panel">
            <h2 className="sn-panel-nadpis">Schopnosti</h2>
            {SCHOPNOSTI.map((s) => (
              <div key={s.id} className="sn-katalog-radek">
                <span className="sn-katalog-ikona">{s.ikona}</span>
                <div className="sn-katalog-info">
                  <span className="sn-katalog-jmeno">{s.jmeno}</span>
                  <span className="sn-katalog-popis">{s.popis}</span>
                </div>
              </div>
            ))}
            <p className="sn-panel-pozn">Aktivní používání schopností během běhu se připravuje.</p>
          </div>
        )}

        {podobrazovka === 'statistiky' && (
          <div className="sn-panel">
            <h2 className="sn-panel-nadpis">Statistiky</h2>
            <div className="sn-panel-radek">
              <span>Nejvyšší vlna</span>
              <span>{survival.nejvyssiVlna}</span>
            </div>
            <div className="sn-panel-radek">
              <span>Nejlepší skóre</span>
              <span>{survival.nejlepsiSkore}</span>
            </div>
            <div className="sn-panel-radek">
              <span>Bossové poraženi</span>
              <span>{survival.bossPorazenoCelkem}</span>
            </div>
            <div className="sn-panel-radek">
              <span>Celkem zabito monster</span>
              <span>{counters.survival_kill ?? 0}</span>
            </div>
            <div className="sn-panel-radek">
              <span>Celkem běhů</span>
              <span>{survival.celkemBehu}</span>
            </div>
            <div className="sn-panel-radek">
              <span>Celkový čas přežití</span>
              <span>{Math.floor(survival.celkemPrezitySekund / 60)} min</span>
            </div>
            <div className="sn-panel-radek">
              <span>🪙 Gold</span>
              <span>{survival.gold}</span>
            </div>
            <div className="sn-panel-radek">
              <span>💎 Crystal</span>
              <span>{survival.krystal}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="sn-screen sn-start">
      <button className="sn-zpet-btn" onClick={onZpet}>
        ← Zpět do BuddyZone
      </button>

      <div className="sn-start-hlavicka">
        <span className="sn-start-emoji" aria-hidden="true">
          🌙
        </span>
        <h1 className="sn-start-nadpis">SURVIVAL NIGHT</h1>
        <p className="sn-start-tagline">PŘEŽ NOC.</p>
      </div>

      <button className="sn-hrat-btn" onClick={onHrat}>
        ▶ HRÁT
      </button>

      <div className="sn-start-staty">
        <div className="sn-start-stat">
          <span className="sn-start-stat-cislo">{survival.nejvyssiVlna}</span>
          <span className="sn-start-stat-label">Nejvyšší vlna</span>
        </div>
        <div className="sn-start-stat">
          <span className="sn-start-stat-cislo">{survival.nejlepsiSkore}</span>
          <span className="sn-start-stat-label">Nejlepší skóre</span>
        </div>
        <div className="sn-start-stat">
          <span className="sn-start-stat-cislo">{survival.bossPorazenoCelkem}</span>
          <span className="sn-start-stat-label">Bossové poraženi</span>
        </div>
      </div>

      <div className="sn-start-menu">
        <button onClick={() => setPodobrazovka('postava')}>POSTAVA</button>
        <button onClick={() => setPodobrazovka('vybava')}>VÝBAVA</button>
        <button onClick={() => setPodobrazovka('schopnosti')}>SCHOPNOSTI</button>
        <button onClick={() => setPodobrazovka('statistiky')}>STATISTIKY</button>
      </div>
    </div>
  )
}
