import React from 'react'
import { ProfilIcon } from './ProfilIcon'
import { Goal } from '@/miniapps/goal-tracker/types'

// Vizuální mapování kategorie cíle (Goal Tracker) na ikonu a barvu karty
const CATEGORY_STYLE: Record<Goal['category'], { icon: string; color: string }> = {
  Studium: { icon: 'book-open', color: 'green' },
  Návyky: { icon: 'target', color: 'blue' },
  Osobní: { icon: 'calendar', color: 'purple' },
}

interface ProfilGoalsProps {
  goals: Goal[]
  onShowAll: () => void
}

export const ProfilGoals: React.FC<ProfilGoalsProps> = ({ goals, onShowAll }) => (
  <section className="profil-panel">
    <div className="profil-panel-header">
      <h3>Moje cíle</h3>
      <button className="profil-link-btn" onClick={onShowAll}>Zobrazit vše</button>
    </div>

    {goals.length === 0 ? (
      <p style={{ color: 'var(--profil-text-sub)', fontSize: '0.75rem' }}>
        Zatím žádné cíle. Založ si první v Goal Trackeru. 🎯
      </p>
    ) : (
      <div className="profil-goals-list">
        {goals.slice(0, 3).map((goal) => {
          const style = CATEGORY_STYLE[goal.category]
          const progress = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0

          return (
            <div key={goal.id} className="profil-goal-item">
              <div className="profil-goal-top">
                <div className="profil-goal-title-wrap">
                  <div className={`profil-item-icon ${style.color}`}>
                    <ProfilIcon name={style.icon} size={18} />
                  </div>
                  <div>
                    <div className="profil-item-title">{goal.title}</div>
                    <div className="profil-item-sub">{goal.category}</div>
                  </div>
                </div>
                <span className="profil-goal-value">
                  {goal.current} / {goal.target} {goal.unit}
                </span>
              </div>
              <div className="profil-progress-bg">
                <div className="profil-progress-fill cyan" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    )}
  </section>
)
