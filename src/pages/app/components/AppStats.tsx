import React from 'react'
import { AppIcon } from './AppIcon'

const statsData = [
  { icon: 'grid', color: 'purple', value: '12', label: 'Moje aplikace' },
  { icon: 'code', color: 'green', value: '8', label: 'Aktivní' },
  { icon: 'rocket', color: 'blue', value: '3', label: 'Nasazené' },
  { icon: 'download', color: 'yellow', value: '1.2K', label: 'Celkem použití' },
]

export const AppStats: React.FC = () => (
  <section className="app-stats-bar">
    {statsData.map((stat, idx) => (
      <div key={idx} className="app-stat-item">
        <div className={`app-stat-icon-wrapper ${stat.color}`}>
          <AppIcon name={stat.icon} size={20} />
        </div>
        <div className="app-stat-info">
          <div className="app-stat-value">{stat.value}</div>
          <div className="app-stat-label">{stat.label}</div>
        </div>
      </div>
    ))}
  </section>
)
