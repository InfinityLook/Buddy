import React, { useRef } from 'react'
import { useDocumentStore } from '../useDocumentStore'

interface FileManagerProps {
  onOpenDoc: () => void
}

export const FileManager: React.FC<FileManagerProps> = ({ onOpenDoc }) => {
  const { documents, loadDocument, deleteDocument, createNewDocument, importDocument } = useDocumentStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isHtml = /\.html?$/i.test(file.name)

    const reader = new FileReader()
    reader.onload = (event) => {
      const rawContent = event.target?.result as string
      // Obsah dokumentu se v editoru vkládá jako innerHTML. Skutečný .html
      // soubor tak necháme projít beze změny, ale prostý .txt/.md text
      // musíme escapovat — jinak by se "<" a "&" ztratily nebo, hůř, vzniklé
      // značky (třeba <img onerror=...>) se v editoru rovnou vykonaly.
      const content = isHtml
        ? rawContent
        : rawContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Editor obsah vykresluje jako běžné HTML (white-space: normal),
            // takže bez převodu by se řádky prostého textu slily do jednoho.
            .replace(/\r\n|\r|\n/g, '<br>')
      const title = file.name.replace(/\.[^/.]+$/, '')
      importDocument(title, content)
      onOpenDoc()
    }
    reader.readAsText(file)
  }

  return (
    <div className="file-manager-container">
      <div className="file-manager-header">
        <h3>📂 Moje Dokumenty (LocalStorage)</h3>
        <div className="file-manager-actions">
          <button className="fm-btn primary" onClick={() => { createNewDocument(); onOpenDoc() }}>
            ➕ Nový
          </button>
          <button className="fm-btn secondary" onClick={() => fileInputRef.current?.click()}>
            📥 Otevřít z mobilu
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.html,.md"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="empty-files-state">
          <p>Žádné uložené dokumenty v paměti.</p>
        </div>
      ) : (
        <div className="file-list">
          {documents.map((doc) => (
            <div key={doc.id} className="file-card">
              <div className="file-info" onClick={() => { loadDocument(doc.id); onOpenDoc() }}>
                <span className="file-icon">📄</span>
                <div>
                  <h4 className="file-title">{doc.title}</h4>
                  <span className="file-date">
                    {new Date(doc.lastModified).toLocaleString('cs-CZ', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>
              <div className="file-actions">
                <button
                  className="icon-btn delete"
                  onClick={() => {
                    if (confirm(`Opravdu smazat "${doc.title}"?`)) {
                      deleteDocument(doc.id)
                    }
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
