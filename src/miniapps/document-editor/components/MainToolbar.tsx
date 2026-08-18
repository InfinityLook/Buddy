import React from 'react'

interface MainToolbarProps {
  showMore: boolean
  setShowMore: (value: boolean) => void
}

const exec = (cmd: string, val?: string) => {
  document.execCommand(cmd, false, val)
}

// Zabrání tomu, aby klik na tlačítko toolbaru odebral fokus (a tím i výběr textu)
// z editační plochy dřív, než se stihne provést formátovací příkaz
const preventBlur = (e: React.MouseEvent) => e.preventDefault()

export const MainToolbar: React.FC<MainToolbarProps> = ({ showMore, setShowMore }) => {
  return (
    <div className="doc-toolbar">
      <button className="touch-btn" onMouseDown={preventBlur} onClick={() => exec('bold')} aria-label="Tučně">
        <b>B</b>
      </button>
      <button className="touch-btn" onMouseDown={preventBlur} onClick={() => exec('italic')} aria-label="Kurzíva">
        <i>I</i>
      </button>
      <button className="touch-btn" onMouseDown={preventBlur} onClick={() => exec('underline')} aria-label="Podtržení">
        <u>U</u>
      </button>

      <div className="toolbar-divider" />

      <button
        className="touch-btn"
        onMouseDown={preventBlur}
        onClick={() => exec('insertUnorderedList')}
        aria-label="Odrážky"
      >
        •≡
      </button>
      <button
        className="touch-btn"
        onMouseDown={preventBlur}
        onClick={() => exec('insertOrderedList')}
        aria-label="Číslovaný seznam"
      >
        1.
      </button>

      <div className="toolbar-divider" />

      <button className="touch-btn" onMouseDown={preventBlur} onClick={() => exec('justifyLeft')} aria-label="Zarovnat vlevo">
        ⯇
      </button>
      <button className="touch-btn" onMouseDown={preventBlur} onClick={() => exec('justifyCenter')} aria-label="Zarovnat na střed">
        ▭
      </button>
      <button className="touch-btn" onMouseDown={preventBlur} onClick={() => exec('justifyRight')} aria-label="Zarovnat vpravo">
        ⯈
      </button>

      <div className="toolbar-divider" />

      <button
        className={`touch-btn ${showMore ? 'active' : ''}`}
        onMouseDown={preventBlur}
        onClick={() => setShowMore(!showMore)}
        aria-label="Další nástroje"
      >
        ⋯
      </button>
    </div>
  )
}
