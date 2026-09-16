import React, { useEffect, useMemo, useRef, useState } from 'react'
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
import { useStudyPlanner } from '@/miniapps/study-planner/useStudyPlanner'
import { getLevelProgress, getXpForNextLevel } from '@/core/utils/gamificationUtils'
import { sklonujUkoly } from '@/core/utils/text'
import './HubModule.css'

interface HubModuleProps {
  onOpenApps?: () => void
  onOpenProfile?: () => void
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

  // Reálné úkoly z Planeru pro denní výzvu
  const { tasks } = useStudyPlanner()

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

          {/* Rohové odznaky přes hero panel — šestiúhelník s úrovní
              vlevo dole, ohnivá série vpravo nahoře, přesně rozložení
              z návrhu, jen bez fotky pod nimi. */}
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

        {/* Denní výzva — reálné úkoly z Planeru. */}
        <button className="hub-challenge-card" onClick={handleChallengeClick}>
          <span className="hub-challenge-icon" aria-hidden="true">🎯</span>

          <span className="hub-challenge-body">
            <span className="hub-challenge-tag">DENNÍ VÝZVA</span>
            <span className="hub-challenge-title">{dailyChallenge.title}</span>
            <span className="hub-challenge-sub">{dailyChallenge.subtitle}</span>
          </span>

          {dailyChallenge.done && (
            <span className="hub-challenge-pill">
              <SocialIcon name="check" size={13} /> DOKONČENO
            </span>
          )}

          <span className="hub-challenge-corner" aria-hidden="true">
            <SocialIcon name="send" size={13} />
          </span>
        </button>

        {/* Horní mřížka — jen Rewards a Shop teď, vedle sebe. Profil má
            svou vlastní cestu už v hlavičce (kolečko s avatarem), druhé
            tlačítko na to samé bylo zbytečné; Cloud (zálohování dat) se
            přesunul do Nastavení, viz settings-zaloha-* v
            SettingsModule.tsx. Ikona nahoře vlevo v barevném čtverci,
            šipka v kolečku nahoře vpravo, titulek/popisek/(progress)
            pod nimi — stejné rozvržení karty, jaké má návrh. */}
        <div className="hub-grid-top">
          <button className="hub-action-card" onClick={handleRewardsClick}>
            <span className="hub-action-top">
              <span className="hub-action-icon hub-action-icon--purple">
                <SocialIcon name="gift" size={22} />
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
                <SocialIcon name="bag" size={22} />
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
