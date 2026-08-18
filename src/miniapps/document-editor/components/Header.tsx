import React from 'react'
import { useDocumentStore } from '../useDocumentStore'

interface HeaderProps {
  onBack: () => void
}

export const Header: React.FC<HeaderProps> = ({ onBack }) => {
  const { currentTitle, setTitle, isSaved, saveCurrentDocument } = useDocumentStore()

  return (
    <div className="doc-header-top">
      <button className="doc-back-btn" onClick={onBack} aria-label="Zpět">
        ←
      </button>

      <div className="doc-title-wrapper">
        <span
          className={`save-status-dot ${isSaved ? 'saved' : 'dirty'}`}
          title={isSaved ? 'Uloženo' : 'Neuložené změny'}
          aria-hidden="true"
        />
        <input
          className="doc-title-input"
          value={currentTitle}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Název dokumentu"
        />
      </div>

      <button className="doc-save-badge-btn" onClick={() => saveCurrentDocument()}>
        💾 Uložit
      </button>
    </div>
  )
}
