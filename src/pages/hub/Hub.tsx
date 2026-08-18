import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useAppStore } from '@/core/store/useAppStore'
import { useStudyPlanner } from '@/miniapps/study-planner/useStudyPlanner'
import { getLevelProgress } from '@/core/utils/gamificationUtils'
import { exportFullBackup, importDataFromJson, restoreFullBackup } from '@/core/utils/backup'
import mascot from '@/assets/mascot.png'
import './HubModule.css'

interface HubModuleProps {
  onLogout?: () => void
  onOpenApps?: () => void
  onOpenProfile?: () => void
  onOpenSettings?: () => void
  onTalk?: () => void
}

// Skloňování počtu úkolů podle českých pravidel (1 úkol / 2–4 úkoly / 5+ úkolů)
const sklonujUkoly = (pocet: number) => {
  if (pocet === 1) return 'úkol'
  if (pocet >= 2 && pocet <= 4) return 'úkoly'
  return 'úkolů'
}

// Druhý pád názvu předmětu ("Matematika" → "matematiky"), ať věta zní přirozeně.
// Pokrývá běžné školní předměty, u ostatních zůstane název beze změny.
const predmetVeDruhemPade = (predmet: string) => {
  const nazev = predmet.trim().toLowerCase()
  if (!nazev) return nazev
  if (nazev.endsWith('a')) return `${nazev.slice(0, -1)}y` // matematika → matematiky
  if (nazev.endsWith('e') || nazev.endsWith('í')) return nazev // chemie → chemie
  return `${nazev}u` // dějepis → dějepisu
}

