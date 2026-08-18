import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MenuDropdown } from '../types'
import { useDocumentStore } from '../useDocumentStore'

interface MenuNavProps {
  editorRef: React.RefObject<HTMLDivElement | null>
  onOpenManager: () => void
}

interface AnchorRect {
  top: number
  left: number
}

// Šířka odpovídá min-width dropdown-menu v CSS — používá se k tomu, aby se
// rozbalené menu nedostalo mimo pravý okraj obrazovky na úzkých mobilech.
const DROPDOWN_WIDTH = 170

export const MenuNav: React.FC<MenuNavProps> = ({ editorRef, onOpenManager }) => {
  const [activeMenu, setActiveMenu] = useState<MenuDropdown>(null)
  const [anchor, setAnchor] = useState<AnchorRect | null>(null)
  const { currentTitle, saveCurrentDocument, createNewDocument } = useDocumentStore()
  const navRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: TouchEvent | MouseEvent) => {
      const target = e.target as Node
      // Rozbalené menu se renderuje portálem mimo .doc-menu-nav (viz níže),
      // takže musíme kontrolovat oba kontejnery zvlášť.
      if (navRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setActiveMenu(null)
    }
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // .doc-menu-nav se vodorovně posouvá (overflow-x: auto pro případ, že by se
  // "Soubor Úpravy Vložit Formát" nevešly na velmi úzký displej). Kvůli tomu
  // ale prohlížeč vynutí i overflow-y: auto na tomtéž kontejneru — takže by
  // klasické position:absolute dropdown menu bylo prakticky celé oříznuté
  // a neviditelné. Řešení: menu vytáhneme portálem do <body> a napozicujeme
  // ho ručně podle skutečné polohy tlačítka, mimo oříznutý kontejner.
  const toggleMenu = (menu: MenuDropdown, e: React.MouseEvent<HTMLButtonElement>) => {
    if (activeMenu === menu) {
      setActiveMenu(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    setAnchor({
      top: rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - 12),
    })
    setActiveMenu(menu)
  }

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

  const renderDropdown = (content: React.ReactNode) => {
    if (!anchor) return null
    return createPortal(
      <div
        className="dropdown-menu"
        ref={dropdownRef}
        style={{ position: 'fixed', top: anchor.top, left: anchor.left }}
      >
        {content}
      </div>,
      document.body
    )
  }

  return (
    <nav className="doc-menu-nav" ref={navRef}>
      <div className="menu-item-wrapper">
        <button className="menu-btn" onClick={(e) => toggleMenu('file', e)}>
          Soubor
        </button>
        {activeMenu === 'file' &&
          renderDropdown(
            <>
              <button onClick={() => { createNewDocument(); setActiveMenu(null) }}>📄 Nový dokument</button>
              <button onClick={() => { saveCurrentDocument(); setActiveMenu(null) }}>💾 Uložit do appky</button>
              <button onClick={() => { onOpenManager(); setActiveMenu(null) }}>📂 Procházet soubory</button>
              <div className="dropdown-divider" />
              <button onClick={() => handleDownload('txt')}>⬇ Stáhnout .TXT</button>
              <button onClick={() => handleDownload('html')}>⬇ Stáhnout .HTML</button>
            </>
          )}
      </div>

      <div className="menu-item-wrapper">
        <button className="menu-btn" onClick={(e) => toggleMenu('edit', e)}>
          Úpravy
        </button>
        {activeMenu === 'edit' &&
          renderDropdown(
            <>
              <button onClick={() => exec('undo')}>↩ Zpět</button>
              <button onClick={() => exec('redo')}>↪ Vpřed</button>
              <div className="dropdown-divider" />
              <button onClick={() => exec('selectAll')}>Vybrat vše</button>
            </>
          )}
      </div>

      <div className="menu-item-wrapper">
        <button className="menu-btn" onClick={(e) => toggleMenu('insert', e)}>
          Vložit
        </button>
        {activeMenu === 'insert' &&
          renderDropdown(
            <>
              <button
                onClick={() => {
                  const url = prompt('URL obrázku:')
                  if (url) exec('insertImage', url)
                }}
              >
                🖼️ Obrázek
              </button>
              <button
                onClick={() => {
                  const url = prompt('URL odkazu:')
                  if (url) exec('createLink', url)
                }}
              >
                🔗 Odkaz
              </button>
              <button onClick={() => exec('insertHorizontalRule')}>➖ Vodorovná čára</button>
            </>
          )}
      </div>

      <div className="menu-item-wrapper">
        <button className="menu-btn" onClick={(e) => toggleMenu('format', e)}>
          Formát
        </button>
        {activeMenu === 'format' &&
          renderDropdown(
            <>
              <button onClick={() => exec('removeFormat')}>🧹 Vymazat formát</button>
              <button onClick={() => exec('subscript')}>x₂ Dolní index</button>
              <button onClick={() => exec('superscript')}>x² Horní index</button>
            </>
          )}
      </div>
    </nav>
  )
}
