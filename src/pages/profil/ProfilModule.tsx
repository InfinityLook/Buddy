import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useAppStore } from '@/core/store/useAppStore'
import { useGoalTracker } from '@/miniapps/goal-tracker/useGoalTracker'
import { getXpForNextLevel, getLevelProgress } from '@/core/utils/gamificationUtils'
import { fileToResizedDataUrl } from '@/utils/image'
import { APP_VERSION, applyUpdateNow, checkForUpdates, hasNewerVersion } from '@/core/utils/registerSW'
import { useProfileData } from './hooks/useProfileData'
import { useCloudStatus, syncNow } from '@/core/supabase/cloudSync'
import { ProfilNotifications } from './components/ProfilNotifications'
import { ProfilGoals } from './components/ProfilGoals'
import { ProfilToast } from './components/ProfilToast'
import './ProfilModule.css'

// Popis stavu synchronizace pro řádek v menu. Musí být srozumitelný
// i pro toho, kdo o Supabase nikdy neslyšel.
const CLOUD_LABELS: Record<string, string> = {
  off: 'Cloud není nastavený — data zůstávají jen v tomhle zařízení',
  connecting: 'Připojuji…',
  synced: 'XP a odznaky zálohované v cloudu',
  offline: 'Offline — odešle se, až bude signál',
  error: 'Synchronizace se nepovedla, klepni pro nový pokus',
}

