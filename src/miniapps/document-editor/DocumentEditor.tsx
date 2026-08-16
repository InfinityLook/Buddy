import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from './components/Header'
import { MenuNav } from './components/MenuNav'
import { MainToolbar } from './components/MainToolbar'
import { BottomSheetToolbar } from './components/BottomSheetToolbar'
import { EditorPaper } from './components/EditorPaper'
import { StatusBar } from './components/StatusBar'
import { FileManager } from './components/FileManager'
import { useDocumentStore } from './useDocumentStore'
import { ActiveTab } from './types'
import './DocumentEditor.css'

interface DocumentEditorProps {
  onBack?: () => void
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ onBack }) => {
  const navigate = useNavigate()
  const editorRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor')
  const [showMore, setShowMore] = useState(false)
  const { currentContent } = useDocumentStore()

  const handleBack = () => {
    if (onBack) onBack()
    else navigate('/apps')
  }

  return (
    <div className="doc-editor-container">
      <header className="doc-header">
        <Header onBack={handleBack} />
        <div className="tab-switcher">
          <button
            className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            ✏️ Editor
          </button>
          <button
            className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            📂 Správce Souborů
          </button>
        </div>

        {activeTab === 'editor' && (
          <MenuNav editorRef={editorRef} onOpenManager={() => setActiveTab('files')} />
        )}
      </header>

      {activeTab === 'editor' ? (
        <>
          <div className="doc-toolbar-wrapper">
            <MainToolbar showMore={showMore} setShowMore={setShowMore} />
            {showMore && <BottomSheetToolbar />}
          </div>
          <EditorPaper editorRef={editorRef} />
          <StatusBar content={currentContent} />
        </>
      ) : (
        <FileManager onOpenDoc={() => setActiveTab('editor')} />
      )}
    </div>
  )
}

export default DocumentEditor
