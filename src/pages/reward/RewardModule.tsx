import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { getXpForNextLevel, getLevelProgress } from '@/core/utils/gamificationUtils'
import { AppBottomNav } from '@/components/AppBottomNav'
import './RewardModule.css'

// Kolik odznaků smí být na veřejném profilu vystavených najednou — víc
// by přestalo být "výběr toho nejlepšího" a bylo by to jen druhý,
// zkrácený seznam. Stejná mez jako CHECK constraint pripnute_odznaky_max_3
// na databázi (migrace social_faze2...), appka ji tady jen hlídá dřív,
// než by narazila na server.
const MAX_PRIPNUTYCH = 3

export const RewardModule: React.FC = () => {
  const navigate = useNavigate()
  const { level, xp, streakDays, badges } = useGamificationStore()
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
        <div className="reward-top-bar">
          <div>
            <button className="reward-back-btn" onClick={() => navigate('/hub')}>
              ← Zpět do Hubu
            </button>
            <h1 className="reward-title">Achievementy</h1>
            <p className="reward-subtitle">
              Tvoje úroveň, série a všechny odznaky — odemčené i ty, co tě teprve čekají.
            </p>
          </div>
          <span className="reward-hero-icon" aria-hidden="true">🎁</span>
        </div>

        {/* Souhrn pokroku — level, XP do dalšího levelu, série a počet odznaků */}
        <section className="reward-summary-card">
          <div className="reward-level-head">
            <span className="reward-level-name">ÚROVEŇ {level} 👑</span>
            <span className="reward-level-xp">{xp} / {xpToNext} XP</span>
          </div>

          <div className="reward-xp-bar-bg">
            <div className="reward-xp-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          <span className="reward-level-hint">
            {xpRemaining > 0
              ? `Ještě ${xpRemaining} XP a jsi na úrovni ${level + 1}.`
              : `Máš nasbíráno na další úroveň — pokračuj a posuň se dál!`}
          </span>

          <div className="reward-stats-grid">
            <div className="reward-stat-box">
              <span className="reward-stat-label">DENNÍ SÉRIE</span>
              <span className="reward-stat-value">🔥 {streakDays}</span>
              <span className="reward-stat-sub">dní v řadě</span>
            </div>

            <div className="reward-stat-box">
              <span className="reward-stat-label">ODZNAKY</span>
              <span className="reward-stat-value">🏅 {unlockedCount}/{badges.length}</span>
              <span className="reward-stat-sub">odemčeno</span>
            </div>
          </div>
        </section>

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
                    {unlocked ? badge.icon : '🔒'}
                  </span>
                  <div className="reward-badge-text">
                    <span className="reward-badge-title">{badge.title}</span>
                    <span className="reward-badge-desc">{badge.description}</span>
                    <span className={`reward-badge-state ${unlocked ? 'is-unlocked' : ''}`}>
                      {unlocked && badge.unlockedAt
                        ? `✅ Odemčeno ${new Date(badge.unlockedAt).toLocaleDateString('cs-CZ')}`
                        : 'Zatím zamčeno'}
                    </span>
                  </div>
                  {/* Vystavení na veřejném profilu (VerejnyProfilDialog.tsx) —
                      jen u odemčených, appka nedovolí připnout něco, co
                      uživatel ještě nemá. */}
                  {unlocked && (
                    <button
                      className={`reward-badge-pin ${pripnuty ? 'je-pripnuty' : ''}`}
                      aria-label={pripnuty ? `Zrušit vystavení odznaku ${badge.title}` : `Vystavit odznak ${badge.title} na profilu`}
                      disabled={!pripnuty && profile.pinnedBadges.length >= MAX_PRIPNUTYCH}
                      onClick={() => prepnoutPripnuti(badge.id)}
                    >
                      📌
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
