import React from 'react'

interface BadgeProgress {
  current: number
  target: number
}

interface BadgeCardProps {
  icon: string
  title: string
  description: string
  unlockedAt: string | null
  progress?: BadgeProgress
}

// Jedna dlaždice odznaku — odemčené zobrazí datum získání,
// zamčené buď reálný progres (pokud ho jde spočítat), nebo jen nápovědu.
export const BadgeCard: React.FC<BadgeCardProps> = ({ icon, title, description, unlockedAt, progress }) => {
  const isUnlocked = unlockedAt !== null
  const percent = progress
    ? Math.min(Math.round((progress.current / progress.target) * 100), 100)
    : null

  return (
    <div className={`rewards-badge-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
      <span className="rewards-badge-icon" aria-hidden="true">
        {isUnlocked ? icon : '🔒'}
      </span>
      <span className="rewards-badge-title">{title}</span>
      <span className="rewards-badge-desc">{description}</span>

      {isUnlocked ? (
        <span className="rewards-badge-date">
          ✓ {new Date(unlockedAt as string).toLocaleDateString('cs-CZ')}
        </span>
      ) : percent !== null ? (
        <div className="rewards-badge-progress">
          <div className="rewards-badge-progress-bg">
            <div className="rewards-badge-progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <span className="rewards-badge-progress-label">
            {progress!.current}/{progress!.target}
          </span>
        </div>
      ) : (
        <span className="rewards-badge-locked-label">Zamčeno</span>
      )}
    </div>
  )
}
