import React from 'react'

const exec = (cmd: string, val?: string) => {
  document.execCommand(cmd, false, val)
}

const preventBlur = (e: React.MouseEvent) => e.preventDefault()

export const BottomSheetToolbar: React.FC = () => {
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
            const url = prompt('URL odkazu:')
            if (url) exec('createLink', url)
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
