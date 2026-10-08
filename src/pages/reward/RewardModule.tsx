import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import {
  getLevelFromXp,
  getLevelProgress,
  getXpForNextLevel,
  nejblizsiOdznak,
  popisekPokrokuOdznaku,
  spocitejXpZaPoslednichNDni,
} from '@/core/utils/gamificationUtils'
import { sklonujDen } from '@/core/utils/text'
import { SocialIcon } from '@/social/components/SocialIcon'
import { AppBottomNav } from '@/components/AppBottomNav'
import './RewardModule.css'

// Kolik odznaků smí být na veřejném profilu vystavených najednou — víc
// by přestalo být "výběr toho nejlepšího" a bylo by to jen druhý,
// zkrácený seznam. Stejná mez jako CHECK constraint pripnute_odznaky_max_3
// na databázi (migrace social_faze2...), appka ji tady jen hlídá dřív,
// než by narazila na server.
const MAX_PRIPNUTYCH = 3

// Jak dlouho appka ukazuje "+N XP" bublinu nad odznakem úrovně — stejná
// hodnota a stejný efekt jako Hub.tsx's vlastní XpBublina, appka ho sem
// přinesla jedno ku jedné, ať obě obrazovky reagují na zisk XP úplně
// stejně (viz appčin komentář u efektu níž).
const TRVANI_XP_BUBLINY_MS = 1600

interface XpBublina {
  id: number
  castka: number
  levelUp: boolean
}