export const ProfilModule: React.FC = () => {
  const navigate = useNavigate()
  const { level, xp, streakDays, badges } = useGamificationStore()
  const { setActiveAppId } = useAppStore()
  const { goals } = useGoalTracker()
  const { profile, updateProfile, markNotificationRead } = useProfileData()
  const cloudStatus = useCloudStatus((state) => state.status)

  const [notifOpen, setNotifOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [updateChecking, setUpdateChecking] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const showToast = (message: string) => {
    setToastMsg(message)
    window.setTimeout(() => setToastMsg(null), 2500)
  }

  // Ruční pojistka pro případ, že by si automatická aktualizace nevšimla
  // nové verze — třeba když telefon dlouho visel offline.
  const handleCheckUpdates = async () => {
    if (updateChecking) return
    if (!navigator.onLine) {
      showToast('Jsi offline — aktualizace zkusím později')
      return
    }

    setUpdateChecking(true)
    showToast('Kontroluji aktualizace…')
    try {
      const newer = await hasNewerVersion()
      if (newer) {
        showToast('Nová verze nalezena, načítám ji…')
        await applyUpdateNow()
        return
      }
      // I bez nové verze stojí za to pobídnout service worker,
      // kdyby náhodou uvízl na starém buildu.
      await checkForUpdates()
      showToast(`Máš nejnovější verzi (${APP_VERSION}) ✓`)
    } catch {
      showToast('Kontrolu se nepodařilo dokončit')
    } finally {
      setUpdateChecking(false)
    }
  }

  const handleAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      updateProfile({ avatar: dataUrl })
      showToast('Fotka aktualizována ✓')
    } catch {
      showToast('Obrázek se nepodařilo načíst')
    }
  }

  const xpToNext = getXpForNextLevel(level)
  const progressPercent = getLevelProgress(xp)
  const unlockedBadges = badges.filter((b) => b.unlockedAt !== null)

  return (
    <div className="profil-page">
      {/* Top Bar */}
      <div className="profil-top-bar">
        <div>
          <button
            onClick={() => navigate('/hub')}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.85rem',
              cursor: 'pointer',
              padding: 0,
              marginBottom: '0.5rem',
            }}
          >
            ← Zpět do Hubu
          </button>
          <h1 className="profil-title">Profil</h1>
        </div>
        <div className="profil-top-actions">
          <button className="profil-icon-btn" aria-label="Upozornění" onClick={() => setNotifOpen(true)}>🔔</button>
          <button className="profil-icon-btn" aria-label="Nastavení" onClick={() => navigate('/nastaveni')}>⚙️</button>
        </div>
      </div>

      {/* Main User Card */}
      <div className="profil-user-card">
        <div className="profil-user-main">
          <div className="profil-avatar-wrapper">
            <img src={profile.avatar} alt={profile.name} className="profil-avatar-img" />
            <button
              className="profil-avatar-edit"
              aria-label="Upravit fotku profilu"
              onClick={() => avatarInputRef.current?.click()}
            >
              ✏️
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarSelected}
            />
          </div>
          <div className="profil-user-info">
            <span className="profil-badge">✦ AI Student</span>
            <h2 className="profil-user-name">{profile.name}</h2>
            <p className="profil-user-bio">{profile.motto}</p>
            <span className="profil-user-email">✉ {profile.email || 'E-mail nevyplněn'}</span>
          </div>
        </div>

        {/* Level & Streak — reálná data z gamifikačního storu */}
        <div className="profil-progress-grid">
          <div className="profil-level-box">
            <div className="profil-box-head">
              <span>ÚROVEŇ {level} 👑</span>
            </div>
            <div className="profil-xp-bar-bg">
              <div className="profil-xp-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{xp} / {xpToNext} XP</span>
          </div>

          <div className="profil-streak-box">
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>DENNÍ SÉRIE</span>
            <div className="profil-streak-val">
              🔥 {streakDays}
            </div>
            <span style={{ fontSize: '0.6rem', color: '#64748b' }}>dní v řadě</span>
          </div>
        </div>
      </div>

      {/* Achievements & Goals */}
      <div className="profil-two-col">
        <div className="profil-col-card">
          <div className="profil-col-head">
            <span>Moje úspěchy</span>
            {/* Profil ukazuje jen odemčené odznaky, celý přehled včetně
                zamčených a podmínek žije v modulu Odměny. */}
            <button className="profil-link-btn" onClick={() => navigate('/odmeny')}>Zobrazit vše</button>
          </div>
          {unlockedBadges.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Zatím žádné odemčené odznaky. Začni studovat! 💪</p>
          ) : (
            unlockedBadges.map((badge) => (
              <div className="profil-list-item" key={badge.id}>
                <span className="profil-item-icon">{badge.icon}</span>
                <div className="profil-item-details">
                  <span className="profil-item-title">{badge.title}</span>
                  <span className="profil-item-sub">
                    {badge.unlockedAt ? new Date(badge.unlockedAt).toLocaleDateString('cs-CZ') : ''}
                  </span>
                </div>
                <span>✅</span>
              </div>
            ))
          )}
        </div>

        <ProfilGoals
          goals={goals}
          onShowAll={() => {
            setActiveAppId('goal-tracker', '/profil')
            navigate('/apps')
          }}
        />
      </div>

      {/* Settings Menu */}
      <div className="profil-settings-list">
        <div className="profil-menu-row" onClick={() => navigate('/nastaveni')}>
          <div className="profil-menu-left">
            <div className="profil-menu-icon">👤</div>
            <div className="profil-menu-text">
              <span className="profil-menu-title">Osobní informace</span>
              <span className="profil-menu-sub">Upravit jméno, e-mail a další údaje</span>
            </div>
          </div>
          <span className="profil-arrow">❯</span>
        </div>

        <div className="profil-menu-row" onClick={() => navigate('/nastaveni')}>
          <div className="profil-menu-left">
            <div className="profil-menu-icon">🛡️</div>
            <div className="profil-menu-text">
              <span className="profil-menu-title">Zabezpečení</span>
              <span className="profil-menu-sub">Heslo, přihlášení a ochrana účtu</span>
            </div>
          </div>
          <span className="profil-arrow">❯</span>
        </div>

        <div className="profil-menu-row profil-menu-row--soon" onClick={() => showToast('Vzhled aplikace bude brzy dostupný!')}>
          <div className="profil-menu-left">
            <div className="profil-menu-icon">🎨</div>
            <div className="profil-menu-text">
              <span className="profil-menu-title">Vzhled aplikace<span className="profil-badge-soon">BRZY</span></span>
              <span className="profil-menu-sub">Motiv, jazyk a další nastavení</span>
            </div>
          </div>
          <span className="profil-arrow">❯</span>
        </div>

        <div className="profil-menu-row profil-menu-row--soon" onClick={() => showToast('Nápověda bude brzy dostupná!')}>
          <div className="profil-menu-left">
            <div className="profil-menu-icon">❓</div>
            <div className="profil-menu-text">
              <span className="profil-menu-title">Nápověda a podpora<span className="profil-badge-soon">BRZY</span></span>
              <span className="profil-menu-sub">Často kladené otázky a kontakt</span>
            </div>
          </div>
          <span className="profil-arrow">❯</span>
        </div>

        <div className="profil-menu-row" onClick={() => { void syncNow() }}>
          <div className="profil-menu-left">
            <div className="profil-menu-icon">☁️</div>
            <div className="profil-menu-text">
              <span className="profil-menu-title">
                Synchronizace
                <span className={`profil-cloud-dot is-${cloudStatus}`} aria-hidden="true" />
              </span>
              <span className="profil-menu-sub">
                {CLOUD_LABELS[cloudStatus] ?? CLOUD_LABELS.off}
              </span>
            </div>
          </div>
          <span className="profil-arrow">❯</span>
        </div>

        <div className="profil-menu-row" onClick={() => { void handleCheckUpdates() }}>
          <div className="profil-menu-left">
            <div className="profil-menu-icon">🔄</div>
            <div className="profil-menu-text">
              <span className="profil-menu-title">Verze aplikace</span>
              <span className="profil-menu-sub">
                {updateChecking ? 'Kontroluji…' : `SchoolBuddy ${APP_VERSION} — klepni pro kontrolu aktualizací`}
              </span>
            </div>
          </div>
          <span className="profil-arrow">❯</span>
        </div>
      </div>

      <ProfilNotifications
        open={notifOpen}
        readIds={profile.readNotifications}
        onMarkRead={markNotificationRead}
        onClose={() => setNotifOpen(false)}
      />

      <ProfilToast message={toastMsg} />
    </div>
  )
}

export default ProfilModule
