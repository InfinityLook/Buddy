import React, { useEffect, useRef } from 'react'
import { useDocumentStore } from '../useDocumentStore'

interface EditorPaperProps {
  editorRef: React.RefObject<HTMLDivElement>
}

export const EditorPaper: React.FC<EditorPaperProps> = ({ editorRef }) => {
  const { currentContent, setContent, revision } = useDocumentStore()
  const loadedRevision = useRef<number | null>(null)

  // Obsah do contentEditable divu vložíme jen při přepnutí dokumentu (revision se změní
  // při novém/otevřeném/importovaném dokumentu) — jinak by přepis innerHTML na každý úder
  // klávesy shazoval pozici kurzoru
  useEffect(() => {
    if (editorRef.current && loadedRevision.current !== revision) {
      editorRef.current.innerHTML = currentContent
      loadedRevision.current = revision
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision])

  return (
    <div className="doc-page-container">
      <div
        ref={editorRef}
        className="doc-page-paper"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => setContent((e.target as HTMLDivElement).innerHTML)}
        aria-label="Obsah dokumentu"
      />
    </div>
  )
}