export const RewardModule: React.FC = () => {
  const navigate = useNavigate()
  const { level, xp, streakDays, badges, xpLog, hydratovano } = useGamificationStore()
  const { profile, updateProfile } = useProfileData()

  const prepnoutPripnuti = (badgeId: string) => {
    const jePripnuty = profile.pinnedBadges.includes(badgeId)
    if (jePripnuty) {
      updateProfile({ pinnedBadges: profile.pinnedBadges.filter((id) => id !== badgeId) })
      return
    }
    if (profile.pinnedBadges.length >= MAX_PRIPNUTYCH) return
    updateProfile({ pinnedBadges: [...profile.pinnedBadges, badgeId] })
  }

  const xpToNext = getXpForNextLevel(level)
  const progressPercent = getLevelProgress(xp)
  const xpRemaining = Math.max(0, xpToNext - xp)

  // Appka tyhle dva postřehy počítá stejně jako Hub.tsx — "tenhle týden"
  // a "nejblíž odznak" jsou skutečná, appkou dřív už spočítaná čísla,
  // ne nová logika jen pro tuhle obrazovku.
  const xpTydne = spocitejXpZaPoslednichNDni(xpLog)
  const nejblizsi = nejblizsiOdznak(xp, level, streakDays, badges)

  // "Udělej z levelu součást herního systému" — appka sem přinesla
  // Hubovu "+N XP" bublinu jedno ku jedné (včetně speciální "LEVEL UP"
  // varianty): appka xp porovnává proti předchozí hodnotě (ref, ne
  // state, appka kvůli tomu nechce druhý zbytečný re-render) a při
  // KAŽDÉM skutečném nárůstu bublinu na pár vteřin ukáže — appka tu
  // neví a nepotřebuje vědět, odkud XP přišlo, jen že přišlo.
  const predchoziXpRef = useRef(xp)
  const bublinaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [xpBublina, setXpBublina] = useState<XpBublina | null>(null)

  useEffect(() => {
    const predchozi = predchoziXpRef.current
    predchoziXpRef.current = xp
    if (xp <= predchozi) return
    const castka = xp - predchozi
    const levelUp = getLevelFromXp(xp) > getLevelFromXp(predchozi)
    setXpBublina({ id: Date.now(), castka, levelUp })

    if (bublinaTimeoutRef.current !== null) clearTimeout(bublinaTimeoutRef.current)
    bublinaTimeoutRef.current = setTimeout(() => {
      setXpBublina(null)
      bublinaTimeoutRef.current = null
    }, TRVANI_XP_BUBLINY_MS)

    return () => {
      if (bublinaTimeoutRef.current !== null) clearTimeout(bublinaTimeoutRef.current)
    }
  }, [xp])

  // Odemčené odznaky nahoru, zamčené pod ně — ať je hned vidět, co už je hotové
  const sortedBadges = useMemo(
    () =>
      [...badges].sort((a, b) => {
        if (!!a.unlockedAt === !!b.unlockedAt) return 0
        return a.unlockedAt ? -1 : 1
      }),
    [badges]
  )

  const unlockedCount = badges.filter((badge) => badge.unlockedAt !== null).length

  return (
    <div className="reward-page">
      {/* Pozadí — fixed vrstvy, viz appčin vlastní komentář u .reward-bg
          v RewardModule.css */}
      <div className="reward-bg" aria-hidden="true" />
      <div className="reward-bg-overlay" aria-hidden="true" />

      <div className="reward-content">
        {/* Hlavička — appka ji přestavěla do stejného jazyka jako Hub
            (fotka maskota + text vedle sebe, skutečné kruhové ikonové
            tlačítko místo plain textového "← Zpět do Hubu"), ne
            doslovné zopakování Hubova pozdravu podle denní doby — na
            vnořené obrazovce by to působilo jako zbytečné echo toho,
            co uživatel viděl před jedním kliknutím. */}
        <header className="reward-header">
          <button className="reward-icon-btn" aria-label="Zpět do Hubu" onClick={() => navigate('/hub')}>
            <SocialIcon name="arrow-left" size={18} />
          </button>
          <div className="reward-logo">
            <img src="/maskot/buddy-vlk.png" alt="" className="reward-logo-img" />
            <div className="reward-logo-text-col">
              <span className="reward-logo-text">Achievementy</span>
              <span className="reward-logo-tagline">Úroveň, série a odznaky</span>
            </div>
          </div>
        </header>

        {/* Úroveň a série — appka tuhle dvojici karet přestavěla ze
            staré jedné "souhrnné" karty na dvě samostatné, vedle sebe,
            přesně jako Hubova .hub-hero-stats-row. Šestiúhelníkový
            odznak se svítícím halem a +XP bublinou i zvětšená karta
            série jsou odsud beze změny přenesené — appka tím pádem obě
            obrazovky nechává reagovat na stejný stav (level/xp/série)
            vizuálně úplně stejně. Skeleton obrysy (hydratovano appka
            potřebuje stejně jako Hub) appka odvodila ze skutečných
            rozměrů toho, co nahrazují, ne z odhadu. */}
        <div className="reward-hero-row">
          <div
            className="reward-hero-level"
            aria-label={hydratovano ? `Úroveň ${level}, ${xp} z ${xpToNext} XP` : 'Načítání úrovně'}
          >
            {hydratovano ? (
              <>
                {xpBublina && (
                  <div
                    key={xpBublina.id}
                    className={`reward-xp-bublina${xpBublina.levelUp ? ' reward-xp-bublina--level-up' : ''}`}
                    aria-live="polite"
                  >
                    <span className="reward-xp-bublina-jiskry" aria-hidden="true">
                      <span className="reward-xp-bublina-jiskra">✦</span>
                      <span className="reward-xp-bublina-jiskra">✦</span>
                      <span className="reward-xp-bublina-jiskra">✦</span>
                    </span>
                    <span className="reward-xp-bublina-castka">
                      {xpBublina.levelUp ? `🎉 LEVEL ${level}! ` : ''}+{xpBublina.castka} XP
                    </span>
                  </div>
                )}
                <span className="reward-level-hex-wrap" aria-hidden="true">
                  <span className="reward-level-hex">
                    <span className="reward-level-hex-num">{level}</span>
                  </span>
                </span>
                <div className="reward-level-info">
                  <span className="reward-level-eyebrow">LEVEL</span>
                  <span className="reward-level-xp">
                    {xp} / {xpToNext} XP
                  </span>
                  <span className="reward-level-progress" aria-hidden="true">
                    <span className="reward-level-progress-fill" style={{ width: `${progressPercent}%` }} />
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="reward-skeleton reward-skeleton--circle" aria-hidden="true" />
                <div className="reward-skeleton-stack" aria-hidden="true">
                  <span className="reward-skeleton reward-skeleton--line-sm" />
                  <span className="reward-skeleton reward-skeleton--line" />
                </div>
              </>
            )}
          </div>

          <div
            className="reward-hero-streak"
            aria-label={hydratovano ? `${streakDays} dní v řadě` : 'Načítání série'}
          >
            {hydratovano ? (
              <>
                <span className="reward-streak-flame" aria-hidden="true">🔥</span>
                <span className="reward-streak-num">{streakDays}</span>
                <span className="reward-streak-label">DAYS STREAK</span>
              </>
            ) : (
              <>
                <span className="reward-skeleton reward-skeleton--circle-sm" aria-hidden="true" />
                <span className="reward-skeleton reward-skeleton--line-sm" aria-hidden="true" />
              </>
            )}
          </div>
        </div>

        {/* Postřehy — stejná "lehká vrstva, ne další těžká karta"
            zdrženlivost jako Hubovo .hub-insights, appka jen přidala
            třetí řádek ("ještě N XP do levelu") navíc, protože tahle
            obrazovka je o postupu samotném a Hub ten řádek nikdy
            neměl kam dát. Odznakový řádek appka schová celý, ne
            poloprázdný, když nejblizsiOdznak() vrátí null (viz appčin
            komentář u téhle funkce v gamificationUtils.ts). */}
        <div className="reward-insights">
          {hydratovano ? (
            <>
              <p className="reward-insight-line">
                <span className="reward-insight-icon" aria-hidden="true">🎯</span>
                {xpRemaining > 0 ? (
                  <>
                    Ještě <strong>{xpRemaining} XP</strong> a jsi na úrovni {level + 1}.
                  </>
                ) : (
                  'Máš nasbíráno na další úroveň — pokračuj a posuň se dál!'
                )}
              </p>
              <p className="reward-insight-line">
                <span className="reward-insight-icon" aria-hidden="true">📅</span>
                Tenhle týden: <strong>{xpTydne} XP</strong>
                {streakDays > 0 && (
                  <>
                    {' '}· {streakDays} {sklonujDen(streakDays)} v řadě
                  </>
                )}
              </p>
              {nejblizsi && (
                <p className="reward-insight-line">
                  <span className="reward-insight-icon" aria-hidden="true">{nejblizsi.badge.icon}</span>
                  Příští odznak: <strong>{nejblizsi.badge.title}</strong> (
                  {popisekPokrokuOdznaku(nejblizsi.badge.id, xp, level, streakDays)})
                </p>
              )}
            </>
          ) : (
            <>
              <span className="reward-skeleton reward-skeleton--line-insight" aria-hidden="true" />
              <span className="reward-skeleton reward-skeleton--line-insight" aria-hidden="true" />
            </>
          )}
        </div>

        {/* Odznaky — na rozdíl od profilu ukazujeme i ty zamčené i s podmínkou */}
        <section className="reward-section">
          <div className="reward-section-head">
            <span>Odznaky</span>
            <span className="reward-section-count">{unlockedCount} z {badges.length}</span>
          </div>

          <div className="reward-badge-grid">
            {sortedBadges.map((badge) => {
              const unlocked = badge.unlockedAt !== null
              const pripnuty = profile.pinnedBadges.includes(badge.id)

              return (
                <article
                  key={badge.id}
                  className={`reward-badge-card ${unlocked ? 'is-unlocked' : 'is-locked'}`}
                >
                  <span className="reward-badge-icon" aria-hidden="true">
                    {unlocked ? badge.icon : <SocialIcon name="lock" size={18} />}
                  </span>
                  <div className="reward-badge-text">
                    <span className="reward-badge-title">{badge.title}</span>
                    <span className="reward-badge-desc">{badge.description}</span>
                    <span className={`reward-badge-state ${unlocked ? 'is-unlocked' : ''}`}>
                      {unlocked && badge.unlockedAt ? (
                        <>
                          <SocialIcon name="check" size={11} /> Odemčeno {new Date(badge.unlockedAt).toLocaleDateString('cs-CZ')}
                        </>
                      ) : (
                        'Zatím zamčeno'
                      )}
                    </span>
                  </div>
                  {/* Vystavení na veřejném profilu (VerejnyProfilDialog.tsx) —
                      jen u odemčených, appka nedovolí připnout něco, co
                      uživatel ještě nemá. Ikona appka vzala ze stejné
                      sady jako Hub (SocialIcon) místo holého emoji 📌 —
                      bookmark/bookmark-filled jde navíc sám o sobě
                      přečíst jako "připnuto/nepřipnuto", ne jen "tohle
                      je nějaké tlačítko". */}
                  {unlocked && (
                    <button
                      className={`reward-badge-pin ${pripnuty ? 'je-pripnuty' : ''}`}
                      aria-label={pripnuty ? `Zrušit vystavení odznaku ${badge.title}` : `Vystavit odznak ${badge.title} na profilu`}
                      disabled={!pripnuty && profile.pinnedBadges.length >= MAX_PRIPNUTYCH}
                      onClick={() => prepnoutPripnuti(badge.id)}
                    >
                      <SocialIcon name={pripnuty ? 'bookmark-filled' : 'bookmark'} size={14} />
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        {/* "Jak získat XP" appka odstranila na uživatelovu žádost —
            uživatel chtěl na týhle obrazovce zatím jen samotné
            achievementy (odznaky výš), bez návodu, kde se XP bere.
            Appka XP_SOURCES/openApp smazala úplně spolu s ní, ne jen
            schovala — malá, snadno znovu postavitelná data/kód, kdyby
            se sem sekce měla v nějaké formě ještě vrátit. */}

        {/* Krok 19: appka appčinu sdílenou spodní lištu rozšiřuje na
            (téměř) celou appku — Rewards dřív žádnou navigaci na
            dně nemělo, teď dostává tu stejnou, co Hub/Apps/Profil/
            Nastavení. */}
        <AppBottomNav />
      </div>
    </div>
  )
}

export default RewardModule
