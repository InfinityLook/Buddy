import React from 'react'
import { ProfilIcon } from './ProfilIcon'

const goals = [
  { icon: 'target', color: 'blue', fill: 'cyan', title: 'Denní cíl', sub: 'Uč se 60 minut', val: '45 / 60 min', progress: '75%' },
  { icon: 'book-open', color: 'green', fill: 'green', title: 'Týdenní cíl', sub: 'Dokonči 10 lekcí', val: '7 / 10 lekcí', progress: '70%' },
  { icon: 'calendar', color: 'purple', fill: 'purple', title: 'Měsíční cíl', sub: 'Uč se 20 hodin', val: '13 / 20 hod', progress: '65%' },
]

interface ProfilGoalsProps {
  onShowAll: () => void
}

export const ProfilGoals: React.FC<ProfilGoalsProps> = ({ onShowAll }) => (
  <section className="profil-panel">
    <div className="profil-panel-header">
      <h3>Moje cíle</h3>
      <button className="profil-link-btn" onClick={onShowAll}>Zobrazit vše</button>
    </div>

    <div className="profil-goals-list">
      {goals.map((item, index) => (
        <div key={index} className="profil-goal-item">
          <div className="profil-goal-top">
            <div className="profil-goal-title-wrap">
              <div className={`profil-item-icon ${item.color}`}><ProfilIcon name={item.icon} size={18} /></div>
              <div>
                <div className="profil-item-title">{item.title}</div>
                <div className="profil-item-sub">{item.sub}</div>
              </div>
            </div>
            <span className="profil-goal-value">{item.val}</span>
          </div>
          <div className="profil-progress-bg">
            <div className={`profil-progress-fill ${item.fill}`} style={{ width: item.progress }}></div>
          </div>
        </div>
      ))}
    </div>
  </section>
)
