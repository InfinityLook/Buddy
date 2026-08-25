import React from 'react'
import { useDocumentStore } from '../useDocumentStore'

// Vlastní tlačítko zpět tu dřív bylo navíc — AppModule.tsx kolem každé
// otevřené miniaplikace už kreslí společnou hlavičku s "Zpět do seznamu",
// takže tohle druhé šipkové tlačítko vedlo do stejného místa a jen
// zabíralo místo. Viz stejná oprava v ExamPrepApp.tsx.
export const Header: React.FC = () => {
  const { currentTitle, setTitle, isSaved, saveCurrentDocument } = useDocumentStore()

  return (
    <div className="doc-header-top">
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
