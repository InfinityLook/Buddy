import React from 'react';
import { Trophy, Flame, GraduationCap, Star, Check } from 'lucide-react';

const achievements = [
  { icon: Trophy, color: 'gold', title: 'První krok', desc: 'Dokončil jsi svou první lekci', date: '12. 5. 2024' },
  { icon: Flame, color: 'purple', title: 'Týdenní bojovník', desc: '7 dní studijní série', date: '28. 5. 2024' },
  { icon: GraduationCap, color: 'blue', title: 'Učenlivý student', desc: 'Dokončil jsi 50 lekcí', date: '10. 6. 2024' },
  { icon: Star, color: 'yellow', title: 'Perfekcionista', desc: 'Získal jsi 5 hvězd hodnocení', date: '15. 6. 2024' },
];

export const ProfilAchievements: React.FC = () => (
  <section className="profil-panel">
    <div className="profil-panel-header">
      <h3>Moje úspěchy</h3>
      <button className="profil-link-btn">Zobrazit vše</button>
    </div>

    <div className="profil-list">
      {achievements.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={index} className="profil-item">
            <div className={`profil-item-icon ${item.color}`}><Icon size={18} /></div>
            <div className="profil-item-content">
              <div className="profil-item-title">{item.title}</div>
              <div className="profil-item-sub">{item.desc}</div>
            </div>
            <div className="profil-item-date">{item.date}</div>
            <div className="profil-check"><Check size={14} /></div>
          </div>
        );
      })}
    </div>
  </section>
);
