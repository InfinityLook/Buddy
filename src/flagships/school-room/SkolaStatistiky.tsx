import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/core/store/useAppStore'
import { useStudyPlanner } from '@/miniapps/study-planner/useStudyPlanner'
import { useKalendar, naFormatDatumu } from '@/miniapps/kalendar/useKalendar'
import { usePomodoro } from '@/miniapps/pomodoro/usePomodoro'
import { useZnamky } from '@/miniapps/znamky/useZnamky'
import { celkovyVazenyPrumer, soucetKreditu, vazenyPrumerPredmetu } from '@/miniapps/znamky/types'
import { AppIcon } from '@/pages/app/components/AppIcon'
import '@/pages/app/AppModule.css'
import './SchoolRoomModule.css'

// ==========================================
// Vlastní celoobrazovková podstránka School Roomu se statistikami —
// dřív "Statistiky" dlaždice vedla na /odmeny (účtové skóre appky), teď
// vede sem: podrobnější rozpad reálných čísel ze tří appek, co v pokoji
// mají svou dlaždici (Planer/Kalendář/Pomodoro), stejná data jako panel
// "Moje přehled" na hlavní obrazovce, jen víc detailu na vlastní
// obrazovce místo tří řádků. Žádné vymyšlené číslo — všechno jde přímo
// z hooků, co tyhle appky už samy počítají. Týká se jen School Roomu
// (viz CLAUDE.md) — /odmeny appky samotné se nic nemění.
// ==========================================

