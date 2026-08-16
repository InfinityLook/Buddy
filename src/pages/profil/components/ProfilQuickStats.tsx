import React from 'react'
import { ProfilIcon } from './ProfilIcon'

export const ProfilQuickStats: React.FC = () => (
  <section className="profil-quick-stats">
    <div className="profil-stat-card">
      <div className="profil-stat-icon purple"><ProfilIcon name="book-open" size={20} /></div>
      <div>
        <div className="profil-stat-value">128</div>
        <div className="profil-stat-label">Dokončené lekce</div>
      </div>
    </div>

    <div className="profil-stat-card">
      <div className="profil-stat-icon green"><ProfilIcon name="check-square" size={20} /></div>
      <div>
        <div className="profil-stat-value">32</div>
        <div className="profil-stat-label">Úkoly hotovo</div>
      </div>
    </div>

    <div className="profil-stat-card">
      <div className="profil-stat-icon yellow"><ProfilIcon name="clock" size={20} /></div>
      <div>
        <div className="profil-stat-value">48h</div>
        <div className="profil-stat-label">Čas studia</div>
      </div>
    </div>

    <div className="profil-stat-card">
      <div className="profil-stat-icon blue"><ProfilIcon name="star" size={20} /></div>
      <div>
        <div className="profil-stat-value">4.8</div>
        <div className="profil-stat-label">Průměrné hodnocení</div>
      </div>
    </div>
  </section>
)
