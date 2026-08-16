import React from 'react';
import { ArrowLeft, Bell, Settings } from 'lucide-react';

interface ProfilHeaderProps {
  onBack?: () => void;
}

export const ProfilHeader: React.FC<ProfilHeaderProps> = ({ onBack }) => (
  <>
    <header className="profil-header">
      <button className="profil-back-btn" onClick={onBack}>
        <ArrowLeft size={18} />
        <span>Zpět</span>
      </button>
      <div className="profil-header-actions">
        <button className="profil-icon-btn" aria-label="Notifikace">
          <Bell size={20} />
        </button>
        <button className="profil-icon-btn" aria-label="Nastavení">
          <Settings size={20} />
        </button>
      </div>
    </header>

    <div className="profil-title-section">
      <h1>Profil</h1>
      <p>Spravuj svůj účet a sleduj svůj pokrok.</p>
    </div>
  </>
);
