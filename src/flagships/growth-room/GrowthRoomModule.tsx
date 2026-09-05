import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/core/store/useAppStore'
import { useGoalTracker } from '@/miniapps/goal-tracker/useGoalTracker'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { getLevelProgress, getXpForNextLevel } from '@/core/utils/gamificationUtils'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { FlagshipShell } from '../shared/FlagshipShell'
import { NastrojeSheet } from '../shared/NastrojeSheet'
import { nejblizsiCile, pocetOdemcenych } from './growthStats'
import type { FlagshipDlazdice, FlagshipVelkaKarta } from '../shared/types'
import './GrowthRoomModule.css'

// Kolik nejbližších cílů se ukáže v náhledu — celý seznam má Goal
// Tracker sám, tohle je jen "co je nejblíž hotové", stejná mez jako
// MAX_PRSTENCU v Economy Roomu vedle.
const MAX_NAHLED_CILU = 3

// ==========================================
// Growth Room — čtvrtá vlajková appka (viz FlagshipShell.tsx pro celé
// zdůvodnění rozděleného pláště). Stejně jako Fitness Room/Economy Room
// nemá "Můj widget" panel — tělo je vlastní přehled cílů a úrovně,
// proto se sem MujWidgetPanel neimportuje.
//
// Goal Tracker je jediná appka přesunutá sem (jenVeVlajkoveAppce v
// useAppStore.ts) — byla to poslední appka v hlavní mřížce /apps, co
// ještě nikam nepřesídlila, stejný "jedna appka, jedna room" rozsah
// jako Fitness Room (Form Check) a Economy Room (Finance) předtím.
//
// Druhý panel ("Úroveň & odznaky") nepřesouvá žádnou appku ani
// nekopíruje /odmeny — čte skutečná data přímo z useGamificationStore()
// (stejná xp/level/streakDays/badges, co používá Hub i RewardModule)
// a "Zobrazit vše" jen naviguje na /odmeny, stejný "dlaždice je jen
// zkratka, ne druhá kopie obrazovky" vzorec, jaký School Roomova
// dlaždice "Statistiky" už používá pro tu samou stránku.
// ==========================================

