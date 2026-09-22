import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useModulovyPrechod } from '@/core/navigation/useModulovyPrechod'
import { SocialIcon } from '@/social/components/SocialIcon'
import { AppBottomNav } from '@/components/AppBottomNav'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useAppStore } from '@/core/store/useAppStore'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { getLevelProgress, getXpForNextLevel } from '@/core/utils/gamificationUtils'
import {
  ProfilNotifications,
  useNotificationItems,
} from '@/pages/profil/components/ProfilNotifications'
// Panel upozornění je sdílený s profilem včetně svých stylů — Hub, stejně
// jako AppModule.tsx, ho nikdy nedostane "zadarmo" (na rozdíl od
// ProfilModule.tsx samotného), takže potřebuje tenhle import navíc, ať
// vyskakovací panel nezůstane bez vzhledu.
import '@/pages/profil/ProfilModule.css'
import './HubModule.css'

interface HubModuleProps {
  onOpenApps?: () => void
  onOpenProfile?: () => void
}

// Vlastní SVG ikony pro dvě hlavní akční karty Hubu (Achievementy/Obchod) —
// appčina vlastní kresba přímo v tomhle souboru, ne emoji a ne sdílená
// SocialIcon (ta zůstává jen pro drobné doprovodné ikony v hlavičce a
// šipky/fajfky na kartách níž, kde jde jen o obecný "vede to dál"/"hotovo"
// symbol, ne o identitu tlačítka samotného).
const IkonaAchievementy: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
)

const IkonaObchod: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
)

