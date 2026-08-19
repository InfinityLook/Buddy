import React, { useState, useRef, useEffect } from 'react'
import { MenuDropdown } from '../types'
import { useDocumentStore } from '../useDocumentStore'
import { sanitizeLinkUrl } from '../importContent'
import {
  approximateBytes,
  buildHtmlDocument,
  downloadBlob,
  readImageAsDataUrl,
  safeFileName,
} from '../exportDocument'

interface MenuNavProps {
  editorRef: React.RefObject<HTMLDivElement | null>
  onOpenManager: () => void
  onNotify: (message: string) => void
}

// Nad tuhle hranici obrázek nepustíme — dokumenty leží v localStorage,
// kde má celá aplikace dohromady jen jednotky megabajtů.
const MAX_EMBEDDED_IMAGE_BYTES = 700 * 1024

export const MenuNav: React.FC<MenuNavProps> = ({ editorRef, onOpenManager, onNotify }) => {
  const [activeMenu, setActiveMenu] = useState<MenuDropdown>(null)
  const { currentTitle, saveCurrentDocument, createNewDocument } = useDocumentStore()
  const menuRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  // Výběr v editoru zmizí, jakmile fokus převezme dialog pro výběr souboru.
  // Uložíme si ho, ať obrázek přistane tam, kde uživatel stál.
  const savedRange = useRef<Range | null>(null)

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

  const rememberSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    // Jen výběr uvnitř editoru — kurzor v titulku nás nezajímá
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange()
    }
  }

  const restoreSelection = () => {
    const range = savedRange.current
    if (!range) {
      editorRef.current?.focus()
      return
    }
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  const handleDownload = (type: 'txt' | 'html') => {
    setActiveMenu(null)

    if (type === 'txt') {
      const text = editorRef.current?.innerText ?? ''
      downloadBlob(text, safeFileName(currentTitle, 'txt'), 'text/plain')
      return
    }

    // Celý dokument s deklarovaným UTF-8, ne holý innerHTML
    const html = buildHtmlDocument(currentTitle, editorRef.current?.innerHTML ?? '')
    downloadBlob(html, safeFileName(currentTitle, 'html'), 'text/html')
  }

  // Tisk řeší @media print v DocumentEditor.css — schová celou aplikaci
  // kromě samotného papíru. Nové okno by v nainstalované PWA neprošlo
  // přes blokování vyskakovacích oken.
  const handlePrint = () => {
    setActiveMenu(null)
    window.setTimeout(() => window.print(), 50)
  }

  const handleInsertLink = () => {
    rememberSelection()
    const input = window.prompt('Adresa odkazu:')
    setActiveMenu(null)
    if (!input) return

    const url = sanitizeLinkUrl(input)
    if (!url) {
      onNotify('Tuhle adresu vložit nejde.')
      return
    }

    restoreSelection()
    document.execCommand('createLink', false, url)
  }

  const handlePickImage = () => {
    rememberSelection()
    setActiveMenu(null)
    imageInputRef.current?.click()
  }

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const result = await readImageAsDataUrl(file)
    if (!result.ok || !result.dataUrl) {
      onNotify(result.error ?? 'Obrázek se nepodařilo vložit.')
      return
    }

    if (approximateBytes(result.dataUrl) > MAX_EMBEDDED_IMAGE_BYTES) {
      onNotify('Obrázek je i po zmenšení moc velký na uložení do dokumentu.')
      return
    }

    restoreSelection()
    document.execCommand('insertImage', false, result.dataUrl)
    onNotify('Obrázek vložen ✓')
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
            <button onClick={handlePrint}>🖨️ Tisk / uložit jako PDF</button>
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
            <button onClick={handlePickImage}>🖼️ Obrázek ze zařízení</button>
            <button onClick={handleInsertLink}>🔗 Odkaz</button>
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

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleImageSelected}
      />
    </nav>
  )
}
