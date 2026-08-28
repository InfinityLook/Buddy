import React, { lazy, Suspense, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { getXpForNextLevel, getLevelProgress } from '@/core/utils/gamificationUtils'
import { fileToResizedDataUrl } from '@/utils/image'
import { nahrajAvatarDoCloudu, nahrajBannerDoCloudu } from '@/core/supabase/avatarStorage'
import { isSupabaseConfigured } from '@/core/supabase/client'
import { useProfileData } from './hooks/useProfileData'
import { useActiveRole } from '@/core/role'
import { ProfilNotifications } from './components/ProfilNotifications'
import { ProfilToast } from './components/ProfilToast'
import './ProfilModule.css'

// Lazy — viz komentář nahoře v ProfilSocialniSekce.tsx: tenhle soubor
// natahuje celé Social API, který drtivá většina návštěv téhle (netlazy)
// stránky vůbec nepotřebuje.
const ProfilSocialniSekce = lazy(() => import('./components/ProfilSocialniSekce'))

export const ProfilModule: React.FC = () => {
  const navigate = useNavigate()
  const { level, xp, streakDays } = useGamificationStore()
  const { profile, updateProfile, markNotificationRead } = useProfileData()
  // Vyprší-li VIP, resolveActiveRoleId za tímhle hookem tiše spadne
  // zpátky na 'user' — tag proto vždycky odpovídá skutečně platné roli,
  // ne tomu, co je poslední uložené.
  const aktivniRole = useActiveRole()

  const [notifOpen, setNotifOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const showToast = (message: string) => {
    setToastMsg(message)
    window.setTimeout(() => setToastMsg(null), 2500)
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
      return
    }

    // Nahrání do cloudu je doplněk, ne podmínka — appka právě ukázala
    // "Fotka aktualizována ✓" bez ohledu na to, jak tohle dopadne.
    // Bez cloudu (isSupabaseConfigured === false) nemá kam nahrát.
    if (isSupabaseConfigured) {
      const url = await nahrajAvatarDoCloudu(file)
      if (url) showToast('Fotka viditelná i přátelům v Social ✓')
    }
  }

  // Banner nemá lokální obdobu jako avatar (viz useProfileData.ts) —
  // je vidět jen ostatním v Social, takže bez cloudu nemá smysl vůbec
  // zkoušet, na rozdíl od handleAvatarSelected výš.
  const handleBannerSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!isSupabaseConfigured) {
      showToast('Cover fotka potřebuje připojený cloud.')
      return
    }

    const url = await nahrajBannerDoCloudu(file)
    if (url) {
      updateProfile({ bannerUrl: url })
      showToast('Cover fotka nastavena ✓')
    } else {
      showToast('Nahrání se nepovedlo')
    }
  }

  const xpToNext = getXpForNextLevel(level)
  const progressPercent = getLevelProgress(xp)

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
        <button
          className="profil-banner"
          style={profile.bannerUrl ? { backgroundImage: `url(${profile.bannerUrl})` } : undefined}
          aria-label="Upravit cover fotku"
          onClick={() => bannerInputRef.current?.click()}
        >
          {!profile.bannerUrl && <span className="profil-banner-hint">🖼️ Přidat cover fotku</span>}
          <span className="profil-banner-edit">✏️</span>
        </button>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleBannerSelected}
        />

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
            <span className="profil-badge">✦ Buddy Parťák</span>
            {/* Obyčejný uživatel žádný další tag nedostává — je to
                výchozí stav, ne úspěch, který by stálo za to vyzdvihovat. */}
            {aktivniRole.id !== 'user' && (
              <span className={`profil-role-tag profil-role-tag--${aktivniRole.tone}`}>
                {aktivniRole.icon} {aktivniRole.title}
              </span>
            )}
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

      {/* Příspěvky, počty sledujících, sdílení vlastního kódu a přátelé —
          přesunuté ze Social's bývalé Profil záložky, viz
          ProfilSocialniSekce.tsx. */}
      <Suspense fallback={<p className="profil-lazy-fallback">Načítám…</p>}>
        <ProfilSocialniSekce />
      </Suspense>

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