export const HubModule: React.FC<HubModuleProps> = ({
  onOpenApps,
  onOpenProfile,
}) => {
  const navigate = useNavigate()
  // Jen tenhle jeden volání (Hub -> Social) — viz jeho vlastní komentář
  // a global.css's ::view-transition-*(root) pro proč jen dopředu.
  const prejit = useModulovyPrechod()
  const { profile, markNotificationRead } = useProfileData()

  // Skutečný náhled upozornění pod zvonkem — stejný sdílený panel a
  // stejná data (ProfilNotifications.tsx/useNotificationItems), jaké
  // appka už používá v AppModule.tsx/ProfilModule.tsx a v každé
  // vlajkové appce přes FlagshipShell.tsx. Zvonek dřív jen vedl do
  // Profilu s tečkou navíc — teď doopravdy ukáže poslední upozornění
  // rovnou tady, Profil zůstává jen pro "Zobrazit vše".
  const notifications = useNotificationItems()
  const maNeprectene = notifications.some((n) => !profile.readNotifications.includes(n.id))
  const [notifOpen, setNotifOpen] = useState(false)

  // Načtení gamifikačních dat ze storu
  const { level, xp, streakDays, badges, recordActivity } = useGamificationStore()

  // Store aplikací — používáme pro deep-link do konkrétní miniaplikace
  const { setActiveAppId } = useAppStore()

  // Zaznamenání aktivity při otevření Hubu pro započítání streaku
  useEffect(() => {
    recordActivity()
  }, [recordActivity])

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

  // Rewards otevře samostatný modul s odměnami (úroveň, série, odznaky)
  const handleRewardsClick = () => {
    navigate('/odmeny')
  }

  return (
    <div className="hub-page">
      {/* Fixní pozadí — fotka soumraku nad horami + ztmavovací gradient
          kvůli čitelnosti hlavičky/karet, ne holý gradient appky jako
          dřív (viz hub-bg.css's vlastní komentář pro proč a jak moc
          přitmavené). */}
      <div className="hub-bg" aria-hidden="true" />
      <div className="hub-bg-overlay" aria-hidden="true" />

      <div className="hub-container">
        {/* Header — logo ("BuddyZone", appka dřív pod ním měla ještě
            podtitul "Tvůj AI parťák", ten je pryč) + dvě akce (zvonek/
            avatar). Lupa, co tu dřív byla jako třetí ikona, se
            přestěhovala dolů do sdílené spodní lišty (AppBottomNav)
            místo tlačítka "Social" — Social zůstává dosažitelný přes
            velkou kartu níž a přes "Chat" v liště, tenhle jeden vstup
            navíc byl nadbytečný. Odhlášení je v Nastavení
            (settings-danger-btn tam), appka bez toho neměla jinou
            cestu ven z účtu. */}
        <header className="hub-header">
          <div className="hub-logo">
            <span className="hub-logo-mark">✦</span>
            <span className="hub-logo-text">BuddyZone</span>
          </div>

          <div className="hub-header-actions">
            <button className="hub-icon-btn" aria-label="Oznámení" onClick={() => setNotifOpen(true)}>
              <SocialIcon name="bell" size={19} />
              {maNeprectene && <span className="hub-icon-dot" aria-hidden="true" />}
            </button>

            <button className="hub-avatar-btn" aria-label="Profil" onClick={handleProfileClick}>
              <img src={profile.avatar} alt="" className="hub-avatar-img" />
              <span className="hub-avatar-dot" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Úroveň a série — appka dřív měla nad touhle řadou ještě celý
            hero panel s koulí maskota (a předtím ještě dřív rohové
            odznaky přes něj), obojí je pryč. Hlasový Buddy zůstává
            dosažitelný jen přes prostřední kolečko ve spodní liště —
            AppBottomNav si teď na tuhle stránku bere svou vlastní
            instanci useBuddyVoice stejně jako na Apps/Profil/Nastavení,
            Hub už žádnou kouli nemá, se kterou by ji musel sdílet. */}
        <div className="hub-hero-stats-row">
          <div className="hub-hero-level" aria-label={`Úroveň ${level}, ${xp} z ${xpDoDalsi} XP`}>
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
          </div>

          <div className="hub-hero-streak" aria-label={`${streakDays} dní v řadě`}>
            <span className="hub-streak-flame" aria-hidden="true">🔥</span>
            <span className="hub-streak-num">{streakDays}</span>
            <span className="hub-streak-label">DAYS STREAK</span>
          </div>
        </div>

        {/* PROZKOUMEJ — primární mřížka, kam appka doopravdy zve. Hry +
            Aplikace vedle sebe, Social jako široká, prominentní karta
            pod nimi (appka do něj investovala nejvíc ze všech svých
            funkcí, zaslouží si větší místo než malý čtvereček). Dřív tu
            byla i "Social Chat" dlaždice mířící na to samé
            /social?zalozka=chaty jako "Chat" ve spodní liště — čistá
            duplicita, pryč. Library (dřív čtvrtá dlaždice, jen BRZY
            toast) je taky pryč, appka na ni nemá obsah. Barvy mají
            teď systém, ne náhodu: fialová pro Hry, cyan pro Aplikace,
            magenta pro Social — tři jasně odlišené, zapamatovatelné
            barvy, žádná se neopakuje se sekcí "Tvůj pokrok" níž. */}
        <div className="hub-section">
          <span className="hub-section-label">Prozkoumej</span>
          <div className="hub-section-body">
            <div className="hub-card-row">
              <button className="hub-card hub-card--square" onClick={() => navigate('/hra')}>
                <span className="hub-card-icon-box hub-card-icon-box--violet">
                  <SocialIcon name="gamepad" size={18} />
                </span>
                <span className="hub-card-title">Hry</span>
                <span className="hub-card-sub">Svět plný dobrodružství</span>
                <span className="hub-card-arrow hub-card-arrow--violet" aria-hidden="true">
                  <SocialIcon name="arrow-left" size={13} />
                </span>
              </button>

              <button className="hub-card hub-card--square" onClick={handleAppsClick}>
                <span className="hub-card-icon-box hub-card-icon-box--cyan">
                  <SocialIcon name="grid" size={18} />
                </span>
                <span className="hub-card-title">Aplikace</span>
                <span className="hub-card-sub">Spusť si libovolnou aplikaci</span>
                <span className="hub-card-arrow hub-card-arrow--cyan" aria-hidden="true">
                  <SocialIcon name="arrow-left" size={13} />
                </span>
              </button>
            </div>

            <button
              className="hub-card hub-card--wide"
              onClick={() => prejit('/social')}
            >
              <span className="hub-card-icon-box hub-card-icon-box--magenta hub-card-icon-box--lg">
                <SocialIcon name="chat" size={21} />
              </span>
              <span className="hub-card-wide-text">
                <span className="hub-card-title">Social</span>
                <span className="hub-card-sub">Přátelé, chaty a novinky na jednom místě</span>
              </span>
              <span className="hub-card-arrow hub-card-arrow--magenta" aria-hidden="true">
                <SocialIcon name="arrow-left" size={14} />
              </span>
            </button>
          </div>
        </div>

        {/* TVŮJ POKROK — sekundární, tišší řádek. Oranžová (Achievementy)
            a série výš sdílejí stejnou teplou barvu schválně, obojí je
            "tvůj vlastní pokrok"; zelená (Obchod) je jasná asociace na
            kredity/peníze, žádná z obou barev se neopakuje s primární
            mřížkou nahoře. */}
        <div className="hub-section">
          <span className="hub-section-label">Tvůj pokrok</span>
          <div className="hub-card-row">
            <button className="hub-card hub-card--secondary" onClick={handleRewardsClick}>
              <span className="hub-card-secondary-top">
                <span className="hub-card-icon-box hub-card-icon-box--orange hub-card-icon-box--sm">
                  <IkonaAchievementy size={16} />
                </span>
                <span className="hub-card-arrow hub-card-arrow--orange hub-card-arrow--sm" aria-hidden="true">
                  <SocialIcon name="arrow-left" size={11} />
                </span>
              </span>
              <span className="hub-card-title hub-card-title--sm">Achievementy</span>
              <span className="hub-card-sub">
                {unlockedBadges} z {badges.length} obdrženo
              </span>
              <span className="hub-card-progress" aria-hidden="true">
                <span
                  className="hub-card-progress-fill hub-card-progress-fill--orange"
                  style={{ width: `${badges.length > 0 ? (unlockedBadges / badges.length) * 100 : 0}%` }}
                />
              </span>
            </button>

            <button className="hub-card hub-card--secondary" onClick={() => navigate('/obchod')}>
              <span className="hub-card-secondary-top">
                <span className="hub-card-icon-box hub-card-icon-box--green hub-card-icon-box--sm">
                  <IkonaObchod size={16} />
                </span>
                <span className="hub-card-arrow hub-card-arrow--green hub-card-arrow--sm" aria-hidden="true">
                  <SocialIcon name="arrow-left" size={11} />
                </span>
              </span>
              <span className="hub-card-title hub-card-title--sm">Obchod</span>
              <span className="hub-card-sub">Kredity, VIP a doplňky</span>
            </button>
          </div>
        </div>

        {/* Spodní navigace — Fáze 4 Social nav reworku vytáhla tenhle
            blok do sdílené komponenty (src/components/AppBottomNav.tsx),
            appka ji teď vykresluje i mimo Hub (Apps/Profil/Nastavení).
            Bez vlastního onTal propu — Hub už nemá kouli maskota, se
            kterou by hlasový Buddy musel sdílet stav, takže si lišta
            bere úplně svou vlastní instanci useBuddyVoice stejně jako
            na každé jiné stránce. */}
        <AppBottomNav />

        <ProfilNotifications
          open={notifOpen}
          readIds={profile.readNotifications}
          onMarkRead={markNotificationRead}
          onClose={() => setNotifOpen(false)}
        />
      </div>
    </div>
  )
}

export default HubModule
