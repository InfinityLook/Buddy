import React, { lazy, Suspense, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGamificationStore, DEFAULT_BADGES } from '@/core/store/useGamificationStore'
import { getXpForNextLevel, getLevelProgress } from '@/core/utils/gamificationUtils'
import { plural } from '@/core/utils/pluralCZ'
import { fileToResizedDataUrl } from '@/utils/image'
import { nahrajAvatarDoCloudu, nahrajBannerDoCloudu } from '@/core/supabase/avatarStorage'
import { isSupabaseConfigured } from '@/core/supabase/client'
import { resolveActiveFrameId } from '@/social/avatarFrames'
import { useProfileData } from './hooks/useProfileData'
import { useActiveRole } from '@/core/role'
import type { Badge } from '@/core/types/gamification.types'
import { ProfilNotifications, useNotificationItems } from './components/ProfilNotifications'
import { ProfilIcon } from './components/ProfilIcon'
import { ProfilToast } from './components/ProfilToast'
import { AppBottomNav } from '@/components/AppBottomNav'
import { useModulovySwipe } from '@/core/navigation/useModulovySwipe'
import './ProfilModule.css'

// Lazy — viz komentář nahoře v ProfilSocialniSekce.tsx: tenhle soubor
// natahuje celé Social API, který drtivá většina návštěv téhle (netlazy)
// stránky vůbec nepotřebuje.
const ProfilSocialniSekce = lazy(() => import('./components/ProfilSocialniSekce'))

export const ProfilModule: React.FC = () => {
  const navigate = useNavigate()
  // Fáze 5 Social nav reworku — vodorovný swipe mezi Hub/Apps/Profil/
  // Nastavení.
  const swipe = useModulovySwipe()
  const { level, xp, streakDays } = useGamificationStore()
  const { profile, updateProfile, markNotificationRead } = useProfileData()
  // Vyprší-li VIP, resolveActiveRoleId za tímhle hookem tiše spadne
  // zpátky na 'user' — tag proto vždycky odpovídá skutečně platné roli,
  // ne tomu, co je poslední uložené.
  const aktivniRole = useActiveRole()
  const notifications = useNotificationItems()
  const maNeprectene = notifications.some((n) => !profile.readNotifications.includes(n.id))

  // Stejné vyhodnocení jako u cizího profilu (VerejnyProfilDialog.tsx) —
  // rámeček se ověřuje při každém zobrazení, ne jen při výběru ve
  // VzhledARamecekSekce.tsx, ať appka nikdy nezobrazí VIP rámeček, kterému
  // mezitím vypršelo předplatné. `aktivniRole.id` je tu místo hodnoty
  // vrácené precti_verejny_profil() (ta je pro CIZÍ profil) — pro vlastní
  // appka rovnou zná skutečně platnou roli.
  const ramecek = resolveActiveFrameId(profile.frameId, aktivniRole.id)
  const ramecekStyl = ramecek
    ? ({ '--pa-a': ramecek.a, '--pa-b': ramecek.b } as React.CSSProperties)
    : undefined

  // Až 3 připnuté odznaky — appka je jinde (VerejnyProfilDialog.tsx) na
  // cizím profilu ukazuje taky, na vlastním profilu ale dosud chyběly.
  const pripnuteOdznaky: Badge[] = profile.pinnedBadges
    .map((id) => DEFAULT_BADGES.find((b) => b.id === id))
    .filter((b): b is Badge => b !== undefined)

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
    <div className="profil-page" onTouchStart={swipe.onTouchStart} onTouchEnd={swipe.onTouchEnd}>
      {/* Top Bar — ikony místo emoji (🔔/⚙️), stejná kruhová tlačítka
          jako Apps/Social, ne napůl hotový inline styl na textovém
          odkazu jak dřív mělo zpět tlačítko. */}
      <div className="profil-top-bar">
        <button className="profil-icon-btn" aria-label="Zpět do Hubu" onClick={() => navigate('/hub')}>
          <ProfilIcon name="arrow-left" size={18} />
        </button>
        <h1 className="profil-title">Profil</h1>
        <div className="profil-top-actions">
          <button className="profil-icon-btn" aria-label="Upozornění" onClick={() => setNotifOpen(true)}>
            <ProfilIcon name="bell" size={18} />
            {maNeprectene && <span className="profil-notif-badge" />}
          </button>
          <button className="profil-icon-btn" aria-label="Nastavení" onClick={() => navigate('/nastaveni')}>
            <ProfilIcon name="settings" size={18} />
          </button>
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
          <span className="profil-banner-edit">
            <ProfilIcon name="pencil" size={11} />
          </span>
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
            {/* Stejný prstenec (rámeček/výchozí gradient) jako appka
                ukazuje na cizím profilu (VerejnyProfilDialog.tsx) —
                dřív vlastní stránka rámeček vůbec nezobrazovala, takže
                si koupený/vybraný rámeček uživatel viděl jen očima
                svých přátel, nikdy ne na svém vlastním profilu. */}
            <div className={`profil-avatar-ring-wrap ${ramecek ? 'ma-ramecek' : ''}`} style={ramecekStyl}>
              <span className="profil-avatar-ring" aria-hidden="true" />
              <img src={profile.avatar} alt={profile.name} className="profil-avatar-img" />
            </div>
            <button
              className="profil-avatar-edit"
              aria-label="Upravit fotku profilu"
              onClick={() => avatarInputRef.current?.click()}
            >
              <ProfilIcon name="pencil" size={11} />
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
            {/* Delší bio text (na rozdíl od motta výš) appka dřív na
                vlastním profilu vůbec nevykreslovala, i když ho jde
                vyplnit v Osobních údajích a cizí lidi ho u tebe v
                Social vidí (VerejnyProfilDialog.tsx). */}
            {profile.bio && <p className="profil-user-bio-text">{profile.bio}</p>}
            {pripnuteOdznaky.length > 0 && (
              <div className="profil-pripnute-odznaky">
                {pripnuteOdznaky.map((b) => (
                  <span key={b.id} className="profil-pripnuty-odznak" title={b.title}>
                    {b.icon}
                  </span>
                ))}
              </div>
            )}
            <span className="profil-user-email">✉ {profile.email || 'E-mail nevyplněn'}</span>
          </div>
        </div>

        {/* Level & Streak — reálná data z gamifikačního storu */}
        <div className="profil-progress-grid">
          <div className="profil-level-box">
            <div className="profil-level-box-top">
              <span className="profil-level-badge">{level}</span>
              <div className="profil-level-info">
                <span className="profil-level-label">Úroveň {level} 👑</span>
                <span className="profil-level-xp-label">{xp} / {xpToNext} XP</span>
              </div>
            </div>
            <div className="profil-xp-bar-bg">
              <div className="profil-xp-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>

          <div className="profil-streak-box">
            <span className="profil-streak-label">Denní série</span>
            <div className="profil-streak-val">
              🔥 {streakDays}
            </div>
            <span className="profil-streak-sub">{plural(streakDays, 'den v řadě', 'dny v řadě', 'dní v řadě')}</span>
          </div>
        </div>
      </div>

      {/* Příspěvky, počty sledujících, sdílení vlastního kódu a přátelé —
          přesunuté ze Social's bývalé Profil záložky, viz
          ProfilSocialniSekce.tsx. */}
      <Suspense fallback={<p className="profil-lazy-fallback">Načítám…</p>}>
        <ProfilSocialniSekce />
      </Suspense>

      {/* Fáze 4 Social nav reworku (viz CLAUDE.md) — stejná sdílená
          lišta jako na Hubu/Apps/Nastavení. */}
      <AppBottomNav />

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