export const SkolaStatistiky: React.FC = () => {
  const navigate = useNavigate()
  const setActiveAppId = useAppStore((s) => s.setActiveAppId)

  const { pendingCount, overdueCount, totalCount, tasks } = useStudyPlanner()
  const { dnySUdalosti, dnes, pocetUdalostiCelkem } = useKalendar()
  const { completedSessions } = usePomodoro()
  const { predmety } = useZnamky()

  // Semestrální přehled — kolik nesplněných úkolů z Planeru patří ke
  // kterému předmětu, spárováno prostým shodným názvem (case-insensitive,
  // ořezaný o mezery). Planerův subject je volný text, appka ho tu jen
  // ČTE proti Známkám, nic v Planeru se tímhle neomezuje ani nevynucuje.
  const pocetUkoluPodlePredmetu = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const task of tasks) {
      if (task.completed) continue
      const klic = task.subject.trim().toLowerCase()
      mapa.set(klic, (mapa.get(klic) ?? 0) + 1)
    }
    return mapa
  }, [tasks])

  const dnesniStr = naFormatDatumu(dnes.getFullYear(), dnes.getMonth(), dnes.getDate())
  const nadchazejiciUdalosti = useMemo(
    () => [...dnySUdalosti].filter((d) => d >= dnesniStr).length,
    [dnySUdalosti, dnesniStr]
  )

  const otevritMiniaplikaci = (id: string) => {
    setActiveAppId(id, '/skola/statistiky')
    navigate('/apps')
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <button className="app-back-btn" aria-label="Zpět" onClick={() => navigate('/skola')}>
          <AppIcon name="arrow-left" size={18} />
        </button>

        <div className="app-header-center">
          <div className="app-header-title-wrap">
            <AppIcon name="bar-chart" size={22} className="app-header-icon" />
            <h1>Statistiky</h1>
          </div>
          <p>Podrobný pohled na tvůj pokrok</p>
        </div>

        <div className="app-header-actions" />
      </header>

      <div className="sr-panel">
        <div className="sr-panel-hlavicka">
          <h2>Úkoly</h2>
          <button className="sr-otevrit-btn" onClick={() => otevritMiniaplikaci('study-planner')}>
            Otevřít Planer ›
          </button>
        </div>
        <div className="sr-staty">
          <div className="sr-stat-radek">
            <span className="sr-stat-ikona fs-barva--green">
              <AppIcon name="study-planner" size={18} />
            </span>
            <span className="sr-stat-text">
              <span className="sr-stat-nazev">Nesplněné</span>
              <span className="sr-stat-hodnota">{pendingCount > 0 ? pendingCount : 'Vše splněno! 🎉'}</span>
            </span>
          </div>
          <div className="sr-stat-radek">
            <span className="sr-stat-ikona fs-barva--pink">
              <AppIcon name="study-planner" size={18} />
            </span>
            <span className="sr-stat-text">
              <span className="sr-stat-nazev">Po termínu</span>
              <span className="sr-stat-hodnota">{overdueCount > 0 ? overdueCount : 'Žádný'}</span>
            </span>
          </div>
          <div className="sr-stat-radek">
            <span className="sr-stat-ikona fs-barva--purple">
              <AppIcon name="study-planner" size={18} />
            </span>
            <span className="sr-stat-text">
              <span className="sr-stat-nazev">Celkem založených</span>
              <span className="sr-stat-hodnota">{totalCount}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="sr-panel">
        <div className="sr-panel-hlavicka">
          <h2>Kalendář</h2>
          <button className="sr-otevrit-btn" onClick={() => otevritMiniaplikaci('kalendar')}>
            Otevřít Kalendář ›
          </button>
        </div>
        <div className="sr-staty">
          <div className="sr-stat-radek">
            <span className="sr-stat-ikona fs-barva--purple">
              <AppIcon name="calendar" size={18} />
            </span>
            <span className="sr-stat-text">
              <span className="sr-stat-nazev">Nadcházející události</span>
              <span className="sr-stat-hodnota">
                {nadchazejiciUdalosti > 0 ? nadchazejiciUdalosti : 'Žádné naplánované'}
              </span>
            </span>
          </div>
          <div className="sr-stat-radek">
            <span className="sr-stat-ikona fs-barva--cyan">
              <AppIcon name="calendar" size={18} />
            </span>
            <span className="sr-stat-text">
              <span className="sr-stat-nazev">Celkem událostí v kalendáři</span>
              <span className="sr-stat-hodnota">{pocetUdalostiCelkem > 0 ? pocetUdalostiCelkem : 'Zatím žádné'}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="sr-panel">
        <div className="sr-panel-hlavicka">
          <h2>Pomodoro</h2>
          <button className="sr-otevrit-btn" onClick={() => otevritMiniaplikaci('pomodoro')}>
            Otevřít Pomodoro ›
          </button>
        </div>
        <div className="sr-staty">
          <div className="sr-stat-radek">
            <span className="sr-stat-ikona fs-barva--orange">
              <AppIcon name="pomodoro" size={18} />
            </span>
            <span className="sr-stat-text">
              <span className="sr-stat-nazev">Dokončené bloky</span>
              <span className="sr-stat-hodnota">{completedSessions > 0 ? completedSessions : 'Zatím žádné'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Semestrální přehled — čtvrtá karta téhle obrazovky, řeší
          "přehled předmětů s kredity" propojením Známek (skutečné
          předměty/kredity/průměry) s Planerem (kolik nesplněných úkolů
          patří ke kterému). Žádný nový store, jen spojení dvou už
          existujících appek na jedné obrazovce. */}
      <div className="sr-panel">
        <div className="sr-panel-hlavicka">
          <h2>Předměty (semestr)</h2>
          <button className="sr-otevrit-btn" onClick={() => otevritMiniaplikaci('znamky')}>
            Otevřít Známky ›
          </button>
        </div>
        <div className="sr-staty">
          <div className="sr-stat-radek">
            <span className="sr-stat-ikona fs-barva--pink">
              <AppIcon name="grades" size={18} />
            </span>
            <span className="sr-stat-text">
              <span className="sr-stat-nazev">Celkový průměr</span>
              <span className="sr-stat-hodnota">
                {(() => {
                  const prumer = celkovyVazenyPrumer(predmety)
                  return prumer !== null ? prumer.toFixed(2) : 'Zatím žádné známky'
                })()}
              </span>
            </span>
          </div>
          <div className="sr-stat-radek">
            <span className="sr-stat-ikona fs-barva--cyan">
              <AppIcon name="grades" size={18} />
            </span>
            <span className="sr-stat-text">
              <span className="sr-stat-nazev">Kreditů celkem</span>
              <span className="sr-stat-hodnota">{soucetKreditu(predmety) > 0 ? soucetKreditu(predmety) : 'Žádné'}</span>
            </span>
          </div>
        </div>

        {predmety.length === 0 ? (
          <p className="sr-prazdno-text">Zatím žádné předměty — přidej je ve Známkách.</p>
        ) : (
          <ul className="sr-predmety-seznam">
            {predmety.map((p) => {
              const prumer = vazenyPrumerPredmetu(p)
              const ukoly = pocetUkoluPodlePredmetu.get(p.nazev.trim().toLowerCase()) ?? 0
              return (
                <li key={p.id} className="sr-predmety-radek">
                  <span className="sr-predmety-nazev">
                    {p.nazev}
                    {p.kredity > 0 && ` · ${p.kredity} kr.`}
                  </span>
                  <span className="sr-predmety-prumer">{prumer !== null ? prumer.toFixed(2) : '—'}</span>
                  <span className="sr-predmety-ukoly">{ukoly > 0 ? `${ukoly} úkolů` : ''}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default SkolaStatistiky
