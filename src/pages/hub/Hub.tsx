import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useAppStore } from '@/core/store/useAppStore'
import { useStudyPlanner } from '@/miniapps/study-planner/useStudyPlanner'
import { getLevelProgress } from '@/core/utils/gamificationUtils'
import { sklonujUkoly } from '@/core/utils/text'
import { exportFullBackup, importDataFromJson, restoreFullBackup } from '@/core/utils/backup'
import {
  SNAPSHOT_SOURCE_LABEL,
  SnapshotInfo,
  autoSnapshotIfDue,
  deleteSnapshot,
  formatSnapshotDate,
  formatSnapshotSize,
  getSnapshot,
  listSnapshots,
  saveSnapshot,
} from '@/core/utils/backupHistory'
import mascot from '@/assets/mascot.png'
import './HubModule.css'

interface HubModuleProps {
  onLogout?: () => void
  onOpenApps?: () => void
  onOpenProfile?: () => void
  onOpenSettings?: () => void
  onTalk?: () => void
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
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<number | null>(null)

  // Zaznamenání aktivity při otevření Hubu pro započítání streaku
  useEffect(() => {
    recordActivity()
  }, [recordActivity])

  // Aplikace si sama drží posledních pár záloh, ať se má uživatel kam
  // vrátit, i když si soubor nikdy nestáhl.
  useEffect(() => {
    void autoSnapshotIfDue().then(() => listSnapshots().then(setSnapshots))
  }, [])

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

  const handleExportBackup = async () => {
    const ok = exportFullBackup()
    if (ok) {
      // Stejnou zálohu si necháme i v aplikaci, ať se dá vrátit bez souboru
      await saveSnapshot('manual')
      setSnapshots(await listSnapshots())
    }
    setCloudOpen(false)
    showToast(ok ? 'Záloha všech dat byla stažena.' : 'Zálohu se nepodařilo vytvořit.')
  }

  // Společný závěr obnovy — story jsou v paměti už zrehydratované,
  // nových hodnot v úložišti by si samy nevšimly.
  const finishRestore = (message: string) => {
    showToast(message)
    window.setTimeout(() => window.location.reload(), 1200)
  }

  const handleRestoreSnapshot = async (info: SnapshotInfo) => {
    const snapshot = await getSnapshot(info.id)
    if (!snapshot) {
      showToast('Tuhle zálohu se nepodařilo načíst.')
      return
    }

    // Než přepíšeme současný stav, uložíme si ho — obnova jde takhle vzít zpět
    await saveSnapshot('before-restore')

    const result = restoreFullBackup(snapshot.payload)
    if (!result.success) {
      showToast(result.error ?? 'Zálohu se nepodařilo obnovit.')
      return
    }

    setCloudOpen(false)
    finishRestore(`Obnoveno ze zálohy z ${formatSnapshotDate(info.createdAt)}. Načítám znovu…`)
  }

  const handleDeleteSnapshot = async (id: string) => {
    await deleteSnapshot(id)
    setSnapshots(await listSnapshots())
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const data = await importDataFromJson<unknown>(file)

      // Současný stav si schováme, ať jde obnova vzít zpět
      await saveSnapshot('before-restore')

      const result = restoreFullBackup(data)

      if (!result.success) {
        showToast(result.error ?? 'Soubor není platná záloha.')
        return
      }

      // Nahraný soubor si necháme i v historii, ať se dá vybrat znovu
      if (!result.legacy) await saveSnapshot('file', data as never)

      finishRestore(
        result.legacy
          ? 'Obnoveno ze starší zálohy (jen seznam aplikací). Načítám znovu…'
          : `Obnoveno (${result.restored.length} částí). Načítám znovu…`
      )
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

          <button className="hub-btn-card" onClick={() => navigate('/obchod')}>
            <span className="hub-card-icon">🛍️</span>
            <span className="hub-card-text">
              <span className="hub-card-title">Shop</span>
              <span className="hub-card-sub">
                {/* Dokud nejsou platby, ať dlaždice neslibuje nákup */}
                Kredity, VIP a doplňky
              </span>
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

          <button className="hub-btn-card hub-btn-square" onClick={() => navigate('/hra')}>
            <span className="hub-card-icon">🎮</span>
            <span className="hub-card-title">Play</span>
            <span className="hub-card-sub">Buddyheim</span>
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

        {/* Spodní lišta.
            Hlasový režim se přesunul z prostředního tlačítka sem k ikoně —
            prostřední místo zabral Social. Zvuky Buddyho se přestěhovaly
            mezi ostatní přepínače do Nastavení. */}
        <div className="hub-bottom-bar">
          <button
            className={`hub-action-btn-icon ${onTalk ? '' : 'hub-action-btn-icon--soon'}`}
            aria-label={onTalk ? 'Hlasový režim' : 'Hlasový režim (připravuje se)'}
            onClick={onTalk ?? (() => showToast('Hlasový režim se připravuje.'))}
          >
            🎙️
          </button>

          <button className="hub-talk-btn" onClick={() => navigate('/social')}>
            👥 SOCIAL
          </button>

          <button
            className="hub-action-btn-icon"
            aria-label="Nastavení"
            onClick={onOpenSettings ?? (() => navigate('/nastaveni'))}
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
              nebo obnovit z dřívější zálohy. XP, úroveň a odznaky obnova nemění —
              ty ti zůstanou tak, jak sis je vysloužil.
            </p>

            <button className="hub-sheet-btn" onClick={() => { void handleExportBackup() }}>
              ⬇️ Stáhnout zálohu
            </button>

            <button className="hub-sheet-btn" onClick={() => fileInputRef.current?.click()}>
              ⬆️ Obnovit ze souboru
            </button>

            {/* Zálohy uložené v aplikaci — uživatel si vybere, kterou vrátit */}
            <div className="hub-snapshot-section">
              <span className="hub-snapshot-head">Zálohy v aplikaci</span>

              {snapshots.length === 0 ? (
                <p className="hub-snapshot-empty">
                  Zatím tu žádná není. Aplikace si jednu uloží sama, jakmile s ní chvíli pobudeš.
                </p>
              ) : (
                <ul className="hub-snapshot-list">
                  {snapshots.map((snapshot) => (
                    <li key={snapshot.id} className="hub-snapshot-item">
                      <button
                        className="hub-snapshot-restore"
                        onClick={() => { void handleRestoreSnapshot(snapshot) }}
                      >
                        <span className="hub-snapshot-date">{formatSnapshotDate(snapshot.createdAt)}</span>
                        <span className="hub-snapshot-meta">
                          {SNAPSHOT_SOURCE_LABEL[snapshot.source]} · {formatSnapshotSize(snapshot.sizeBytes)}
                        </span>
                      </button>
                      <button
                        className="hub-snapshot-delete"
                        aria-label={`Smazat zálohu z ${formatSnapshotDate(snapshot.createdAt)}`}
                        onClick={() => { void handleDeleteSnapshot(snapshot.id) }}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

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
