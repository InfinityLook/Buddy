import React from 'react';
import { Pencil, Mail, Flame, Crown } from 'lucide-react';

export const ProfilUserCard: React.FC = () => (
  <section className="profil-user-card">
    <div className="profil-user-main">
      <div className="profil-avatar-wrapper">
        <img 
          src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300" 
          alt="Avatar" 
          className="profil-avatar-img"
        />
        <button className="profil-avatar-edit" aria-label="Upravit fotku">
          <Pencil size={14} />
        </button>
      </div>

      <div className="profil-user-info">
        <span className="profil-badge">✦ AI STUDENT</span>
        <h2>Kairo</h2>
        <p className="profil-motto">Každý den je nová šance stát se lepší verzí sebe.</p>
        <div className="profil-email">
          <Mail size={14} />
          <span>kairo.student@email.com</span>
        </div>
      </div>
    </div>

    <div className="profil-user-stats">
      <div className="profil-level-box">
        <div className="profil-level-header">
          <span className="profil-level-text">ÚROVEŇ 24</span>
          <Crown size={16} className="profil-crown-icon" />
        </div>
        <div className="profil-xp-text">4 250 / 5 000 XP</div>
        <div className="profil-progress-bg">
          <div className="profil-progress-fill" style={{ width: '85%' }}></div>
        </div>
      </div>

      <div className="profil-streak-box">
        <Flame size={24} className="profil-streak-fire" />
        <div className="profil-streak-info">
          <span className="profil-streak-num">12</span>
          <span className="profil-streak-label">denní série</span>
        </div>
      </div>
    </div>
  </section>
);
