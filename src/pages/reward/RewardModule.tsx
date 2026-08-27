import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useAppStore } from '@/core/store/useAppStore'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { getXpForNextLevel, getLevelProgress } from '@/core/utils/gamificationUtils'
import './RewardModule.css'

// Kolik odznaků smí být na veřejném profilu vystavených najednou — víc
// by přestalo být "výběr toho nejlepšího" a bylo by to jen druhý,
// zkrácený seznam. Stejná mez jako CHECK constraint pripnute_odznaky_max_3
// na databázi (migrace social_faze2...), appka ji tady jen hlídá dřív,
// než by narazila na server.
const MAX_PRIPNUTYCH = 3

// Zdroje XP odpovídají hodnotám natvrdo v jednotlivých miniaplikacích
// (XP_PER_COMPLETED_TASK apod.). Když se některá z nich změní, je potřeba
// srovnat i tenhle seznam — jinak bude stránka slibovat něco jiného,
// než uživatel doopravdy dostane.
interface XpSource {
  appId: string
  icon: string
  title: string
  reward: string
}

const XP_SOURCES: XpSource[] = [
  { appId: 'exam-prep', icon: '⏱️', title: 'Odsimuluj maturitní otázku (jednou za otázku)', reward: '+100 XP' },
  { appId: 'exam-prep', icon: '🎓', title: 'Zopakuj otázku, která je na řadě', reward: '+10 až 50 XP' },
  { appId: 'goal-tracker', icon: '🎯', title: 'Dotáhni cíl v Goal Trackeru', reward: '+25 XP' },
  { appId: 'document-editor', icon: '📄', title: 'Ulož nový dokument', reward: '+15 XP' },
  { appId: 'pomodoro', icon: '🍅', title: 'Dokonči soustředění v Pomodoru (podle délky)', reward: '+15 XP / 25 min' },
  { appId: 'study-planner', icon: '📚', title: 'Splň úkol v Planeru', reward: '+10 XP' },
  { appId: 'flashcards', icon: '🃏', title: 'Vytvoř vlastní kartičku', reward: '+5 XP' },
  { appId: 'quick-notes', icon: '📝', title: 'Ulož poznámku', reward: '+5 XP' },
  { appId: 'mind-map', icon: '🗺️', title: 'Přidej uzel do myšlenkové mapy', reward: '+5 XP' },
  { appId: 'file-manager', icon: '📁', title: 'Přidej soubor', reward: '+5 XP' },
  { appId: 'finance', icon: '💸', title: 'Zapiš příjem nebo výdaj ve Financích', reward: '+3 XP' },
  { appId: 'form-check', icon: '🏋️', title: 'Dokonči trénink ve Form Checku', reward: '+1 XP / opakování (max 30)' },
  { appId: 'flashcards', icon: '🧠', title: 'Označ kartičku jako naučenou', reward: '+3 XP' },
  { appId: 'math-solver', icon: '🧮', title: 'Spočítej výraz v Math Solveru', reward: '+2 XP' },
]

export const RewardModule: React.FC = () => {
  const navigate = useNavigate()
  const { level, xp, streakDays, badges } = useGamificationStore()
  const { setActiveAppId } = useAppStore()
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

  // Deep-link do miniaplikace se zpáteční cestou sem, ať tlačítko Zpět
  // v otevřené aplikaci vrátí uživatele na Odměny, ne jen do seznamu aplikací.
  const openApp = (appId: string) => {
    setActiveAppId(appId, '/odmeny')
    navigate('/apps')
  }

  return (
    <div className="reward-page">
      <div className="reward-top-bar">
        <div>
          <button className="reward-back-btn" onClick={() => navigate('/hub')}>
            ← Zpět do Hubu
          </button>
          <h1 className="reward-title">Odměny</h1>
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

      {/* Odkud se XP bere — každý řádek rovnou otevře příslušnou miniaplikaci */}
      <section className="reward-section">
        <div className="reward-section-head">
          <span>Jak získat XP</span>
        </div>

        <div className="reward-source-list">
          {XP_SOURCES.map((source) => (
            <button
              key={`${source.appId}-${source.title}`}
              className="reward-source-row"
              onClick={() => openApp(source.appId)}
            >
              <span className="reward-source-icon" aria-hidden="true">{source.icon}</span>
              <span className="reward-source-title">{source.title}</span>
              <span className="reward-source-reward">{source.reward}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default RewardModule