export const HubModule: React.FC<HubModuleProps> = ({
  onLogout,
  onOpenApps,
  onOpenProfile,
  onOpenSettings,
  onTalk,
}) => {
  const navigate = useNavigate()

  // Načtení gamifikačních dat ze storu
  const { level, xp, streakDays, badges, recordActivity } = useGamificationStore()

  // Store aplikací — používáme pro deep-link do konkrétní miniaplikace
  const { setActiveAppId } = useAppStore()

  // Reálné úkoly ze Study Planneru pro denní výzvu
  const { tasks } = useStudyPlanner()

  const [toast, setToast] = useState<string | null>(null)
  const [cloudOpen, setCloudOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<number | null>(null)

  // Zaznamenání aktivity při otevření Hubu pro započítání streaku
  useEffect(() => {
    recordActivity()
  }, [recordActivity])

  // Úklid časovače toastu při odmountování
  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const showToast = (message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }

  // Denní výzva se skládá z reálných nesplněných úkolů (předmět s jejich nejvyšším počtem)
  const dailyChallenge = useMemo(() => {
    const pending = tasks.filter((task) => !task.completed)
    if (pending.length === 0) {
      return 'Máš hotovo! Dnes tě nečekají žádné úkoly. 🎉'
    }

    const bySubject = pending.reduce<Record<string, number>>((acc, task) => {
      acc[task.subject] = (acc[task.subject] ?? 0) + 1
      return acc
    }, {})

    const [subject, count] = Object.entries(bySubject).sort((a, b) => b[1] - a[1])[0]
    const sloveso = count === 1 ? 'čeká' : 'čekají'
    return `Dnes tě ${sloveso} ${count} ${sklonujUkoly(count)} z ${predmetVeDruhemPade(subject)}`
  }, [tasks])

  const unlockedBadges = badges.filter((badge) => badge.unlockedAt !== null).length
  const progressPercent = getLevelProgress(xp)

  const handleAppsClick = () => {
    if (onOpenApps) {
      onOpenApps()
      return
    }
    // Vyčistíme případnou dříve otevřenou miniaplikaci, ať se zobrazí přehled
    setActiveAppId(null)
    navigate('/apps')
  }

  const handleProfileClick = () => {
    if (onOpenProfile) {
      onOpenProfile()
      return
    }
    navigate('/profil')
  }

  // Denní výzva otevře přímo Study Planner s úkoly; tlačítko Zpět v aplikaci
  // pak vrátí uživatele zpátky do Hubu, ne jen do seznamu aplikací.
  const handleChallengeClick = () => {
    setActiveAppId('study-planner', '/hub')
    navigate('/apps')
  }

  // Rewards otevře samostatný modul s odměnami (úroveň, série, odznaky)
  const handleRewardsClick = () => {
    navigate('/odmeny')
  }

  const handleExportBackup = () => {
    const ok = exportFullBackup()
    setCloudOpen(false)
    showToast(ok ? 'Záloha všech dat byla stažena.' : 'Zálohu se nepodařilo vytvořit.')
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const data = await importDataFromJson<unknown>(file)
      const result = restoreFullBackup(data)

      if (!result.success) {
        showToast(result.error ?? 'Soubor není platná záloha.')
        return
      }

      // Story jsou v paměti už zrehydratované, nových hodnot v úložišti by
      // si samy nevšimly — proto aplikaci načteme znovu.
      showToast(
        result.legacy
          ? 'Obnoveno ze starší zálohy (jen seznam aplikací). Načítám znovu…'
          : `Obnoveno (${result.restored.length} částí). Načítám znovu…`
      )
      window.setTimeout(() => window.location.reload(), 1200)
    } catch {
      showToast('Soubor není platná záloha.')
    } finally {
      event.target.value = ''
      setCloudOpen(false)
    }
  }

  return (
    <div className="hub-page">
      {/* Fixní pozadí nočního parku + ztmavovací vrstva kvůli čitelnosti textu */}
      <div className="hub-bg" aria-hidden="true" />
      <div className="hub-bg-overlay" aria-hidden="true" />

      <div className="hub-container">
        {/* Header */}
        <header className="hub-header">
          <div className="hub-logo">
            <span className="hub-logo-mark">✦</span>
            <span className="hub-logo-text">SchoolBuddy</span>
          </div>

          <div className="hub-header-right">
            {/* Dynamický badge s úrovní, XP a streakem */}
            <div className="hub-level-badge">
              <div className="hub-level-badge-inner">
                <span className="hub-level-line">
                  ⭐ ÚROVEŇ {level} ({xp} XP)
                  {streakDays > 0 && <> | 🔥 {streakDays} d</>}
                </span>
                <span className="hub-level-progress" aria-hidden="true">
                  <span className="hub-level-progress-fill" style={{ width: `${progressPercent}%` }} />
                </span>
              </div>
            </div>

            <button
              className="hub-logout-btn"
              aria-label="Odhlásit se"
              onClick={onLogout}
            >
              ➔
            </button>
          </div>
        </header>

        {/* Denní výzva — reálné úkoly ze Study Planneru */}
        <button className="hub-banner" onClick={handleChallengeClick}>
          <span className="hub-banner-tag">DENNÍ VÝZVA</span>
          <span className="hub-banner-text">{dailyChallenge}</span>
        </button>

        {/* Horní mřížka (Profil, Shop, Rewards, Cloud) */}
        <div className="hub-grid-top">
          <button className="hub-btn-card" onClick={handleProfileClick}>
            <span className="hub-card-icon">👤</span>
            <span className="hub-card-text">
              <span className="hub-card-title">Profil</span>
              <span className="hub-card-sub">Tvůj účet</span>
            </span>
          </button>

          <button
            className="hub-btn-card hub-btn-card--soon"
            onClick={() => showToast('Shop se připravuje — brzy tu budou vylepšení.')}
          >
            <span className="hub-card-icon">🛍️</span>
            <span className="hub-card-text">
              <span className="hub-card-title">
                Shop
                <span className="hub-badge-soon">BRZY</span>
              </span>
              <span className="hub-card-sub">Vylepšení a doplňky</span>
            </span>
          </button>

          <button className="hub-btn-card hub-btn-card--accent" onClick={handleRewardsClick}>
            <span className="hub-card-icon">🎁</span>
            <span className="hub-card-text">
              <span className="hub-card-title">
                Rewards
                <span className="hub-badge-new">NEW</span>
              </span>
              <span className="hub-card-sub">
                {unlockedBadges > 0 ? `Odemčeno ${unlockedBadges} z ${badges.length}` : 'Odměny a bonusy'}
              </span>
            </span>
          </button>

          <button className="hub-btn-card" onClick={() => setCloudOpen(true)}>
            <span className="hub-card-icon">☁️</span>
            <span className="hub-card-text">
              <span className="hub-card-title">Cloud</span>
              <span className="hub-card-sub">Uložená data</span>
            </span>
          </button>
        </div>

        {/* Maskot */}
        <section className="hub-pet-section">
          <img src={mascot} alt="Buddy" className="hub-pet-img" />
        </section>

        {/* Spodní mřížka (Apps, Play, Library) */}
        <div className="hub-grid-squares">
          <button className="hub-btn-card hub-btn-square" onClick={handleAppsClick}>
            <span className="hub-card-icon">🎛️</span>
            <span className="hub-card-title">Apps</span>
            <span className="hub-card-sub">Tvé aplikace</span>
          </button>

          <button
            className="hub-btn-card hub-btn-square hub-btn-card--soon"
            onClick={() => showToast('Sekce Play se připravuje — hry teprve vznikají.')}
          >
            <span className="hub-card-icon">🎮</span>
            <span className="hub-card-title">
              Play
              <span className="hub-badge-soon">BRZY</span>
            </span>
            <span className="hub-card-sub">Zábava a hry</span>
          </button>

          <button
            className="hub-btn-card hub-btn-square hub-btn-card--soon"
            onClick={() => showToast('Library se připravuje — materiály na ni teprve čekají.')}
          >
            <span className="hub-card-icon">📚</span>
            <span className="hub-card-title">
              Library
              <span className="hub-badge-soon">BRZY</span>
            </span>
            <span className="hub-card-sub">Učení a materiály</span>
          </button>
        </div>

        {/* Spodní lišta */}
        <div className="hub-bottom-bar">
          <button
            className="hub-action-btn-icon hub-action-btn-icon--soon"
            aria-label="Zvuk (připravuje se)"
            onClick={() => showToast('Zvuky Buddyho se připravují.')}
          >
            🔊
          </button>

          <button
            className={`hub-talk-btn ${onTalk ? '' : 'hub-talk-btn--soon'}`}
            onClick={onTalk ?? (() => showToast('Hlasový režim se připravuje.'))}
          >
            🎙️ PROMLUV SI SE MNOU
          </button>

          <button
            className="hub-action-btn-icon"
            aria-label="Nastavení"
            onClick={onOpenSettings ?? (() => navigate('/profil'))}
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Panel pro zálohování a obnovu dat */}
      {cloudOpen && (
        <div className="hub-sheet-backdrop" onClick={() => setCloudOpen(false)}>
          <div
            className="hub-sheet"
            role="dialog"
            aria-label="Uložená data"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="hub-sheet-title">☁️ Uložená data</h3>
            <p className="hub-sheet-desc">
              Data máš uložená přímo v zařízení. Můžeš si je zazálohovat do souboru
              nebo obnovit z dřívější zálohy.
            </p>

            <button className="hub-sheet-btn" onClick={handleExportBackup}>
              ⬇️ Stáhnout zálohu
            </button>

            <button className="hub-sheet-btn" onClick={() => fileInputRef.current?.click()}>
              ⬆️ Obnovit ze zálohy
            </button>

            <button className="hub-sheet-btn hub-sheet-btn--ghost" onClick={() => setCloudOpen(false)}>
              Zavřít
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={handleImportFile}
            />
          </div>
        </div>
      )}

      {toast && <div className="hub-toast">{toast}</div>}
    </div>
  )
}

export default HubModule
