import React, { useState, useRef, useEffect } from 'react'
import { MenuDropdown } from '../types'
import { useDocumentStore } from '../useDocumentStore'

interface MenuNavProps {
  editorRef: React.RefObject<HTMLDivElement | null>
  onOpenManager: () => void
}

export const MenuNav: React.FC<MenuNavProps> = ({ editorRef, onOpenManager }) => {
  const [activeMenu, setActiveMenu] = useState<MenuDropdown>(null)
  const { currentTitle, saveCurrentDocument, createNewDocument } = useDocumentStore()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: TouchEvent | MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const exec = (cmd: string, val: string | undefined = undefined) => {
    document.execCommand(cmd, false, val)
    setActiveMenu(null)
  }

  const handleDownload = (type: 'txt' | 'html') => {
    const content = type === 'txt' 
      ? editorRef.current?.innerText || '' 
      : editorRef.current?.innerHTML || ''
    
    const mime = type === 'txt' ? 'text/plain' : 'text/html'
    const blob = new Blob([content], { type: `${mime};charset=utf-8` })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${currentTitle}.${type}`
    a.click()
    setActiveMenu(null)
  }

  return (
    <nav className="doc-menu-nav" ref={menuRef}>
      <div className="menu-item-wrapper">
        <button className="menu-btn" onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}>
          Soubor
        </button>
        {activeMenu === 'file' && (
          <div className="dropdown-menu">
            <button onClick={() => { createNewDocument(); setActiveMenu(null) }}>📄 Nový dokument</button>
            <button onClick={() => { saveCurrentDocument(); setActiveMenu(null) }}>💾 Uložit do appky</button>
            <button onClick={() => { onOpenManager(); setActiveMenu(null) }}>📂 Procházet soubory</button>
            <div className="dropdown-divider" />
            <button onClick={() => handleDownload('txt')}>⬇ Stáhnout .TXT</button>
            <button onClick={() => handleDownload('html')}>⬇ Stáhnout .HTML</button>
          </div>
        )}
      </div>

      <div className="menu-item-wrapper">
        <button className="menu-btn" onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}>
          Úpravy
        </button>
        {activeMenu === 'edit' && (
          <div className="dropdown-menu">
            <button onClick={() => exec('undo')}>↩ Zpět</button>
            <button onClick={() => exec('redo')}>↪ Vpřed</button>
            <div className="dropdown-divider" />
            <button onClick={() => exec('selectAll')}>Vybrat vše</button>
          </div>
        )}
      </div>

      <div className="menu-item-wrapper">
        <button className="menu-btn" onClick={() => setActiveMenu(activeMenu === 'insert' ? null : 'insert')}>
          Vložit
        </button>
        {activeMenu === 'insert' && (
          <div className="dropdown-menu">
            <button onClick={() => {
              const url = prompt('URL obrázku:')
              if (url) exec('insertImage', url)
            }}>🖼️ Obrázek</button>
            <button onClick={() => {
              const url = prompt('URL odkazu:')
              if (url) exec('createLink', url)
            }}>🔗 Odkaz</button>
            <button onClick={() => exec('insertHorizontalRule')}>➖ Vodorovná čára</button>
          </div>
        )}
      </div>

      <div className="menu-item-wrapper">
        <button className="menu-btn" onClick={() => setActiveMenu(activeMenu === 'format' ? null : 'format')}>
          Formát
        </button>
        {activeMenu === 'format' && (
          <div className="dropdown-menu">
            <button onClick={() => exec('removeFormat')}>🧹 Vymazat formát</button>
            <button onClick={() => exec('subscript')}>x₂ Dolní index</button>
            <button onClick={() => exec('superscript')}>x² Horní index</button>
          </div>
        )}
      </div>
    </nav>
  )
}