export const GrowthRoomModule: React.FC = () => {
  const navigate = useNavigate()
  const setActiveAppId = useAppStore((s) => s.setActiveAppId)
  const { goals, totalCount, doneCount } = useGoalTracker()
  const { level, xp, streakDays, badges } = useGamificationStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [appsOtevrene, setAppsOtevrene] = useState(false)

  const otevritGoalTracker = () => {
    setActiveAppId('goal-tracker', '/growth')
    navigate('/apps')
  }

  const xpDoDalsi = getXpForNextLevel(level)
  const progres = getLevelProgress(xp)
  const nahledCilu = nejblizsiCile(goals, MAX_NAHLED_CILU)
  const odemcenoOdznaku = pocetOdemcenych(badges)

  const nastroje: FlagshipDlazdice[] = [
    {
      id: 'goal-tracker',
      nazev: 'Goal Tracker',
      popis: 'Založ a sleduj vlastní cíle',
      ikona: 'goal-tracker',
      barva: 'pink',
      onClick: otevritGoalTracker,
    },
  ]

  const velkeKarty: FlagshipVelkaKarta[] = [
    {
      id: 'soubory',
      nazev: 'Soubory',
      popis: 'Ukládej plány a poznámky k cílům',
      ikona: 'file-manager',
      barva: 'cyan',
      onClick: () => {
        setActiveAppId('file-manager', '/growth')
        navigate('/apps')
      },
    },
    {
      id: 'apps',
      nazev: 'Apps',
      popis: 'Goal Tracker a další nástroje na růst',
      ikona: 'grid',
      barva: 'purple',
      onClick: () => setAppsOtevrene(true),
    },
  ]

  return (
    <>
      <FlagshipShell
        nazev="Growth Room"
        popisHlavicky="Rosti krok za krokem"
        ikonaHlavicky="goal-tracker"
        velkeKarty={velkeKarty}
        notifOpen={notifOpen}
        onOpenNotifications={() => setNotifOpen(true)}
        onCloseNotifications={() => setNotifOpen(false)}
      >
        <div className="gro-panel">
          <div className="gro-panel-hlavicka">
            <div>
              <h2>Moje cíle</h2>
              <p>{doneCount} z {totalCount} splněno</p>
            </div>
            <button className="gro-historie-btn" aria-label="Otevřít Goal Tracker" onClick={otevritGoalTracker}>
              <AppIcon name="goal-tracker" size={18} />
            </button>
          </div>

          {totalCount === 0 ? (
            <p className="gro-prazdno">Zatím nemáš žádný cíl. Založ první v Goal Trackeru.</p>
          ) : nahledCilu.length === 0 ? (
            <p className="gro-prazdno">Všechny cíle jsou splněné! 🎉</p>
          ) : (
            <div className="gro-cile-seznam">
              {nahledCilu.map(({ goal, percent }) => (
                <div key={goal.id} className="gro-cil-radek">
                  <div className="gro-cil-text">
                    <span className="gro-cil-nazev">{goal.title}</span>
                    <span className="gro-cil-hodnota">
                      {goal.current} / {goal.target} {goal.unit}
                    </span>
                  </div>
                  <div className="gro-cil-lista" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                    <div className="gro-cil-vypln" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="gro-panel">
          <div className="gro-panel-hlavicka">
            <h2>Úroveň &amp; odznaky</h2>
            <button className="gro-zobrazit-vse" onClick={() => navigate('/odmeny')}>
              Zobrazit vše ›
            </button>
          </div>

          <div className="gro-staty">
            <div className="gro-stat-radek">
              <span className="gro-stat-ikona fs-barva--pink">
                <AppIcon name="star-filled" size={18} />
              </span>
              <span className="gro-stat-text">
                <span className="gro-stat-nazev">Úroveň</span>
                <span className="gro-stat-hodnota">Level {level}</span>
              </span>
              <span className="gro-stat-vedlejsi">
                {xp} / {xpDoDalsi} XP
              </span>
            </div>

            <div className="gro-xp-lista" role="progressbar" aria-valuenow={progres} aria-valuemin={0} aria-valuemax={100}>
              <div className="gro-xp-vypln" style={{ width: `${progres}%` }} />
            </div>

            <div className="gro-stat-radek">
              <span className="gro-stat-ikona fs-barva--orange">
                <AppIcon name="flame" size={18} />
              </span>
              <span className="gro-stat-text">
                <span className="gro-stat-nazev">Streak</span>
                <span className="gro-stat-hodnota">{streakDays} {streakDays === 1 ? 'den' : 'dní'} v řadě</span>
              </span>
            </div>

            <div className="gro-stat-radek">
              <span className="gro-stat-ikona fs-barva--cyan">
                <AppIcon name="star" size={18} />
              </span>
              <span className="gro-stat-text">
                <span className="gro-stat-nazev">Odznaky</span>
                <span className="gro-stat-hodnota">
                  {odemcenoOdznaku} / {badges.length} odemčeno
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="gro-panel">
          <div className="gro-panel-hlavicka">
            <h2>Rychlé akce</h2>
          </div>

          <div className="gro-akce-mrizka">
            <button className="gro-akce-dlazdice" onClick={otevritGoalTracker}>
              <span className="gro-text--pink">
                <AppIcon name="plus" size={22} />
              </span>
              <span className="gro-akce-nazev">Nový cíl</span>
            </button>
            <button className="gro-akce-dlazdice" onClick={() => navigate('/odmeny')}>
              <span className="gro-text--purple">
                <AppIcon name="star-filled" size={22} />
              </span>
              <span className="gro-akce-nazev">Moje odměny</span>
            </button>
          </div>
        </div>
      </FlagshipShell>

      {appsOtevrene && <NastrojeSheet nadpis="Apps" nastroje={nastroje} onZavrit={() => setAppsOtevrene(false)} />}
    </>
  )
}

export default GrowthRoomModule
