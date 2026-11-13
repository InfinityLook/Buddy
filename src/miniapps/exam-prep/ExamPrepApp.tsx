import React, { useState } from 'react'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
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
  const { rootAttributes } = useSurfaceAppearance('exam-prep')

  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  // Filtr Učebny "jen k opakování dnes" — tady, ne uvnitř FlashcardsTab,
  // protože ho musí umět zapnout i tlačítko "Spustit opakování" na
  // Dashboardu, ne jen přepínač v Učebně samotné.
  const [onlyDueToday, setOnlyDueToday] = useState(false)

  // Gamifikace
  const { level, streakDays } = useGamificationStore()

  // Prázdné stavy v ostatních záložkách odkazují na Okruhy — bez toho
  // by uživatel četl "přidej si okruhy" a musel hledat kde.
  const goToSubjects = () => setActiveTab('subjects')

  const startReview = () => {
    setOnlyDueToday(true)
    setActiveTab('flashcards')
  }

  return (
    <div className="buddy-miniapp examprep-container buddy-theme-scope" {...rootAttributes}>
      <SurfaceBackdrop surfaceId="exam-prep" />
      {/* Header */}
      <header className="buddy-ui-card examprep-header">
        <div className="examprep-stats-badge">
          <span className="examprep-stat-item">⭐ Lvl {level}</span>
          <span className="examprep-stat-item">🔥 {streakDays}d</span>
        </div>
      </header>

      {/* Main view */}
      <main className="examprep-main-content">
        {activeTab === 'dashboard' && (
          <DashboardTab onGoToSubjects={goToSubjects} onStartReview={startReview} />
        )}
        {activeTab === 'subjects' && <SubjectsTab />}
        {activeTab === 'flashcards' && (
          <FlashcardsTab
            onGoToSubjects={goToSubjects}
            onlyDueToday={onlyDueToday}
            onToggleOnlyDueToday={() => setOnlyDueToday((v) => !v)}
          />
        )}
        {activeTab === 'simulator' && <SimulatorTab onGoToSubjects={goToSubjects} />}
      </main>

      {/* Bottom Bar */}
      <nav className="buddy-ui-segmented examprep-tab-bar" aria-label="Navigace zkouškového centra">
        <button
          className={`examprep-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          type="button"
          aria-pressed={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="tab-icon">📈</span>
          <span className="tab-label">Přehled</span>
        </button>

        <button
          className={`examprep-tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
          type="button"
          aria-pressed={activeTab === 'subjects'}
          onClick={() => setActiveTab('subjects')}
        >
          <span className="tab-icon">📚</span>
          <span className="tab-label">Okruhy</span>
        </button>

        <button
          className={`examprep-tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`}
          type="button"
          aria-pressed={activeTab === 'flashcards'}
          onClick={() => setActiveTab('flashcards')}
        >
          <span className="tab-icon">🧠</span>
          <span className="tab-label">Učebna</span>
        </button>

        <button
          className={`examprep-tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
          type="button"
          aria-pressed={activeTab === 'simulator'}
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
