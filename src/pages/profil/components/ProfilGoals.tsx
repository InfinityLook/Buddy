import React from 'react';
import { Target, BookOpen, Calendar } from 'lucide-react';

const goals = [
  { icon: Target, color: 'blue', fill: 'cyan', title: 'Denní cíl', sub: 'Uč se 60 minut', val: '45 / 60 min', progress: '75%' },
  { icon: BookOpen, color: 'green', fill: 'green', title: 'Týdenní cíl', sub: 'Dokonči 10 lekcí', val: '7 / 10 lekcí', progress: '70%' },
  { icon: Calendar, color: 'purple', fill: 'purple', title: 'Měsíční cíl', sub: 'Uč se 20 hodin', val: '13 / 20 hod', progress: '65%' },
];

export const ProfilGoals: React.FC = () => (
  <section className="profil-panel">
    <div className="profil-panel-header">
      <h3>Moje cíle</h3>
      <button className="profil-link-btn">Zobrazit vše</button>
    </div>

    <div className="profil-goals-list">
      {goals.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={index} className="profil-goal-item">
            <div className="profil-goal-top">
              <div className="profil-goal-title-wrap">
                <div className={`profil-item-icon ${item.color}`}><Icon size={18} /></div>
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
        );
      })}
    </div>
  </section>
);
