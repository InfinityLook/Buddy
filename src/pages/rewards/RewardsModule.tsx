import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useExamPrepStore } from '@/miniapps/exam-prep/useExamPrepStore'
import { getXpForNextLevel, getLevelProgress } from '@/core/utils/gamificationUtils'
import { BadgeCard } from './components/BadgeCard'
import './RewardsModule.css'

type BadgeFilter = 'all' | 'unlocked' | 'locked'

// Store si ke každému odznaku pamatuje jen title/description pro odemčený stav.
// Tady doplňujeme nápovědu, jak zamčený odznak vůbec získat.
const BADGE_HINTS: Record<string, string> = {
  first_step: 'Získej svůj první XP bod za splněný úkol nebo otázku.',
  streak_3: 'Vrať se do aplikace 3 dny po sobě a udržuj studijní sérii.',
  exam_master: 'Zreviduj a ohodnoť 20 otázek v Maturitním centru.',
  night_owl: 'Zaznamenej studijní aktivitu po 22:00 hodině.',
}

export const RewardsModule: React.FC = () => {
  const navigate = useNavigate()
  const { level, xp, streakDays, badges } = useGamificationStore()

  // Čteme si i data z Maturitního centra jen pro výpočet reálného
  // progresu odznaku "Maturitní Mašina" — samotné odznaky pořád
  // vlastní a odemyká useGamificationStore.
  const examTopics = useExamPrepStore((state) => state.topics)

  const [filter, setFilter] = useState<BadgeFilter>('all')

  const xpToNext = getXpForNextLevel(level)
  const progressPercent = getLevelProgress(xp)
  const unlockedBadges = badges.filter((b) => b.unlockedAt !== null)
  const lockedCount = badges.length - unlockedBadges.length

  // Reálný progres k zamčeným odznakům, tam kde ho lze z existujících dat spočítat
  const progressById = useMemo(() => {
    const revisedTopics = examTopics.filter((t) => t.revisionCount > 0).length
    return {
      streak_3: { current: Math.min(streakDays, 3), target: 3 },
      exam_master: { current: Math.min(revisedTopics, 20), target: 20 },
    } as Record<string, { current: number; target: number }>
  }, [streakDays, examTopics])

  const filteredBadges = badges.filter((badge) => {
    if (filter === 'unlocked') return badge.unlockedAt !== null
    if (filter === 'locked') return badge.unlockedAt === null
    return true
  })

  return (
    <div className="rewards-page">
      {/* Fixní pozadí ve stejném stylu jako Hub / Profil */}
      <div className="rewards-bg" aria-hidden="true" />

      <div className="rewards-top-bar">
        <button className="rewards-back-link" onClick={() => navigate('/hub')}>
          ← Zpět do Hubu
        </button>
        <h1 className="rewards-title">🎁 Odměny</h1>
        <p className="rewards-subtitle">
          Sleduj svůj postup, XP a odznaky, které jsi za studium získal/a.
        </p>
      </div>

      {/* Souhrnná karta — level, XP a denní série */}
      <div className="rewards-summary-card">
        <div className="rewards-level-row">
          <div className="rewards-level-info">
            <span className="rewards-level-label">⭐ ÚROVEŇ {level}</span>
            <span className="rewards-level-xp">{xp} / {xpToNext} XP</span>
          </div>
          <div className="rewards-xp-bar-bg">
            <div className="rewards-xp-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="rewards-stats-row">
          <div className="rewards-stat">
            <span className="rewards-stat-icon">🔥</span>
            <span className="rewards-stat-value">{streakDays}</span>
            <span className="rewards-stat-label">dní v řadě</span>
          </div>
          <div className="rewards-stat">
            <span className="rewards-stat-icon">⭐</span>
            <span className="rewards-stat-value">{xp}</span>
            <span className="rewards-stat-label">celkem XP</span>
          </div>
          <div className="rewards-stat">
            <span className="rewards-stat-icon">🏅</span>
            <span className="rewards-stat-value">{unlockedBadges.length}/{badges.length}</span>
            <span className="rewards-stat-label">odznaků</span>
          </div>
        </div>
      </div>

      {/* Filtr odznaků */}
      <div className="rewards-filter-row">
        <button
          className={`rewards-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Vše ({badges.length})
        </button>
        <button
          className={`rewards-filter-btn ${filter === 'unlocked' ? 'active' : ''}`}
          onClick={() => setFilter('unlocked')}
        >
          Odemčené ({unlockedBadges.length})
        </button>
        <button
          className={`rewards-filter-btn ${filter === 'locked' ? 'active' : ''}`}
          onClick={() => setFilter('locked')}
        >
          Zamčené ({lockedCount})
        </button>
      </div>

      {/* Mřížka odznaků */}
      {filteredBadges.length > 0 ? (
        <div className="rewards-badge-grid">
          {filteredBadges.map((badge) => (
            <BadgeCard
              key={badge.id}
              icon={badge.icon}
              title={badge.title}
              description={badge.unlockedAt ? badge.description : BADGE_HINTS[badge.id] ?? badge.description}
              unlockedAt={badge.unlockedAt}
              progress={badge.unlockedAt ? undefined : progressById[badge.id]}
            />
          ))}
        </div>
      ) : (
        <p className="rewards-empty">V této kategorii zatím nic není.</p>
      )}
    </div>
  )
}

export default RewardsModule
