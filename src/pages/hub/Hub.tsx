import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useModulovyPrechod } from '@/core/navigation/useModulovyPrechod'
import { SocialIcon } from '@/social/components/SocialIcon'
import { AppBottomNav } from '@/components/AppBottomNav'
import { useBuddyVoice } from '@/buddy/useBuddyVoice'
import { BuddyOverlay } from '@/buddy/BuddyOverlay'
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

// Jeden paprsek kruhového menu — šest jich jde kolem prostředního
// "BUDDY CORE" tlačítka, viz HubModule.css's vlastní komentář u
// .hub-wheel-petal pro úhly/souřadnice.
interface KoloPaprsek {
  id: string
  nazev: string
  ikona: string
  onClick: () => void
}

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
  const { level, xp, streakDays, recordActivity } = useGamificationStore()

  // Store aplikací — používáme pro deep-link do konkrétní miniaplikace
  const { setActiveAppId } = useAppStore()

  // Zaznamenání aktivity při otevření Hubu pro započítání streaku
  useEffect(() => {
    recordActivity()
  }, [recordActivity])

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

  // Hlasový Buddy — Hub si bere svou vlastní instanci useBuddyVoice
  // (stejně jako AppBottomNav na každé jiné obrazovce), ať paprsek "AI"
  // v kole jde otevřít přímo odtud, ne jen přes spodní lištu.
  const buddyVoice = useBuddyVoice()
  const [buddyOpen, setBuddyOpen] = useState(false)

  const otevritBuddyho = () => {
    buddyVoice.vycistit()
    setBuddyOpen(true)
  }

  const zavritBuddyho = () => {
    buddyVoice.zastavit()
    setBuddyOpen(false)
  }

  // Šest paprsků kolem prostředního tlačítka — nahrazuje dřívější kartové
  // sekce "Prozkoumej"/"Tvůj pokrok" naráz (appka do nich schválně
  // nedává nic navíc, ať se Shop/Rewards nezobrazují dvakrát). Rooms a
  // Apps vedou na stejné místo schválně — appčiny vlajkové roomy dnes
  // žijí nahoře na /apps (RoomCarousel), appka tam nemá druhou, oddělenou
  // obrazovku jen pro ně.
  const kolo: KoloPaprsek[] = [
    { id: 'ai', nazev: 'AI', ikona: '/icons/hub-wheel/ai.png', onClick: otevritBuddyho },
    { id: 'apps', nazev: 'Apps', ikona: '/icons/hub-wheel/apps.png', onClick: handleAppsClick },
    { id: 'shop', nazev: 'Shop', ikona: '/icons/hub-wheel/shop.png', onClick: () => navigate('/obchod') },
    { id: 'rewards', nazev: 'Rewards', ikona: '/icons/hub-wheel/rewards.png', onClick: handleRewardsClick },
    { id: 'rooms', nazev: 'Rooms', ikona: '/icons/hub-wheel/rooms.png', onClick: handleAppsClick },
    { id: 'social', nazev: 'Social', ikona: '/icons/hub-wheel/social.png', onClick: () => prejit('/social') },
  ]

  return (
    <div className="hub-page">
      {/* Fixní pozadí — fotka soumraku nad horami + ztmavovací gradient
          kvůli čitelnosti hlavičky/karet, ne holý gradient appky jako
          dřív (viz hub-bg.css's vlastní komentář pro proč a jak moc
          přitmavené). */}
      <div className="hub-bg" aria-hidden="true" />
      <div className="hub-bg-overlay" aria-hidden="true" />

      <div className="hub-container">
        {/* Header — vlčí/liščí maskot (stejná fotka, co appka má i jako
            prostřední tlačítko spodní lišty — public/maskot/buddy-vlk.png,
            žádný nový crop) místo dřívější ✦ značky, "BuddyZone" +
            podtitul "Lepší ty. Každý den." + dvě akce (zvonek/avatar).
            Lupa, co tu dřív byla jako třetí ikona, se přestěhovala dolů
            do sdílené spodní lišty (AppBottomNav) místo tlačítka
            "Social". Odhlášení je v Nastavení (settings-danger-btn tam),
            appka bez toho neměla jinou cestu ven z účtu. */}
        <header className="hub-header">
          <div className="hub-logo">
            <img src="/maskot/buddy-vlk.png" alt="" className="hub-logo-img" />
            <div className="hub-logo-text-col">
              <span className="hub-logo-text">BuddyZone</span>
              <span className="hub-logo-tagline">Lepší ty. Každý den.</span>
            </div>
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
            odznaky přes něj), obojí je pryč. Hlasový Buddy teď zase
            jde otevřít přímo z Hubu (paprsek "AI" v kole níž), vedle
            svých dalších vstupů ve spodní liště a na Apps/Profil/
            Nastavení — appka si pro něj bere vlastní instanci
            useBuddyVoice na každé z těchhle obrazovek zvlášť, žádná
            koule ke sdílení stavu mezi nimi není potřeba. */}
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

        {/* Kruhové menu — nahrazuje dřívější kartové sekce "Prozkoumej"
            a "Tvůj pokrok" naráz, viz appčin vlastní komentář u pole
            `kolo` výš. Prostřední tlačítko (B medailon, stejný obrázek
            jako paprsky — oříznuto z appkou dodané ikonové sady) vede
            do Profilu; šest paprsků jde na AI/Apps/Shop/Rewards/Rooms/
            Social, úhly a souřadnice viz HubModule.css. */}
        <div className="hub-wheel-wrap">
          <div className="hub-wheel">
            <button
              type="button"
              className="hub-wheel-center"
              onClick={handleProfileClick}
              aria-label="Profil"
            >
              <img src="/icons/hub-wheel/buddy-core.png" alt="" />
            </button>

            {kolo.map((paprsek) => (
              <button
                key={paprsek.id}
                type="button"
                className={`hub-wheel-petal hub-wheel-petal--${paprsek.id}`}
                onClick={paprsek.onClick}
              >
                <img src={paprsek.ikona} alt="" />
                <span className="hub-wheel-petal-label">{paprsek.nazev}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Spodní navigace — Fáze 4 Social nav reworku vytáhla tenhle
            blok do sdílené komponenty (src/components/AppBottomNav.tsx),
            appka ji teď vykresluje i mimo Hub (Apps/Profil/Nastavení).
            Bez vlastního onTal propu — lišta si bere úplně svou vlastní
            instanci useBuddyVoice, nezávislou na Hubovu vlastní (paprsek
            "AI" v kole výš), stejně jako na každé jiné stránce. */}
        <AppBottomNav />

        <ProfilNotifications
          open={notifOpen}
          readIds={profile.readNotifications}
          onMarkRead={markNotificationRead}
          onClose={() => setNotifOpen(false)}
        />

        {buddyOpen && <BuddyOverlay voice={buddyVoice} onZavrit={zavritBuddyho} />}
      </div>
    </div>
  )
}

export default HubModule
