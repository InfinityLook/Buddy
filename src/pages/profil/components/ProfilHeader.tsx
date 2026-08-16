import React from 'react'
import { ProfilIcon } from './ProfilIcon'

interface ProfilHeaderProps {
  onBack?: () => void
}

export const ProfilHeader: React.FC<ProfilHeaderProps> = ({ onBack }) => (
  <>
    <header className="profil-header">
      <button className="profil-back-btn" onClick={onBack}>
        <ProfilIcon name="arrow-left" size={18} />
        <span>Zpět</span>
      </button>
      <div className="profil-header-actions">
        <button className="profil-icon-btn" aria-label="Notifikace">
          <ProfilIcon name="bell" size={20} />
        </button>
        <button className="profil-icon-btn" aria-label="Nastavení">
          <ProfilIcon name="settings" size={20} />
        </button>
      </div>
    </header>

    <div className="profil-title-section">
      <h1>Profil</h1>
      <p>Spravuj svůj účet a sleduj svůj pokrok.</p>
    </div>
  </>
)
