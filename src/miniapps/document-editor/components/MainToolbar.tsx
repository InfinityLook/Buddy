import React, { useCallback, useEffect, useState } from 'react'

interface MainToolbarProps {
  showMore: boolean
  setShowMore: (value: boolean) => void
}

// Příkazy, u kterých se dá zjistit, jestli zrovna platí pro text pod
// kurzorem — podle toho se tlačítko zvýrazní.
const STATEFUL_COMMANDS = [
  'bold',
  'italic',
  'underline',
  'insertUnorderedList',
  'insertOrderedList',
  'justifyLeft',
  'justifyCenter',
  'justifyRight',
] as const

type StatefulCommand = (typeof STATEFUL_COMMANDS)[number]

// Platí stav formátování jen tehdy, když kurzor stojí v editační ploše.
const isSelectionInEditor = (): boolean => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return false

  const container = selection.getRangeAt(0).commonAncestorContainer
  const element =
    container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element)

  return Boolean(element?.closest?.('.doc-page-paper'))
}

// Zabrání tomu, aby klik na tlačítko toolbaru odebral fokus (a tím i výběr textu)
// z editační plochy dřív, než se stihne provést formátovací příkaz
const preventBlur = (e: React.MouseEvent) => e.preventDefault()

export const MainToolbar: React.FC<MainToolbarProps> = ({ showMore, setShowMore }) => {
  // Dosud nebylo z panelu poznat, jestli je text pod kurzorem tučný nebo
  // v seznamu — uživatel to zjistil až podle výsledku.
  const [active, setActive] = useState<Partial<Record<StatefulCommand, boolean>>>({})

  const refreshState = useCallback(() => {
    // Bez tohohle omezení hlásil queryCommandState výchozí stav prohlížeče
    // i když kurzor v editoru vůbec nebyl — panel pak v prázdném dokumentu
    // svítil, jako by bylo zapnuté tučné písmo a zarovnání na střed.
    if (!isSelectionInEditor()) {
      setActive({})
      return
    }

    const next: Partial<Record<StatefulCommand, boolean>> = {}
    for (const cmd of STATEFUL_COMMANDS) {
      try {
        next[cmd] = document.queryCommandState(cmd)
      } catch {
        // Prohlížeč příkaz nezná — tlačítko prostě zůstane neaktivní
      }
    }
    setActive(next)
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', refreshState)
    return () => document.removeEventListener('selectionchange', refreshState)
  }, [refreshState])

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val)
    refreshState()
  }

  const cls = (cmd: StatefulCommand) => `touch-btn ${active[cmd] ? 'active' : ''}`

  return (
    <div className="doc-toolbar">
      <button className={cls('bold')} onMouseDown={preventBlur} onClick={() => exec('bold')} aria-label="Tučně" aria-pressed={!!active.bold}>
        <b>B</b>
      </button>
      <button className={cls('italic')} onMouseDown={preventBlur} onClick={() => exec('italic')} aria-label="Kurzíva" aria-pressed={!!active.italic}>
        <i>I</i>
      </button>
      <button className={cls('underline')} onMouseDown={preventBlur} onClick={() => exec('underline')} aria-label="Podtržení" aria-pressed={!!active.underline}>
        <u>U</u>
      </button>

      <div className="toolbar-divider" />

      <button
        className={cls('insertUnorderedList')}
        onMouseDown={preventBlur}
        onClick={() => exec('insertUnorderedList')}
        aria-label="Odrážky"
        aria-pressed={!!active.insertUnorderedList}
      >
        •≡
      </button>
      <button
        className={cls('insertOrderedList')}
        onMouseDown={preventBlur}
        onClick={() => exec('insertOrderedList')}
        aria-label="Číslovaný seznam"
        aria-pressed={!!active.insertOrderedList}
      >
        1.
      </button>

      <div className="toolbar-divider" />

      <button className={cls('justifyLeft')} onMouseDown={preventBlur} onClick={() => exec('justifyLeft')} aria-label="Zarovnat vlevo">
        ⯇
      </button>
      <button className={cls('justifyCenter')} onMouseDown={preventBlur} onClick={() => exec('justifyCenter')} aria-label="Zarovnat na střed">
        ▭
      </button>
      <button className={cls('justifyRight')} onMouseDown={preventBlur} onClick={() => exec('justifyRight')} aria-label="Zarovnat vpravo">
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
