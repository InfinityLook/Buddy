import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInbox } from '@/social/inbox'
import { useBuddyVoice } from '@/buddy/useBuddyVoice'
import { BuddyOverlay } from '@/buddy/BuddyOverlay'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useAppStore } from '@/core/store/useAppStore'
import { useStudyPlanner } from '@/miniapps/study-planner/useStudyPlanner'
import { getLevelProgress } from '@/core/utils/gamificationUtils'
import { sklonujUkoly } from '@/core/utils/text'
import { importDataFromJson, restoreFullBackup } from '@/core/utils/backup'
import {
  exportFullBackupWithFiles,
  importZipBackup,
  jeZipZaloha,
  restoreFilesFromZip,
} from '@/core/utils/fileBackup'
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
  const neprectene = useInbox((stav) => stav.neprectene)

  // Načtení gamifikačních dat ze storu
  const { level, xp, streakDays, badges, recordActivity } = useGamificationStore()

  // Store aplikací — používáme pro deep-link do konkrétní miniaplikace
  const { setActiveAppId } = useAppStore()

  // Reálné úkoly z Planeru pro denní výzvu
  const { tasks } = useStudyPlanner()

  const [toast, setToast] = useState<string | null>(null)
  const [cloudOpen, setCloudOpen] = useState(false)
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<number | null>(null)

  // Hlasový Buddy. Hook žije tady, ne v BuddyOverlay — koule uprostřed
  // Hubu potřebuje jeho stav i ve chvíli, kdy je overlay zavřený (a proto
  // nevykreslený), aby na klepnutí mikrofonu zareagovala vizuálně sama.
  const buddyVoice = useBuddyVoice()
  const [buddyOtevreny, setBuddyOtevreny] = useState(false)

  const otevritBuddyho = () => {
    buddyVoice.vycistit()
    setBuddyOtevreny(true)
  }

  const zavritBuddyho = () => {
    buddyVoice.zastavit()
    setBuddyOtevreny(false)
  }

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

  // Denní výzva otevře přímo Planer s úkoly; tlačítko Zpět v aplikaci
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
    const ok = await exportFullBackupWithFiles()
    if (ok) {
      // Zálohu v aplikaci si necháme jen s metadaty (viz backupHistory.ts) —
      // obsah souborů leží ve stejné IndexedDB, kterou tenhle snímek
      // nepřepisuje, takže se vrácením v rámci JEDNOHO zařízení neztratí.
      // Chybět můžou až po přenosu na jiné zařízení, na to je zip výš.
      await saveSnapshot('manual')
      setSnapshots(await listSnapshots())
    }
    setCloudOpen(false)
    showToast(ok ? 'Záloha všech dat (i souborů) byla stažena.' : 'Zálohu se nepodařilo vytvořit.')
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
      // .zip = nová záloha i s obsahem souborů, .json = starší
      // metadata-only formát — obojí musí jít nahrát dál.
      const zipova = jeZipZaloha(file)
      const { envelope: data, soubory } = zipova
        ? await importZipBackup(file)
        : { envelope: await importDataFromJson<unknown>(file), soubory: new Map<string, Blob>() }

      // Současný stav si schováme, ať jde obnova vzít zpět
      await saveSnapshot('before-restore')

      const result = restoreFullBackup(data)

      if (!result.success) {
        showToast(result.error ?? 'Soubor není platná záloha.')
        return
      }

      // Nahraný soubor si necháme i v historii, ať se dá vybrat znovu
      if (!result.legacy) await saveSnapshot('file', data as never)

      const obnovenoSouboru = soubory.size > 0 ? await restoreFilesFromZip(soubory, data) : 0

      finishRestore(
        result.legacy
          ? 'Obnoveno ze starší zálohy (jen seznam aplikací). Načítám znovu…'
          : `Obnoveno (${result.restored.length} částí${
              obnovenoSouboru > 0 ? `, ${obnovenoSouboru} souborů` : ''
            }). Načítám znovu…`
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
            <span className="hub-logo-text">Buddy</span>
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

        {/* Denní výzva — reálné úkoly z Planeru */}
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
        {/* Pulzující kruh na místě, kde dřív seděl maskot.
            Maskot zůstal na úvodní obrazovce — tam má kolem sebe
            prostředí a je vidět celý, kdežto tady se na malém displeji
            mačkal a bral místo dlaždicím.

            Od hlasového Buddyho je to i tlačítko: klepnutím na kolečko
            (stejně jako na mikrofon dole) se otevře rozhovor a koule
            dostane třídu podle stavu (poslouchá/přemýšlí/mluví), aby
            reagovala vizuálně na to, co se právě děje. */}
        <section className="hub-orb-section">
          {/* Pořadí v kódu určuje, co je nad čím: zadní dráha stojí před
              jádrem, a je tedy pod ním, přední až za ním. Z toho vzniká
              dojem, že tečky obíhají kolem, ne po něm. */}
          <div
            className={`hub-orb ${buddyOtevreny ? `hub-orb--buddy hub-orb--${buddyVoice.stav}` : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Promluvit s Buddym"
            onClick={otevritBuddyho}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') otevritBuddyho()
            }}
          >
            <span className="hub-orb-zare" />
            <span className="hub-orb-vlna" />
            <span className="hub-orb-vlna hub-orb-vlna--druha" />
            <span className="hub-orb-obezna hub-orb-obezna--zad" />
            <span className="hub-orb-prstenec" />
            <span className="hub-orb-jadro">
              <span className="hub-orb-plazma" />
              <span className="hub-orb-lesk" />
            </span>
            <span className="hub-orb-obezna hub-orb-obezna--pred" />
          </div>
        </section>

        {buddyOtevreny && <BuddyOverlay voice={buddyVoice} onZavrit={zavritBuddyho} />}

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
            className="hub-action-btn-icon"
            aria-label="Hlasový režim"
            onClick={onTalk ?? otevritBuddyho}
          >
            🎙️
          </button>

          <button className="hub-talk-btn" onClick={() => navigate('/social')}>
            👥 SOCIAL
            {/* Číslo čekajících zpráv. Bez něj se o nové zprávě uživatel
                nedozvěděl, dokud Social sám neotevřel. */}
            {neprectene > 0 && (
              <span className="hub-talk-badge">{neprectene > 99 ? '99+' : neprectene}</span>
            )}
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
              (i s obsahem souborů ze Správce souborů) nebo obnovit z dřívější
              zálohy. XP, úroveň a odznaky obnova nemění — ty ti zůstanou tak,
              jak sis je vysloužil.
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
              accept=".zip,.json,application/zip,application/json"
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
