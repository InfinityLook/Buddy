import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useModulovyPrechod } from '@/core/navigation/useModulovyPrechod'
import { useInbox } from '@/social/inbox'
import { SocialIcon } from '@/social/components/SocialIcon'
import { AppBottomNav } from '@/components/AppBottomNav'
import { useModulovySwipe } from '@/core/navigation/useModulovySwipe'
import { useBuddyVoice } from '@/buddy/useBuddyVoice'
import { BuddyOverlay } from '@/buddy/BuddyOverlay'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useAppStore } from '@/core/store/useAppStore'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { getLevelProgress, getXpForNextLevel } from '@/core/utils/gamificationUtils'
import './HubModule.css'

interface HubModuleProps {
  onOpenApps?: () => void
  onOpenProfile?: () => void
  onTalk?: () => void
}

// Vlastní SVG ikony pro tři hlavní akční karty Hubu (Profil/Achievementy/
// Obchod) — appčina vlastní kresba přímo v tomhle souboru, ne emoji a ne
// sdílená SocialIcon (ta zůstává jen pro drobné doprovodné ikony v
// hlavičce a šipky/fajfky na kartách níž, kde jde jen o obecný "vede to
// dál"/"hotovo" symbol, ne o identitu tlačítka samotného).
const IkonaProfil: React.FC<{ size?: number }> = ({ size = 24 }) => (
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
    <circle cx="12" cy="7" r="4" />
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
  </svg>
)

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
  onTalk,
}) => {
  const navigate = useNavigate()
  // Jen tahle tři volání (Hub -> Social/Chat) — viz jeho vlastní komentář
  // a global.css's ::view-transition-*(root) pro proč jen dopředu.
  const prejit = useModulovyPrechod()
  const neprectene = useInbox((stav) => stav.neprectene)
  // Fáze 5 Social nav reworku — vodorovný swipe mezi Hub/Apps/Profil/
  // Nastavení, viz useModulovySwipe.ts's vlastní komentář.
  const swipe = useModulovySwipe()
  const { profile } = useProfileData()

  // Načtení gamifikačních dat ze storu
  const { level, xp, streakDays, badges, recordActivity } = useGamificationStore()

  // Store aplikací — používáme pro deep-link do konkrétní miniaplikace
  const { setActiveAppId } = useAppStore()

  const [toast, setToast] = useState<string | null>(null)
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
      {/* Fixní pozadí nočního parku + ztmavovací vrstva kvůli čitelnosti textu */}
      <div className="hub-bg" aria-hidden="true" />
      <div className="hub-bg-overlay" aria-hidden="true" />

      <div className="hub-container" onTouchStart={swipe.onTouchStart} onTouchEnd={swipe.onTouchEnd}>
        {/* Header — logo + krátký podtitul (appka nemá cizojazyčný text
            nikde jinde, takže "Your AI Companion" zůstalo počeštěné jako
            "Tvůj AI parťák", stejné znění, jaké appka už dřív měla pod
            koulí níž), tři akce (hledat/zvonek/avatar). Odhlášení je
            v Nastavení (settings-danger-btn tam), appka bez toho neměla
            jinou cestu ven z účtu. */}
        <header className="hub-header">
          <div className="hub-logo">
            <span className="hub-logo-mark">✦</span>
            <span className="hub-logo-textwrap">
              <span className="hub-logo-text">Buddy</span>
              <span className="hub-logo-tag">Tvůj AI parťák</span>
            </span>
          </div>

          <div className="hub-header-actions">
            <button
              className="hub-icon-btn"
              aria-label="Hledat"
              onClick={() => prejit('/social?zalozka=vyhledavac')}
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

        {/* Hero — appčin maskot teď sedí ve vlastním velkém, atmosférickém
            panelu místo samostatné sekce s podstavcem, a úroveň/série
            jsou přes něj přeložené jako dva rohové odznaky, stejné
            rozvržení jako v návrhu. Jádro koule dřív neslo abstraktní
            SVG tvář (viz git historie) — teď v něm sedí skutečný,
            uživatelem dodaný obrázek maskota (vlčí štěně, "YOUR AI
            COMPANION"), oříznutý na hlavu/ramena přesně na kruhový
            výřez. Ušní boule a plazmový vír zmizely spolu s ní — fotka
            už svoje uši i výraz nese sama, druhá vrstva by je jen
            překrývala. Záře/vlny/prstenec/oběžné dráhy zůstaly beze
            změny, protože na nich visí appčina existující reakce na
            hlasového Buddyho (.hub-orb--posloucha/--premysli/--mluvi
            níž v CSS) — ta funguje stejně dobře kolem fotky jako kolem
            staré abstraktní koule. */}
        <section className="hub-hero">
          <div className="hub-hero-atmosfera" aria-hidden="true" />

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
            {/* Pořadí v kódu určuje, co je nad čím: zadní dráha stojí
                před jádrem, a je tedy pod ním, přední až za ním. Z toho
                vzniká dojem, že tečky obíhají kolem, ne po něm. */}
            <span className="hub-orb-zare" />
            <span className="hub-orb-vlna" />
            <span className="hub-orb-vlna hub-orb-vlna--druha" />
            <span className="hub-orb-obezna hub-orb-obezna--zad" />
            <span className="hub-orb-prstenec" />
            <span className="hub-orb-jadro">
              <img src="/maskot/buddy-vlk.png" alt="Buddy" className="hub-orb-maskot" />
            </span>
            <span className="hub-orb-obezna hub-orb-obezna--pred" />
          </div>

          {/* Rohové odznaky přes hero panel — oba teď nahoře (šestiúhelník
              s úrovní vlevo, ohnivá série vpravo), ne diagonálně jako
              v původním návrhu — úroveň se z dolního rohu přesunula sem,
              ať zůstane hned vidět i bez scrollování na krátkých
              obrazovkách. */}
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
        </section>

        {buddyOtevreny && <BuddyOverlay voice={buddyVoice} onZavrit={zavritBuddyho} />}

        {/* Bývalé místo denní výzvy — appka ji celou odebrala (Planer je
            pořád v /apps, kdykoli otevřený), a na stejně velké tlačítko
            teď posadila druhý, rychlejší vstup do Profilu přímo
            z domovské obrazovky, hned pod hero panelem. Stejná cesta
            jako avatar/zvonek v hlavičce (handleProfileClick), jen blíž
            palci na dlouhé stránce. Vlastní SVG ikona (IkonaProfil výš),
            ne emoji jako bývalá výzva. */}
        <button className="hub-profile-card" onClick={handleProfileClick}>
          <span className="hub-profile-icon" aria-hidden="true">
            <IkonaProfil size={24} />
          </span>

          <span className="hub-profile-body">
            <span className="hub-profile-tag">TVŮJ ÚČET</span>
            <span className="hub-profile-title">Profil</span>
            <span className="hub-profile-sub">
              Úroveň {level} · {profile.name}
            </span>
          </span>

          <span className="hub-profile-corner" aria-hidden="true">
            <SocialIcon name="send" size={13} />
          </span>
        </button>

        {/* Horní mřížka — jen Rewards a Shop teď, vedle sebe. Vlastní cesta
            do Profilu je teď na dvou místech (hlavička + karta výš), druhé
            tlačítko na to samé v týhle mřížce by bylo nadbytečné; Cloud
            (zálohování dat) se přesunul do Nastavení, viz settings-zaloha-* v
            SettingsModule.tsx. Ikona nahoře vlevo v barevném čtverci,
            šipka v kolečku nahoře vpravo, titulek/popisek/(progress)
            pod nimi — stejné rozvržení karty, jaké má návrh. */}
        <div className="hub-grid-top">
          <button className="hub-action-card" onClick={handleRewardsClick}>
            <span className="hub-action-top">
              <span className="hub-action-icon hub-action-icon--purple">
                <IkonaAchievementy size={22} />
              </span>
              <span className="hub-action-arrow hub-action-arrow--purple" aria-hidden="true">
                <SocialIcon name="arrow-left" size={13} />
              </span>
            </span>
            <span className="hub-action-title">Achievementy</span>
            <span className="hub-action-sub">
              {unlockedBadges} z {badges.length} obdrženo
            </span>
            <span className="hub-action-progress" aria-hidden="true">
              <span
                className="hub-action-progress-fill"
                style={{ width: `${badges.length > 0 ? (unlockedBadges / badges.length) * 100 : 0}%` }}
              />
            </span>
          </button>

          <button className="hub-action-card" onClick={() => navigate('/obchod')}>
            <span className="hub-action-top">
              <span className="hub-action-icon hub-action-icon--magenta">
                <IkonaObchod size={22} />
              </span>
              <span className="hub-action-arrow hub-action-arrow--magenta" aria-hidden="true">
                <SocialIcon name="arrow-left" size={13} />
              </span>
            </span>
            <span className="hub-action-title">Obchod</span>
            {/* Dokud nejsou platby, ať dlaždice neslibuje nákup */}
            <span className="hub-action-sub">Kredity, VIP a doplňky</span>
          </button>
        </div>

        {/* Velká ilustrovaná mřížka 2×2 — Hry/Social Chat/Aplikace/Library.
            Dřív tu byla i druhá dlaždice "Play" mířící na to samé /hra
            jako "Hry" — zbytečná duplicita, ne druhý poctivý vstup (na
            rozdíl od Economy Roomovy čtveřice Rychlých akcí, kde všechny
            čtyři vedou na tutéž Finance z reálně odlišných důvodů). Na
            jejím místě je teď Library — dřív zmenšená na tenký řádek
            pod mřížkou, teď zpátky jako plná dlaždice, pořád ale jasně
            BRZY (appka na ni nemá obsah), ne tvářená jako hotová
            funkce. Social Chat je nová dlaždice, dřív šel Social
            z Hubu jen přes lupu/dolní lištu. */}
        <div className="hub-grid-squares">
          <button className="hub-btn-card hub-btn-square hub-btn-square--play" onClick={() => navigate('/hra')}>
            <span className="hub-square-head">
              <SocialIcon name="gamepad" size={17} className="hub-square-icon hub-square-icon--purple" />
              <span className="hub-card-title">Hry</span>
            </span>
            <span className="hub-square-preview hub-square-preview--play" aria-hidden="true" />
            <span className="hub-card-sub">Svět plný dobrodružství</span>
            <span className="hub-square-arrow hub-square-arrow--purple" aria-hidden="true">
              <SocialIcon name="arrow-left" size={14} />
            </span>
          </button>

          <button
            className="hub-btn-card hub-btn-square hub-btn-square--social"
            onClick={() => prejit('/social?zalozka=chaty')}
          >
            <span className="hub-square-head">
              <SocialIcon name="chat" size={17} className="hub-square-icon hub-square-icon--purple" />
              <span className="hub-card-title">Social Chat</span>
            </span>
            <span className="hub-square-preview hub-square-preview--social" aria-hidden="true">
              <SocialIcon name="chat" size={34} />
            </span>
            <span className="hub-card-sub">Přátelé, chaty, komunita</span>
            <span className="hub-square-arrow hub-square-arrow--purple" aria-hidden="true">
              <SocialIcon name="arrow-left" size={14} />
            </span>
          </button>

          <button className="hub-btn-card hub-btn-square" onClick={handleAppsClick}>
            <span className="hub-square-head">
              <SocialIcon name="grid" size={17} className="hub-square-icon hub-square-icon--cyan" />
              <span className="hub-card-title">Aplikace</span>
            </span>
            <span className="hub-square-preview hub-square-preview--apps" aria-hidden="true">
              <span>💬</span>
              <span>📊</span>
              <span>📝</span>
              <span>⚡</span>
            </span>
            <span className="hub-card-sub">Spusť si libovolnou aplikaci</span>
            <span className="hub-square-arrow hub-square-arrow--cyan" aria-hidden="true">
              <SocialIcon name="arrow-left" size={14} />
            </span>
          </button>

          <button
            className="hub-btn-card hub-btn-square hub-btn-square--library"
            onClick={() => showToast('Library se připravuje — materiály na ni teprve čekají.')}
          >
            <span className="hub-square-head">
              <SocialIcon name="book" size={17} className="hub-square-icon hub-square-icon--cyan" />
              <span className="hub-card-title">
                Library
                <span className="hub-badge-soon">BRZY</span>
              </span>
            </span>
            <span className="hub-square-preview hub-square-preview--library" aria-hidden="true">
              <SocialIcon name="book" size={34} />
            </span>
            <span className="hub-card-sub">Materiály a zdroje ke studiu</span>
            <span className="hub-square-arrow hub-square-arrow--cyan" aria-hidden="true">
              <SocialIcon name="arrow-left" size={14} />
            </span>
          </button>
        </div>

        {/* Spodní navigace — Fáze 4 Social nav reworku vytáhla tenhle
            blok do sdílené komponenty (src/components/AppBottomNav.tsx),
            appka ji teď vykresluje i mimo Hub (Apps/Profil/Nastavení).
            Vlastní useBuddyVoice/otevritBuddyho jde dovnitř přes onTalk,
            ať se prostřední kolečko drží stejné instance jako velká
            koule nad lištou (viz komponenty vlastní komentář). */}
        <AppBottomNav onTalk={onTalk ?? otevritBuddyho} />
      </div>

      {toast && <div className="hub-toast">{toast}</div>}
    </div>
  )
}

export default HubModule
