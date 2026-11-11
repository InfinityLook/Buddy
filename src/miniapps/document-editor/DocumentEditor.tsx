import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ChangeEvent, ClipboardEvent } from 'react'
import { useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import { normalizeText } from '@/core/utils/text'
import {
  approximateBytes,
  buildHtmlDocument,
  downloadBlob,
  readImageAsDataUrl,
  safeFileName,
} from './exportDocument'
import {
  escapeTextToHtml,
  prepareImportedContent,
  sanitizeHtml,
  sanitizeLinkUrl,
} from './importContent'
import { toPlainText, useDocumentStore } from './useDocumentStore'
import './DocumentEditor.css'

const FORMATS = [
  ['bold', 'B', 'Tučně'],
  ['italic', 'I', 'Kurzíva'],
  ['underline', 'U', 'Podtržení'],
  ['insertUnorderedList', '• ≡', 'Odrážky'],
  ['insertOrderedList', '1. ≡', 'Číslovaný seznam'],
] as const

const MAX_IMPORT = 1024 * 1024
const MAX_IMAGE = 8 * MAX_IMPORT

function formatDate(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Neznámé datum'

  return date.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function DocumentEditor() {
  const { rootAttributes } = useSurfaceAppearance('document-editor')
  const state = useDocumentStore()
  const { currentTitle, currentContent, isSaved, revision, documents } = state

  const paper = useRef<HTMLDivElement>(null)
  const range = useRef<Range | null>(null)
  const documentInput = useRef<HTMLInputElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const mounted = useRef(false)

  const [tab, setTab] = useState<'editor' | 'files'>('editor')
  const [preview, setPreview] = useState(false)
  const [more, setMore] = useState(false)
  const [pressed, setPressed] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = useCallback((action: () => void) => {
    try {
      action()
      setError('')
      return true
    } catch (cause) {
      const detail = cause instanceof DOMException && cause.name === 'QuotaExceededError'
        ? 'Úložiště je plné. Než odejdeš, stáhni si rozepsaný dokument.'
        : cause instanceof Error
          ? cause.message
          : 'Akci se nepodařilo dokončit.'

      setError(detail)
      setMessage('')
      return false
    }
  }, [])

  useEffect(() => {
    mounted.current = true

    const flush = () => run(
      () => useDocumentStore.getState().autosaveCurrent()
    )

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      mounted.current = false
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)

      try {
        useDocumentStore.getState().autosaveCurrent()
      } catch {
        // Rozpracovaný text zůstává ve storu při návratu do editoru.
      }
    }
  }, [run])

  useEffect(() => {
    if (isSaved) return

    const timer = window.setTimeout(
      () => run(() => useDocumentStore.getState().autosaveCurrent()),
      700
    )

    const beforeUnload = (event: BeforeUnloadEvent) => {
      try {
        useDocumentStore.getState().autosaveCurrent()
      } catch {
        event.preventDefault()
        event.returnValue = true
      }
    }

    window.addEventListener('beforeunload', beforeUnload)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('beforeunload', beforeUnload)
    }
  }, [currentTitle, currentContent, isSaved, run])

  useLayoutEffect(() => {
    range.current = null
    setPressed([])

    if (paper.current) {
      paper.current.innerHTML = sanitizeHtml(
        useDocumentStore.getState().currentContent
      )
    }
  }, [revision, tab, preview])

  const rememberSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!paper.current || !selection?.rangeCount) return

    const selected = selection.getRangeAt(0)
    if (!paper.current.contains(selected.commonAncestorContainer)) return

    range.current = selected.cloneRange()

    if (typeof document.queryCommandState === 'function') {
      setPressed(
        FORMATS
          .filter(([command]) => document.queryCommandState(command))
          .map(([command]) => command)
      )
    }
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', rememberSelection)

    return () =>
      document.removeEventListener('selectionchange', rememberSelection)
  }, [rememberSelection])

  function syncPaper() {
    if (paper.current && !preview) {
      state.setContent(paper.current.innerHTML)
    }
  }

  function command(name: string, value?: string) {
    const element = paper.current
    if (!element || preview) return false

    if (typeof document.execCommand !== 'function') {
      setError('Tento prohlížeč nepodporuje vybranou úpravu textu.')
      return false
    }

    element.focus()

    const selection = window.getSelection()

    if (selection) {
      const saved = range.current

      if (saved && element.contains(saved.commonAncestorContainer)) {
        selection.removeAllRanges()
        selection.addRange(saved)
      } else if (!element.contains(selection.anchorNode)) {
        selection.selectAllChildren(element)
        selection.collapseToEnd()
      }
    }

    const changed = document.execCommand(name, false, value)
    syncPaper()
    rememberSelection()
    return changed
  }

  function save() {
    syncPaper()
    if (run(state.saveCurrentDocument)) setMessage('Dokument uložen.')
  }

  function editDocument(action: () => void) {
    syncPaper()
    if (!run(action)) return

    setPreview(false)
    setTab('editor')
    setMessage('')
  }

  function insertLink() {
    const input = window.prompt('Adresa odkazu')
    if (input === null) return

    const url = sanitizeLinkUrl(input)

    if (!url) {
      setError('Zadej platnou webovou adresu nebo e-mail.')
      return
    }

    if (range.current && !range.current.collapsed) {
      command('createLink', url)
      return
    }

    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.textContent = url
    command('insertHTML', link.outerHTML)
  }

  function paste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()

    const rich = event.clipboardData.getData('text/html')
    const plain = event.clipboardData.getData('text/plain')

    if (Math.max(rich.length, plain.length) > MAX_IMPORT) {
      setError('Vkládaný text může mít nejvýš 1 MB.')
      return
    }

    const html = rich ? sanitizeHtml(rich) : ''

    if (html || plain) {
      rememberSelection()
      command('insertHTML', html || escapeTextToHtml(plain))
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || busy) return

    if (file.size > MAX_IMPORT || !/\.(txt|md|html?)$/i.test(file.name)) {
      setError('Vyber soubor TXT, MD nebo HTML do 1 MB.')
      return
    }

    const originalRevision = useDocumentStore.getState().revision
    setBusy(true)

    try {
      const raw = await file.text()

      if (!mounted.current || useDocumentStore.getState().revision !== originalRevision) {
        return
      }

      editDocument(() => state.importDocument(
        file.name.replace(/\.[^.]+$/, ''),
        prepareImportedContent(file.name, raw)
      ))
    } catch {
      if (mounted.current) setError('Soubor se nepodařilo přečíst.')
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  async function insertImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || busy) return

    if (file.size > MAX_IMAGE || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      setError('Vyber obrázek JPG, PNG, WebP nebo GIF do 8 MB.')
      return
    }

    const originalPaper = paper.current
    const originalRevision = useDocumentStore.getState().revision
    setBusy(true)

    try {
      const result = await readImageAsDataUrl(file)

      if (
        !mounted.current ||
        paper.current !== originalPaper ||
        useDocumentStore.getState().revision !== originalRevision ||
        originalPaper?.contentEditable !== 'true'
      ) {
        return
      }

      if (!result.ok || !result.dataUrl || approximateBytes(result.dataUrl) > 700 * 1024) {
        setError(result.error ?? 'Zmenšený obrázek je stále příliš velký.')
        return
      }

      const image = document.createElement('img')
      image.setAttribute('src', result.dataUrl)
      image.setAttribute('alt', file.name)
      command('insertHTML', image.outerHTML)
    } catch {
      if (mounted.current) setError('Obrázek se nepodařilo vložit.')
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  function exportFile(kind: string) {
    const html = sanitizeHtml(paper.current?.innerHTML ?? currentContent)

    if (kind === 'pdf') {
      window.print()
    } else if (kind === 'html') {
      downloadBlob(
        buildHtmlDocument(currentTitle, html),
        safeFileName(currentTitle, 'html'),
        'text/html'
      )
    } else if (kind === 'txt') {
      downloadBlob(
        toPlainText(html).trim(),
        safeFileName(currentTitle, 'txt'),
        'text/plain'
      )
    }
  }

  const text = useMemo(() => toPlainText(currentContent).trim(), [currentContent])
  const words = text ? text.split(/\s+/).length : 0

  const visibleDocuments = useMemo(() => {
    const needle = normalizeText(query.trim())

    return documents
      .filter(doc => normalizeText(doc.title).includes(needle))
      .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
  }, [documents, query])

  return (
    <section
      className="buddy-doc buddy-theme-scope"
      {...rootAttributes}
      onKeyDown={event => {
        if (
          tab === 'editor' &&
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 's'
        ) {
          event.preventDefault()
          save()
        }
      }}
    >
      <header className="buddy-doc-header">
        <div className="buddy-doc-tabs" role="group" aria-label="Textový editor">
          <button
            type="button"
            aria-pressed={tab === 'editor'}
            onClick={() => setTab('editor')}
          >
            Editor
          </button>

          <button
            type="button"
            aria-pressed={tab === 'files'}
            onClick={() => {
              syncPaper()
              if (run(state.autosaveCurrent)) setTab('files')
            }}
          >
            Dokumenty
          </button>
        </div>

        <button
          type="button"
          className="buddy-doc-primary"
          onClick={() => editDocument(state.createNewDocument)}
        >
          + Nový
        </button>
      </header>

      {error && <p className="buddy-doc-error" role="alert">{error}</p>}

      {tab === 'files' ? (
        <div className="buddy-doc-files">
          <div className="buddy-doc-file-controls">
            <input
              type="search"
              aria-label="Hledat podle názvu"
              placeholder="Hledat dokument…"
              value={query}
              onChange={event => setQuery(event.target.value)}
            />

            <button
              type="button"
              disabled={busy}
              onClick={() => documentInput.current?.click()}
            >
              Importovat
            </button>
          </div>

          {visibleDocuments.length === 0 && (
            <p className="buddy-doc-empty">
              {query
                ? 'Žádný dokument neodpovídá hledání.'
                : 'Tvoje dokumenty se zobrazí tady.'}
            </p>
          )}

          {visibleDocuments.map(doc => (
            <article className="buddy-doc-file" key={doc.id}>
              <button
                type="button"
                aria-label={`Otevřít ${doc.title}`}
                onClick={() => editDocument(() => state.loadDocument(doc.id))}
              >
                <strong>{doc.title}</strong>
                <small>{formatDate(doc.lastModified)}</small>
              </button>

              <button
                type="button"
                className="buddy-doc-delete"
                aria-label={`Smazat ${doc.title}`}
                onClick={() => {
                  if (window.confirm(`Smazat dokument „${doc.title}“?`)) {
                    run(() => state.deleteDocument(doc.id))
                  }
                }}
              >
                ×
              </button>
            </article>
          ))}
        </div>
      ) : (
        <>
          <div className="buddy-doc-title-row">
            <input
              aria-label="Název dokumentu"
              maxLength={160}
              readOnly={preview}
              value={currentTitle}
              onChange={event => state.setTitle(event.target.value)}
            />

            <button type="button" onClick={save}>Uložit</button>
          </div>

          <div className="buddy-doc-actions">
            <button
              type="button"
              aria-pressed={preview}
              onClick={() => {
                syncPaper()
                setPreview(value => !value)
              }}
            >
              {preview ? 'Upravit' : 'Náhled'}
            </button>

            <select
              aria-label="Export dokumentu"
              value=""
              onChange={event => run(() => exportFile(event.target.value))}
            >
              <option value="" disabled>Export</option>
              <option value="txt">Stáhnout TXT</option>
              <option value="html">Stáhnout HTML</option>
              <option value="pdf">Tisk / uložit jako PDF</option>
            </select>

            {!preview && (
              <button
                type="button"
                aria-expanded={more}
                onClick={() => setMore(value => !value)}
              >
                Nástroje
              </button>
            )}
          </div>

          {!preview && (
            <div className="buddy-doc-tools" role="toolbar" aria-label="Formátování textu">
              <button
                type="button"
                aria-label="Vrátit úpravu"
                onMouseDown={event => event.preventDefault()}
                onClick={() => command('undo')}
              >
                ↶
              </button>

              <button
                type="button"
                aria-label="Zopakovat úpravu"
                onMouseDown={event => event.preventDefault()}
                onClick={() => command('redo')}
              >
                ↷
              </button>

              {FORMATS.map(([name, glyph, label]) => (
                <button
                  key={name}
                  type="button"
                  aria-label={label}
                  aria-pressed={pressed.includes(name)}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => command(name)}
                >
                  {glyph}
                </button>
              ))}

              <select
                aria-label="Styl odstavce"
                value=""
                onChange={event => command('formatBlock', event.target.value)}
              >
                <option value="" disabled>Odstavec</option>
                <option value="p">Běžný text</option>
                <option value="h1">Nadpis 1</option>
                <option value="h2">Nadpis 2</option>
                <option value="h3">Nadpis 3</option>
                <option value="blockquote">Citace</option>
              </select>
            </div>
          )}

          {!preview && more && (
            <div className="buddy-doc-tools" role="toolbar" aria-label="Další nástroje">
              <button
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={insertLink}
              >
                Odkaz
              </button>

              <button
                type="button"
                disabled={busy}
                onMouseDown={event => event.preventDefault()}
                onClick={() => imageInput.current?.click()}
              >
                Obrázek
              </button>

              <select
                aria-label="Zarovnání textu"
                value=""
                onChange={event => command(event.target.value)}
              >
                <option value="" disabled>Zarovnání</option>
                <option value="justifyLeft">Vlevo</option>
                <option value="justifyCenter">Na střed</option>
                <option value="justifyRight">Vpravo</option>
                <option value="justifyFull">Do bloku</option>
              </select>

              <label>
                Barva
                <input
                  type="color"
                  aria-label="Barva textu"
                  onChange={event => command('foreColor', event.target.value)}
                />
              </label>

              <label>
                Zvýraznění
                <input
                  type="color"
                  aria-label="Zvýraznění textu"
                  onChange={event => command('hiliteColor', event.target.value)}
                />
              </label>

              <button
                type="button"
                aria-label="Horní index"
                onMouseDown={event => event.preventDefault()}
                onClick={() => command('superscript')}
              >
                x²
              </button>

              <button
                type="button"
                aria-label="Dolní index"
                onMouseDown={event => event.preventDefault()}
                onClick={() => command('subscript')}
              >
                x₂
              </button>

              <button
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={() => command('insertHorizontalRule')}
              >
                Čára
              </button>

              <button
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={() => command('removeFormat')}
              >
                Vymazat formát
              </button>
            </div>
          )}

          <div className="buddy-doc-scroll">
            <div
              ref={paper}
              className="buddy-doc-paper"
              contentEditable={!preview}
              suppressContentEditableWarning
              role={preview ? 'document' : 'textbox'}
              aria-multiline={preview ? undefined : true}
              aria-label="Obsah dokumentu"
              data-placeholder={preview ? 'Prázdný dokument' : 'Začni psát…'}
              onInput={syncPaper}
              onPaste={paste}
              onDrop={event => event.preventDefault()}
              onClick={event => {
                if (!preview && (event.target as Element).closest('a')) {
                  event.preventDefault()
                }
              }}
            />
          </div>

          <footer className="buddy-doc-status">
            <span role="status">
              {error
                ? 'Zkontroluj hlášení'
                : !isSaved
                  ? 'Ukládám…'
                  : message || (state.activeDocId ? 'Uloženo v zařízení' : 'Nový dokument')}
            </span>

            <span>Slova {words} · Znaky {text.length}</span>
          </footer>
        </>
      )}

      <input
        ref={documentInput}
        hidden
        type="file"
        accept=".txt,.md,.html,.htm"
        onChange={importFile}
      />

      <input
        ref={imageInput}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={insertImage}
      />
    </section>
  )
}

export default DocumentEditor
