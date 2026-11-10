import { useEffect, useRef, useState } from 'react'
import {
  cleanNoteHtml,
  escapeNote,
  notePlainText,
  safeNoteUrl,
} from './noteContent'
import { MAX_NOTE_HTML } from './types'

export function NoteEditor({
  id,
  html,
  onChange,
}: {
  id: string
  html: string
  onChange: (html: string) => void
}) {
  const root = useRef<HTMLDivElement>(null)
  const selection = useRef<Range | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (root.current) root.current.innerHTML = cleanNoteHtml(html)
  }, [id])

  const remember = () => {
    const current = window.getSelection()

    if (
      current?.rangeCount &&
      root.current?.contains(current.anchorNode)
    ) {
      selection.current = current.getRangeAt(0).cloneRange()
    }
  }

  const publish = () => {
    const value = root.current?.innerHTML ?? ''

    if (value.length > MAX_NOTE_HTML) {
      if (root.current) root.current.innerHTML = html
      setError(
        'Poznámka dosáhla limitu. Poslední vložení nebylo přijato; pokračuj v nové poznámce.'
      )
      return
    }

    setError('')
    onChange(cleanNoteHtml(value))
    remember()
  }

  const command = (name: string, value?: string) => {
    const element = root.current
    if (!element) return

    element.focus()

    const current = window.getSelection()

    if (
      selection.current &&
      element.contains(selection.current.commonAncestorContainer)
    ) {
      current?.removeAllRanges()
      current?.addRange(selection.current)
    }

    if (typeof document.execCommand !== 'function') {
      setError(
        'Tento prohlížeč nepodporuje vybraný formátovací příkaz. Text můžeš dál psát.'
      )
      return
    }

    document.execCommand(name, false, value)
    publish()
  }

  return (
    <div className="qn-editor-area">
      <div
        ref={root}
        className="qn-paper"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Obsah poznámky"
        aria-multiline="true"
        data-placeholder="Začni psát…"
        onInput={publish}
        onKeyUp={remember}
        onMouseUp={remember}
        onBlur={remember}
        onPaste={event => {
          event.preventDefault()

          const pasted =
            event.clipboardData.getData('text/html') ||
            escapeNote(event.clipboardData.getData('text/plain'))

          if (
            pasted.length + (root.current?.innerHTML.length ?? 0) >
            MAX_NOTE_HTML
          ) {
            setError('Vkládaný text je příliš dlouhý.')
            return
          }

          command('insertHTML', cleanNoteHtml(pasted))
        }}
        onClick={event => {
          const target = event.target

          if (
            target instanceof HTMLInputElement &&
            target.type === 'checkbox'
          ) {
            target.toggleAttribute('checked', target.checked)
            publish()
          } else {
            remember()
          }
        }}
      />

      {error && (
        <p className="qn-error" role="alert">
          {error}
        </p>
      )}

      <div
        className="qn-format"
        role="toolbar"
        aria-label="Formátování poznámky"
      >
        {[
          { label: 'Tučně', text: 'B', command: 'bold' },
          { label: 'Kurzíva', text: 'I', command: 'italic' },
          {
            label: 'Nadpis',
            text: 'H',
            command: 'formatBlock',
            value: 'h2',
          },
          {
            label: 'Seznam',
            text: '☷',
            command: 'insertUnorderedList',
          },
          {
            label: 'Zaškrtávací položka',
            text: '☑',
            command: 'insertHTML',
            value: '<p><input type="checkbox" contenteditable="false"> Nová položka</p>',
          },
          {
            label: 'Blok kódu',
            text: '</>',
            command: 'formatBlock',
            value: 'pre',
          },
        ].map(button => (
          <button
            key={button.label}
            type="button"
            aria-label={button.label}
            onPointerDown={event => event.preventDefault()}
            onClick={() => command(button.command, button.value)}
          >
            {button.text}
          </button>
        ))}

        <button
          type="button"
          aria-label="Vložit odkaz"
          onPointerDown={event => event.preventDefault()}
          onClick={() => {
            const url = window.prompt('Adresa odkazu (https://…)')
            if (url == null) return

            const safe = safeNoteUrl(url)

            if (!safe) {
              setError('Zadej platnou webovou nebo e-mailovou adresu.')
              return
            }

            command('createLink', safe)
          }}
        >
          ↗
        </button>

        <button
          type="button"
          aria-label="Vrátit úpravu"
          onPointerDown={event => event.preventDefault()}
          onClick={() => command('undo')}
        >
          ↶
        </button>

        <button
          type="button"
          aria-label="Zopakovat úpravu"
          onPointerDown={event => event.preventDefault()}
          onClick={() => command('redo')}
        >
          ↷
        </button>
      </div>

      <small className="qn-word-count">
        {notePlainText(html).trim().split(/\s+/).filter(Boolean).length} slov
      </small>
    </div>
  )
}
