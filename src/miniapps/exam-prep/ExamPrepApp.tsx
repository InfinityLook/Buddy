import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGamificationStore } from '@/core/store/useGamificationStore'

import { DashboardTab } from './components/DashboardTab'
import { SubjectsTab } from './components/SubjectsTab'
import { FlashcardsTab } from './components/FlashcardsTab'
import { SimulatorTab } from './components/SimulatorTab'

import './ExamPrepApp.css'

type TabType = 'dashboard' | 'subjects' | 'flashcards' | 'simulator'

interface ExamPrepAppProps {
  onBack?: () => void
}

export const ExamPrepApp: React.FC<ExamPrepAppProps> = ({ onBack }) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  // Gamifikace
  const { level, streakDays } = useGamificationStore()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/apps')
    }
  }

  return (
    <div className="examprep-container">
      {/* Header */}
      <header className="examprep-header">
        <button 
          className="examprep-back-btn" 
          onClick={handleBack}
          aria-label="Zpět do aplikací"
        >
          ←
        </button>

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
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'subjects' && <SubjectsTab />}
        {activeTab === 'flashcards' && <FlashcardsTab />}
        {activeTab === 'simulator' && <SimulatorTab />}
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
