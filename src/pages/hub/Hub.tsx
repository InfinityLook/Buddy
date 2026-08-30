import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInbox } from '@/social/inbox'
import { SocialIcon } from '@/social/components/SocialIcon'
import { useBuddyVoice } from '@/buddy/useBuddyVoice'
import { BuddyOverlay } from '@/buddy/BuddyOverlay'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useAppStore } from '@/core/store/useAppStore'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { useStudyPlanner } from '@/miniapps/study-planner/useStudyPlanner'
import { getLevelProgress, getXpForNextLevel } from '@/core/utils/gamificationUtils'
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
  onOpenApps,
  onOpenProfile,
  onOpenSettings,
  onTalk,
}) => {
  const navigate = useNavigate()
  const neprectene = useInbox((stav) => stav.neprectene)
  const { profile } = useProfileData()

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

  // Denní výzva — reálné nesplněné úkoly z Planeru (předmět s jejich
  // nejvyšším počtem). Rozdělené na title/subtitle kvůli dvouřádkové
  // kartě v novém rozvržení (viz redesign níž), stejná logika/data jako
  // dřív, jen jinak poskládaná pro zobrazení.
  const dailyChallenge = useMemo(() => {
    const pending = tasks.filter((task) => !task.completed)
    if (pending.length === 0) {
      return { done: true, title: 'Máš hotovo!', subtitle: 'Dnes tě nečekají žádné úkoly. 🎉' }
    }

    const bySubject = pending.reduce<Record<string, number>>((acc, task) => {
      acc[task.subject] = (acc[task.subject] ?? 0) + 1
      return acc
    }, {})

    const [subject, count] = Object.entries(bySubject).sort((a, b) => b[1] - a[1])[0]
    const sloveso = count === 1 ? 'Čeká' : 'Čekají'
    return {
      done: false,
      title: `${count} ${sklonujUkoly(count)}`,
      subtitle: `${sloveso} z ${predmetVeDruhemPade(subject)}`,
    }
  }, [tasks])

  const unlockedBadges = badges.filter((badge) => badge.unlockedAt !== null).length
  const progressPercent = getLevelProgress(xp)
  const xpDoDalsi = getXpForNextLevel(level)

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
        {/* Header — dřív tu byl textový odznak úrovně a tlačítko odhlášení,
            teď jen logo a tři akce (hledat/zvonek/avatar), ať hlavička
            zůstane lehká a úroveň dostane vlastní, čitelnější kartu níž.
            Odhlášení se přesunulo do Nastavení (settings-danger-btn tam),
            appka bez toho neměla jinou cestu ven z účtu, ne že by šlo
            jen o kosmetiku. */}
        <header className="hub-header">
          <div className="hub-logo">
            <span className="hub-logo-mark">✦</span>
            <span className="hub-logo-text">Buddy</span>
          </div>

          <div className="hub-header-actions">
            <button
              className="hub-icon-btn"
              aria-label="Hledat"
              onClick={() => navigate('/social?zalozka=vyhledavac')}
            >
              <SocialIcon name="search" size={19} />
            </button>

            <button className="hub-icon-btn" aria-label="Oznámení" onClick={handleProfileClick}>
              <SocialIcon name="bell" size={19} />
              {/* Zvonek jen naznačí, že něco čeká — appka tu neduplikuje
                  přesný výpočet zvonku z Profilu (ProfilNotifications.tsx),
                  jen počet nepřečtených zpráv, co Hub už má jinak v paměti
                  (useInbox). Skutečný přehled je hned za tímhle tlačítkem. */}
              {neprectene > 0 && <span className="hub-icon-dot" aria-hidden="true" />}
            </button>

            <button className="hub-avatar-btn" aria-label="Profil" onClick={handleProfileClick}>
              <img src={profile.avatar} alt="" className="hub-avatar-img" />
              <span className="hub-avatar-dot" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Úroveň — vlastní karta, dřív jen řádek textu v hlavičce.
            Šestiúhelníkový odznak s číslem úrovně (dvě číslice, jako
            appka vždycky formátovala) a řada s ohněm/dny série vpravo,
            ať je celá karta čitelná na jeden pohled, ne jen jeden dlouhý
            řádek. */}
        <section className="hub-level-card">
          <span className="hub-level-hex" aria-hidden="true">
            <span className="hub-level-hex-num">{String(level).padStart(2, '0')}</span>
          </span>

          <div className="hub-level-info">
            <span className="hub-level-title">LEVEL {level}</span>
            <span className="hub-level-xp">
              {xp} / {xpDoDalsi} XP
            </span>
            <span className="hub-level-progress" aria-hidden="true">
              <span className="hub-level-progress-fill" style={{ width: `${progressPercent}%` }} />
            </span>
          </div>

          <div className="hub-streak">
            <span className="hub-streak-flame" aria-hidden="true">🔥</span>
            <span className="hub-streak-num">{streakDays}</span>
            <span className="hub-streak-label">DAYS STREAK</span>
          </div>
        </section>

        {/* Denní výzva — reálné úkoly z Planeru, teď jako karta s vlastní
            ikonou a odznakem stavu vpravo místo jednořádkového banneru. */}
        <button className="hub-challenge-card" onClick={handleChallengeClick}>
          <span className="hub-challenge-icon" aria-hidden="true">🎯</span>

          <span className="hub-challenge-body">
            <span className="hub-challenge-tag">DAILY CHALLENGE</span>
            <span className="hub-challenge-title">{dailyChallenge.title}</span>
            <span className="hub-challenge-sub">{dailyChallenge.subtitle}</span>
          </span>

          {dailyChallenge.done && (
            <span className="hub-challenge-pill">
              <SocialIcon name="check" size={13} /> COMPLETED
            </span>
          )}

          <span className="hub-challenge-corner" aria-hidden="true">
            <SocialIcon name="send" size={13} />
          </span>
        </button>

        {/* Horní mřížka (Profil, Shop, Rewards, Cloud) — barevný odznak
            ikony vlevo, šipka vpravo, stejný "dlaždice vede dál" jazyk
            jako Social's vlastní seznamy (.social-nastaveni-sipka). */}
        <div className="hub-grid-top">
          <button className="hub-btn-card" onClick={handleProfileClick}>
            <span className="hub-card-icon hub-card-icon--blue">
              <SocialIcon name="user" size={24} />
            </span>
            <span className="hub-card-text">
              <span className="hub-card-title">Profil</span>
              <span className="hub-card-sub">Tvůj účet</span>
            </span>
            <SocialIcon name="arrow-left" size={14} className="hub-card-arrow" />
          </button>

          <button className="hub-btn-card" onClick={() => navigate('/obchod')}>
            <span className="hub-card-icon hub-card-icon--magenta">
              <SocialIcon name="bag" size={24} />
            </span>
            <span className="hub-card-text">
              <span className="hub-card-title">Shop</span>
              {/* Dokud nejsou platby, ať dlaždice neslibuje nákup */}
              <span className="hub-card-sub">Kredity, VIP a doplňky</span>
            </span>
            <SocialIcon name="arrow-left" size={14} className="hub-card-arrow" />
          </button>

          <button className="hub-btn-card" onClick={handleRewardsClick}>
            <span className="hub-card-icon hub-card-icon--purple">
              <SocialIcon name="gift" size={24} />
            </span>
            <span className="hub-card-text">
              <span className="hub-card-title">Rewards</span>
              <span className="hub-card-sub">
                {unlockedBadges} z {badges.length} odemčeno
              </span>
              <span className="hub-card-progress" aria-hidden="true">
                <span
                  className="hub-card-progress-fill"
                  style={{ width: `${badges.length > 0 ? (unlockedBadges / badges.length) * 100 : 0}%` }}
                />
              </span>
            </span>
            <SocialIcon name="arrow-left" size={14} className="hub-card-arrow" />
          </button>

          <button className="hub-btn-card" onClick={() => setCloudOpen(true)}>
            <span className="hub-card-icon hub-card-icon--cyan">
              <SocialIcon name="cloud" size={24} />
            </span>
            <span className="hub-card-text">
              <span className="hub-card-title">Cloud</span>
              <span className="hub-card-sub">Uložená data</span>
            </span>
            <SocialIcon name="arrow-left" size={14} className="hub-card-arrow" />
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
            {/* "Ušní" boule po stranách — spolu s očima/úsměvem dole dělají
                z koule přátelskou robotí tvář, ne jen abstraktní kouli. */}
            <span className="hub-orb-ucho hub-orb-ucho--leve" aria-hidden="true" />
            <span className="hub-orb-ucho hub-orb-ucho--prave" aria-hidden="true" />
            <span className="hub-orb-prstenec" />
            <span className="hub-orb-jadro">
              <span className="hub-orb-plazma" />
              {/* Tvář — stejný pár "očí" jako u malé koule v dolní liště
                  (hub-nav-orb-oko), jen větší a s úsměvem navíc. */}
              <svg className="hub-orb-tvar" viewBox="0 0 100 100" aria-hidden="true">
                <ellipse className="hub-orb-oko" cx="34" cy="42" rx="7" ry="11" />
                <ellipse className="hub-orb-oko" cx="66" cy="42" rx="7" ry="11" />
                <path className="hub-orb-usmev" d="M39 63 Q50 72 61 63" />
              </svg>
              <span className="hub-orb-lesk" />
            </span>
            <span className="hub-orb-obezna hub-orb-obezna--pred" />
          </div>

          {/* Podstavec + jméno pod koulí — dřív koule stála sama,
              bez popisku nebylo na první pohled jasné, co/kdo to je. */}
          <div className="hub-orb-podstavec" aria-hidden="true" />
          <div className="hub-orb-label">
            <span className="hub-orb-jmeno">Buddy</span>
            <span className="hub-orb-popis">Tvůj AI parťák</span>
          </div>
        </section>

        {buddyOtevreny && <BuddyOverlay voice={buddyVoice} onZavrit={zavritBuddyho} />}

        {/* Spodní mřížka (Apps, Play, Library) — kulaté tlačítko se
            šipkou v pravém dolním rohu každé dlaždice, celá dlaždice
            zůstává klikatelná jako dřív, šipka je jen vizuální nápověda. */}
        <div className="hub-grid-squares">
          <button className="hub-btn-card hub-btn-square" onClick={handleAppsClick}>
            <span className="hub-square-head">
              <SocialIcon name="grid" size={17} className="hub-square-icon hub-square-icon--cyan" />
              <span className="hub-card-title">Apps</span>
            </span>
            <span className="hub-square-preview hub-square-preview--apps" aria-hidden="true">
              <span>💬</span>
              <span>📊</span>
              <span>📝</span>
              <span>⚡</span>
            </span>
            <span className="hub-card-sub">Tvé aplikace</span>
            <span className="hub-square-arrow hub-square-arrow--cyan" aria-hidden="true">
              <SocialIcon name="arrow-left" size={14} />
            </span>
          </button>

          <button className="hub-btn-card hub-btn-square hub-btn-square--play" onClick={() => navigate('/hra')}>
            <span className="hub-square-head">
              <SocialIcon name="gamepad" size={17} className="hub-square-icon hub-square-icon--purple" />
              <span className="hub-card-title">Play</span>
            </span>
            <span className="hub-square-preview hub-square-preview--play" aria-hidden="true" />
            <span className="hub-card-sub">Buddyheim</span>
            <span className="hub-square-arrow hub-square-arrow--purple" aria-hidden="true">
              <SocialIcon name="arrow-left" size={14} />
            </span>
          </button>

          <button
            className="hub-btn-card hub-btn-square hub-btn-card--soon"
            onClick={() => showToast('Library se připravuje — materiály na ni teprve čekají.')}
          >
            <span className="hub-square-head">
              <SocialIcon name="book" size={17} className="hub-square-icon hub-square-icon--blue" />
              <span className="hub-card-title">
                Library
                <span className="hub-badge-soon">BRZY</span>
              </span>
            </span>
            <span className="hub-square-preview hub-square-preview--library" aria-hidden="true">📚</span>
            <span className="hub-card-sub">Učení a materiály</span>
            <span className="hub-square-arrow hub-square-arrow--blue" aria-hidden="true">
              <SocialIcon name="arrow-left" size={14} />
            </span>
          </button>
        </div>

        {/* Spodní navigace — pět položek s ikonou a popiskem, prostřední
            (Buddy) je vyvýšené kolečko, ne text jako zbytek. Dřív tu byl
            mikrofon + Social tlačítko + nastavení; hlasový režim teď
            vede přes tohle prostřední kolečko (stejná funkce, jen
            vizuálně povýšená), "Chat" míří rovnou na záložku Chaty
            v Socialu (?zalozka=chaty, viz SocialModule.tsx), "Social" na
            jeho domovskou obrazovku. */}
        <nav className="hub-bottom-nav">
          <button className="hub-nav-item hub-nav-item--active" aria-current="page">
            <SocialIcon name="home" size={20} />
            <span>Home</span>
          </button>

          <button className="hub-nav-item" onClick={() => navigate('/social')}>
            <SocialIcon name="users" size={20} />
            <span>Social</span>
          </button>

          <button className="hub-nav-orb" aria-label="Promluvit s Buddym" onClick={onTalk ?? otevritBuddyho}>
            <span className="hub-nav-orb-oko" />
            <span className="hub-nav-orb-oko" />
          </button>

          <button className="hub-nav-item" onClick={() => navigate('/social?zalozka=chaty')}>
            <span className="hub-nav-icon-wrap">
              <SocialIcon name="chat" size={20} />
              {neprectene > 0 && <span className="hub-nav-dot" aria-hidden="true" />}
            </span>
            <span>Chat</span>
          </button>

          <button className="hub-nav-item" onClick={onOpenSettings ?? (() => navigate('/nastaveni'))}>
            <SocialIcon name="settings" size={20} />
            <span>Settings</span>
          </button>
        </nav>
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
