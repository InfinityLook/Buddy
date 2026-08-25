import React, { useEffect, useRef, useState } from 'react'
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

// Jak dlouho po posledním úderu do klávesnice se dokument uloží sám
const AUTOSAVE_DELAY = 1200

export const DocumentEditor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor')
  const [showMore, setShowMore] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const { currentContent, currentTitle, isSaved, autosaveCurrent } = useDocumentStore()

  const messageTimer = useRef<number | null>(null)
  const autosaveTimer = useRef<number | null>(null)

  const notify = (text: string) => {
    setMessage(text)
    if (messageTimer.current) window.clearTimeout(messageTimer.current)
    messageTimer.current = window.setTimeout(() => setMessage(null), 2400)
  }

  // Automatické ukládání. Dokument se dřív ukládal jen ručně přes menu,
  // takže odchod z miniaplikace nebo založení nového dokumentu poslal
  // rozepsanou práci pryč. Ukládá se se zpožděním, ať se nezapisuje
  // do úložiště při každém stisku klávesy.
  useEffect(() => {
    if (isSaved) return

    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current)
    autosaveTimer.current = window.setTimeout(() => autosaveCurrent(), AUTOSAVE_DELAY)

    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current)
    }
  }, [currentContent, currentTitle, isSaved, autosaveCurrent])

  // Odchod z editoru (zavření záložky, přepnutí aplikace, ale i odchod
  // přes společné "Zpět do seznamu" v AppModule.tsx — to komponentu
  // odmountuje, takže i tenhle efekt při odchodu doběhne) nesmí spolknout
  // posledních pár vteřin psaní.
  useEffect(() => {
    const flush = () => autosaveCurrent()
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flush)

    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', flush)
      if (messageTimer.current) window.clearTimeout(messageTimer.current)
      flush()
    }
  }, [autosaveCurrent])

  return (
    <div className="doc-editor-container">
      <header className="doc-header">
        <Header />
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
          <MenuNav
            editorRef={editorRef}
            onOpenManager={() => setActiveTab('files')}
            onNotify={notify}
          />
        )}
      </header>

      {message && <p className="doc-message">{message}</p>}

      {activeTab === 'editor' ? (
        <>
          <div className="doc-toolbar-wrapper">
            <MainToolbar showMore={showMore} setShowMore={setShowMore} />
            {showMore && <BottomSheetToolbar onNotify={notify} />}
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
