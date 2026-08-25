import React, { useState } from 'react'
import { useGamificationStore } from '@/core/store/useGamificationStore'

import { DashboardTab } from './components/DashboardTab'
import { SubjectsTab } from './components/SubjectsTab'
import { FlashcardsTab } from './components/FlashcardsTab'
import { SimulatorTab } from './components/SimulatorTab'

import './ExamPrepApp.css'

type TabType = 'dashboard' | 'subjects' | 'flashcards' | 'simulator'

// Vlastní tlačítko zpět tu dřív bylo navíc — AppModule.tsx kolem každé
// otevřené miniaplikace už kreslí společnou hlavičku s "Zpět do seznamu",
// takže tohle druhé šipkové tlačítko vedlo do stejného místa a jen
// zabíralo místo. Viz stejná oprava v document-editor/components/Header.tsx.
export const ExamPrepApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  // Gamifikace
  const { level, streakDays } = useGamificationStore()

  // Prázdné stavy v ostatních záložkách odkazují na Okruhy — bez toho
  // by uživatel četl "přidej si okruhy" a musel hledat kde.
  const goToSubjects = () => setActiveTab('subjects')

  return (
    <div className="examprep-container">
      {/* Header */}
      <header className="examprep-header">
        <div className="examprep-title-group">
          <h1 className="examprep-title">Maturitní Centrum</h1>
          <p className="examprep-subtitle">ExamPrep Hub</p>
        </div>

        <div className="examprep-stats-badge">
          <span className="examprep-stat-item">⭐ Lvl {level}</span>
          <span className="examprep-stat-item">🔥 {streakDays}d</span>
        </div>
      </header>

      {/* Main view */}
      <main className="examprep-main-content">
        {activeTab === 'dashboard' && <DashboardTab onGoToSubjects={goToSubjects} />}
        {activeTab === 'subjects' && <SubjectsTab />}
        {activeTab === 'flashcards' && <FlashcardsTab onGoToSubjects={goToSubjects} />}
        {activeTab === 'simulator' && <SimulatorTab onGoToSubjects={goToSubjects} />}
      </main>

      {/* Bottom Bar */}
      <nav className="examprep-tab-bar" aria-label="Navigace zkouškového centra">
        <button
          className={`examprep-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="tab-icon">📈</span>
          <span className="tab-label">Přehled</span>
        </button>

        <button
          className={`examprep-tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          <span className="tab-icon">📚</span>
          <span className="tab-label">Okruhy</span>
        </button>

        <button
          className={`examprep-tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`}
          onClick={() => setActiveTab('flashcards')}
        >
          <span className="tab-icon">🧠</span>
          <span className="tab-label">Učebna</span>
        </button>

        <button
          className={`examprep-tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          <span className="tab-icon">🎓</span>
          <span className="tab-label">Simulátor</span>
        </button>
      </nav>
    </div>
  )
}

export default ExamPrepApp
