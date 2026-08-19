import React from 'react'
import { sanitizeLinkUrl } from '../importContent'

interface BottomSheetToolbarProps {
  onNotify: (message: string) => void
}

const exec = (cmd: string, val?: string) => {
  document.execCommand(cmd, false, val)
}

const preventBlur = (e: React.MouseEvent) => e.preventDefault()

export const BottomSheetToolbar: React.FC<BottomSheetToolbarProps> = ({ onNotify }) => {
  return (
    <div className="doc-toolbar-expanded">
      <div className="toolbar-row">
        <select
          className="toolbar-select"
          defaultValue=""
          onMouseDown={preventBlur}
          onChange={(e) => {
            exec('formatBlock', e.target.value)
            e.target.value = ''
          }}
          aria-label="Styl textu"
        >
          <option value="" disabled>
            Styl textu
          </option>
          <option value="p">Normální text</option>
          <option value="h1">Nadpis 1</option>
          <option value="h2">Nadpis 2</option>
          <option value="h3">Nadpis 3</option>
          <option value="blockquote">Citace</option>
        </select>

        <label className="color-picker-touch" title="Barva textu">
          🎨
          <input type="color" onMouseDown={preventBlur} onChange={(e) => exec('foreColor', e.target.value)} />
        </label>

        <label className="color-picker-touch" title="Zvýraznění">
          🖍️
          <input type="color" onMouseDown={preventBlur} onChange={(e) => exec('hiliteColor', e.target.value)} />
        </label>
      </div>

      <div className="toolbar-row">
        <button className="touch-btn" onMouseDown={preventBlur} onClick={() => exec('subscript')} aria-label="Dolní index">
          x₂
        </button>
        <button className="touch-btn" onMouseDown={preventBlur} onClick={() => exec('superscript')} aria-label="Horní index">
          x²
        </button>
        <button
          className="touch-btn"
          onMouseDown={preventBlur}
          onClick={() => exec('insertHorizontalRule')}
          aria-label="Vodorovná čára"
        >
          ―
        </button>
        <button
          className="touch-btn"
          onMouseDown={preventBlur}
          onClick={() => {
            // Výběr si musíme podržet — prompt ho v některých prohlížečích shodí
            const selection = window.getSelection()
            const range = selection && selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null

            const input = window.prompt('Adresa odkazu:')
            if (!input) return

            // Bez téhle kontroly šlo vložit "javascript:..." a vyrobit
            // v dokumentu klikací odkaz, který spustí kód.
            const url = sanitizeLinkUrl(input)
            if (!url) {
              onNotify('Tuhle adresu vložit nejde.')
              return
            }

            if (range) {
              selection?.removeAllRanges()
              selection?.addRange(range)
            }
            exec('createLink', url)
          }}
          aria-label="Vložit odkaz"
        >
          🔗
        </button>
        <button
          className="touch-btn"
          onMouseDown={preventBlur}
          onClick={() => exec('removeFormat')}
          aria-label="Vymazat formátování"
        >
          🧹
        </button>
      </div>
    </div>
  )
}
