import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BuddyDialog } from '@/components/buddy-ui/BuddyDialog'
import { BuddyHeader } from '@/components/buddy-ui/BuddyHeader'
import { useNavigate } from 'react-router-dom'
import { useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import { useAppStore } from '@/core/store/useAppStore'
import { useDocumentStore } from '@/miniapps/document-editor/useDocumentStore'
import { getRawStudyPlannerState } from '@/miniapps/study-planner/useStudyPlanner'
import { stahnoutTextovySoubor } from '@/core/utils/download'
import { normalizeText } from '@/core/utils/text'
import {
  cleanNoteHtml,
  escapeNote,
  noteMarkdown,
  notePlainText,
} from './noteContent'
import {
  noteToDraft,
  useNoteDraftStore,
  useQuickNotesStore,
} from './useQuickNotes'
import {
  DEFAULT_NOTEBOOKS,
  NOTE_SORT_MODES,
  noteId,
  SORT_LABELS,
} from './types'
import type { Note, NoteDraft, NoteSortMode } from './types'
import { NoteEditor } from './NoteEditor'
import './QuickNotes.css'

const paths = {
  back: 'm14 5-7 7 7 7',
  close: 'm6 6 12 12M6 18 18 6',
  search: 'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  folder: 'M3 7V5h7l2 2h9v13H3Z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  plus: 'M12 5v14M5 12h14',
  pin: 'm8 3 8 0-1 6 4 4H5l4-4ZM12 13v8',
}

function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}

function Panel({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <BuddyDialog
      surfaceId="quick-notes"
      title={title}
      presentation="sheet"
      className="qn-dialog"
      closeLabel="Zavřít nabídku"
      onClose={onClose}
    >
      {children}
    </BuddyDialog>
  )
}

function Editor({
  initial,
  onClose,
  onMessage,
}: {
  initial: NoteDraft
  onClose: () => void
  onMessage: (message: string, undoId?: string) => void
}) {
  const store = useQuickNotesStore()
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const current = useRef(form)
  const [status, setStatus] = useState('Koncept uložen do zařízení')
  const [error, setError] = useState('')
  const [menu, setMenu] = useState(false)

  const note = store.notes.find(item => item.id === form.id)

  const patch = (change: Partial<NoteDraft>) => {
    const next = { ...current.current, ...change }
    current.current = next
    setForm(next)

    try {
      useNoteDraftStore.getState().put(next)
      setError('')
      setStatus('Ukládám…')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Koncept není uložený.'
      )
      setStatus('Koncept není uložený')
    }
  }

  const save = (): Note | null => {
    const value = current.current

    if (!value.title.trim() && !notePlainText(value.html).trim()) {
      if (useNoteDraftStore.getState().draft?.html === value.html) {
        setStatus('Koncept uložen do zařízení')
      }
      return null
    }

    const result = useQuickNotesStore.getState().saveDraft(value)

    if (!result.ok) {
      setError(result.error)
      setStatus('Změny nejsou uložené')
      return null
    }

    const next = {
      ...value,
      baseRevision: result.note.revision ?? 0,
    }

    current.current = next

    if (value.baseRevision !== next.baseRevision) setForm(next)

    try {
      useNoteDraftStore.getState().put(next)
      setError('')
      setStatus('Uloženo do zařízení')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Zápis konceptu selhal.'
      )
    }

    return result.note
  }

  useEffect(() => {
    const timer = window.setTimeout(save, 650)

    const flush = () => {
      if (document.hidden) save()
    }

    document.addEventListener('visibilitychange', flush)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', flush)
    }
  }, [form])

  const close = () => {
    const empty =
      !current.current.title.trim() &&
      !notePlainText(current.current.html).trim()

    if (
      empty &&
      current.current.baseRevision !== null &&
      !window.confirm(
        'Zahodit vymazání textu a vrátit se k uložené poznámce?'
      )
    ) {
      return
    }

    if (!empty && !save()) return

    try {
      useNoteDraftStore.getState().put(null)
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Zavření selhalo.'
      )
    }
  }

  const action = (fn: (saved: Note) => void) => {
    const saved = save()
    if (!saved) return

    try {
      fn(saved)
      setMenu(false)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Akce se nepovedla.'
      )
    }
  }

  const exportText = (format: 'txt' | 'md') =>
    stahnoutTextovySoubor(
      `${form.title || 'Poznamka'}.${format}`,
      format === 'md'
        ? `# ${form.title || 'Bez názvu'}\n\n${noteMarkdown(form.html)}`
        : `${form.title}\n\n${notePlainText(form.html)}`
    )

  return (
    <section className="qn-editor">
      <BuddyHeader
        title="Poznámky"
        variant="quiet"
        onBack={close}
        backLabel="Zpět na poznámky"
        actions={
          <>
            <button
              className="buddy-ui-button buddy-ui-button--icon"
              type="button"
              aria-label={note?.pinned ? 'Odepnout poznámku' : 'Připnout poznámku'}
              onClick={() => action(saved => {
                store.togglePin(saved.id)
                patch({
                  baseRevision: useQuickNotesStore.getState().notes.find(
                    item => item.id === saved.id
                  )?.revision ?? 0,
                })
              })}
            >
              <Icon name="pin" />
            </button>
            <button
              className="buddy-ui-button buddy-ui-button--icon"
              type="button"
              aria-label="Možnosti poznámky"
              onClick={() => setMenu(true)}
            >
              <Icon name="more" />
            </button>
          </>
        }
      />

      <div className="qn-save-status" role="status">
        {status}
      </div>

      <div className="qn-editor-meta">
        <input
          className="qn-title-input"
          aria-label="Název poznámky"
          placeholder="Bez názvu"
          maxLength={300}
          value={form.title}
          onChange={event => patch({ title: event.target.value })}
        />

        <div className="qn-meta-row">
          <select className="buddy-ui-input"
            aria-label="Zápisník poznámky"
            value={form.folderId}
            onChange={event => {
              const id = event.target.value
              patch({
                folderId: id,
                category: id === 'school'
                  ? 'Škola'
                  : id === 'ideas'
                    ? 'Nápady'
                    : 'Osobní',
              })
            }}
          >
            {store.notebooks.map(book => (
              <option key={book.id} value={book.id}>
                {book.name}
              </option>
            ))}
          </select>

          <input
            className="buddy-ui-input"
            aria-label="Štítky oddělené čárkou"
            placeholder="Štítky, oddělené čárkou"
            value={form.tagsText}
            maxLength={500}
            onChange={event => patch({ tagsText: event.target.value })}
          />
        </div>

        {note?.updatedAtTs && (
          <small>
            Upraveno {new Date(note.updatedAtTs).toLocaleString('cs-CZ')}
          </small>
        )}
      </div>

      {error && (
        <div className="qn-error buddy-ui-alert" role="alert">
          {error}

          <button
            className="qn-text"
            type="button"
            onClick={() => save()}
          >
            Zkusit znovu
          </button>

          <button
            className="qn-text"
            type="button"
            onClick={() => {
              const next = {
                ...current.current,
                id: noteId(),
                baseRevision: null,
              }
              patch(next)
            }}
          >
            Uložit jako novou
          </button>

          <button
            className="qn-text"
            type="button"
            onClick={() => exportText('txt')}
          >
            Stáhnout rozepsaný text
          </button>
        </div>
      )}

      <NoteEditor
        key={form.id}
        id={form.id}
        html={form.html}
        onChange={html => patch({ html })}
      />

      {menu && (
        <Panel
          title="Možnosti poznámky"
          onClose={() => setMenu(false)}
        >
          <button
            className="qn-menu-item"
            type="button"
            onClick={() => {
              exportText('txt')
              setMenu(false)
            }}
          >
            Stáhnout jako TXT
          </button>

          <button
            className="qn-menu-item"
            type="button"
            onClick={() => {
              exportText('md')
              setMenu(false)
            }}
          >
            Stáhnout jako Markdown
          </button>

          <button
            className="qn-menu-item"
            type="button"
            onClick={() => action(saved => {
              const planner = getRawStudyPlannerState()
              const before = new Set(
                planner.tasks.map(item => item.id)
              )

              planner.addTask({
                topic: saved.title,
                subject: store.notebooks.find(
                  book => book.id === saved.folderId
                )?.name ?? saved.category,
                dueDate: '',
                priority: 'Střední',
                poznamka: saved.content,
              })

              if (
                !getRawStudyPlannerState().tasks.some(
                  item => !before.has(item.id)
                )
              ) {
                throw new Error('Úkol se nepodařilo uložit.')
              }

              onMessage('Úkol je vytvořený v Plánovači.')
            })}
          >
            Vytvořit úkol v Plánovači
          </button>

          <button
            className="qn-menu-item"
            type="button"
            onClick={() => action(saved => {
              const docs = useDocumentStore.getState()

              if (!docs.isSaved) docs.saveCurrentDocument()

              docs.importDocument(
                saved.title,
                cleanNoteHtml(saved.html ?? escapeNote(saved.content))
              )

              useNoteDraftStore.getState().put(null)

              useAppStore.getState().setActiveAppId(
                'document-editor',
                useAppStore.getState().returnPath
              )

              navigate('/apps')
            })}
          >
            Vytvořit kopii v textovém editoru
          </button>

          <button
            className="qn-menu-item"
            type="button"
            onClick={() => action(saved => {
              store.toggleArchive(saved.id)
              useNoteDraftStore.getState().put(null)
              onClose()
              onMessage(
                saved.archivedAt
                  ? 'Poznámka vrácena z archivu.'
                  : 'Poznámka archivována.'
              )
            })}
          >
            {note?.archivedAt ? 'Vrátit z archivu' : 'Archivovat'}
          </button>

          <button
            className="qn-menu-item danger"
            type="button"
            onClick={() => action(saved => {
              store.deleteNote(saved.id)
              useNoteDraftStore.getState().put(null)
              onClose()
              onMessage(
                'Poznámka je v koši. Můžeš ji obnovit.',
                saved.id
              )
            })}
          >
            Přesunout do koše
          </button>
        </Panel>
      )}
    </section>
  )
}

export function QuickNotes({ onBack }: { onBack?: () => void }) {
  const store = useQuickNotesStore()
  const draftStore = useNoteDraftStore()
  const { rootAttributes } = useSurfaceAppearance('quick-notes')

  const root = useRef<HTMLDivElement>(null)
  const file = useRef<HTMLInputElement>(null)

  const [editing, setEditing] = useState(!!draftStore.draft)
  const [panel, setPanel] = useState(false)
  const [query, setQuery] = useState('')
  const [folder, setFolder] = useState('all')
  const [tag, setTag] = useState('')
  const [scope, setScope] = useState<'active' | 'archive' | 'trash'>('active')
  const [sort, setSort] = useState<NoteSortMode>('updated')
  const [bookName, setBookName] = useState('')
  const [message, setMessage] = useState('')
  const [undoId, setUndoId] = useState<string | null>(null)

  const showMessage = (text: string, undo: string | null = null) => {
    setMessage(text)
    setUndoId(undo)
  }

  const run = (fn: () => void) => {
    try {
      fn()
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : 'Akce se nepovedla.'
      )
    }
  }

  useEffect(() => {
    const viewport = window.visualViewport
    const host = root.current?.closest<HTMLElement>(
      '.app-fullscreen-view--notes'
    )

    const resize = () => {
      if (host && viewport) host.style.height = `${viewport.height}px`
    }

    resize()
    viewport?.addEventListener('resize', resize)

    return () => {
      viewport?.removeEventListener('resize', resize)
      if (host) host.style.removeProperty('height')
    }
  }, [])

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === 'schoolbuddy-quick-notes-storage') {
        void useQuickNotesStore.persist.rehydrate()
      }
    }

    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const open = (note?: Note) => run(() => {
    draftStore.put(noteToDraft(note))
    setEditing(true)
  })

  const filtered = store.notes
    .filter(note =>
      (
        scope === 'trash'
          ? !!note.deletedAt
          : scope === 'archive'
            ? !note.deletedAt && !!note.archivedAt
            : !note.deletedAt && !note.archivedAt
      ) &&
      (folder === 'all' || note.folderId === folder) &&
      (!tag || note.tags?.includes(tag)) &&
      normalizeText(
        `${note.title} ${note.content} ${(note.tags ?? []).join(' ')}`
      ).includes(normalizeText(query))
    )
    .sort((a, b) =>
      Number(!!b.pinned) - Number(!!a.pinned) ||
      (
        sort === 'alphabetical'
          ? a.title.localeCompare(b.title, 'cs')
          : sort === 'oldest'
            ? (a.createdAtTs ?? 0) - (b.createdAtTs ?? 0)
            : sort === 'newest'
              ? (b.createdAtTs ?? 0) - (a.createdAtTs ?? 0)
              : (b.updatedAtTs ?? b.createdAtTs ?? 0) -
                (a.updatedAtTs ?? a.createdAtTs ?? 0)
      )
    )

  const allTags = [...new Set(
    store.notes
      .filter(note => !note.deletedAt)
      .flatMap(note => note.tags ?? [])
  )]

  const cards = (notes: Note[]) => notes.map(note => (
    <article
      className={`buddy-ui-card qn-card${note.pinned ? ' pinned' : ''}`}
      key={note.id}
    >
      <button
        type="button"
        className="qn-card-open"
        onClick={() => scope !== 'trash' && open(note)}
        disabled={scope === 'trash'}
      >
        <strong>
          {note.pinned && '⌖ '}
          {note.title}
        </strong>
        <p>{note.content || 'Bez obsahu'}</p>
        <small>
          {store.notebooks.find(
            book => book.id === note.folderId
          )?.name ?? note.category}
          {' · '}
          {note.updatedAtTs
            ? new Date(note.updatedAtTs).toLocaleDateString('cs-CZ')
            : note.createdAt || 'Starší poznámka'}
          {(note.tags ?? [])
            .slice(0, 2)
            .map(value => ` · #${value}`)
            .join('')}
        </small>
      </button>

      {scope === 'trash' && (
        <div className="qn-trash-actions">
          <button
            className="qn-text"
            type="button"
            onClick={() => run(() => store.restoreNote(note.id))}
          >
            Obnovit
          </button>

          <button
            className="qn-text danger"
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  `Trvale smazat „${note.title}“? Tuto akci nelze vrátit.`
                )
              ) {
                run(() => store.purgeNote(note.id))
              }
            }}
          >
            Trvale smazat
          </button>
        </div>
      )}
    </article>
  ))

  return (
    <div
      ref={root}
      className="qn-app buddy-theme-scope"
      {...rootAttributes}
    >
      {editing && draftStore.draft ? (
        <Editor
          key={draftStore.draft.id}
          initial={draftStore.draft}
          onClose={() => setEditing(false)}
          onMessage={(text, id) => showMessage(text, id)}
        />
      ) : (
        <>
          <BuddyHeader
            title="Poznámky"
            variant="quiet"
            onBack={onBack ?? (() => useAppStore.getState().setActiveAppId(null))}
            actions={
              <button
                className="buddy-ui-button buddy-ui-button--icon"
                type="button"
                aria-label="Zápisníky a možnosti"
                onClick={() => setPanel(true)}
              >
                <Icon name="folder" />
              </button>
            }
          />

          <div className="qn-controls">
            <span className="qn-count">
              {store.notes.filter(
                note => !note.deletedAt && !note.archivedAt
              ).length} poznámek
            </span>

            <label className="qn-search">
              <Icon name="search" />
              <input
                className="buddy-ui-input"
                type="search"
                aria-label="Hledat v poznámkách"
                placeholder="Hledat v poznámkách…"
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
            </label>

            <div
              className="qn-filters"
              role="group"
              aria-label="Zápisníky"
            >
              <button
                type="button"
                aria-pressed={folder === 'all'}
                onClick={() => setFolder('all')}
              >
                Vše
              </button>

              {store.notebooks.map(book => (
                <button
                  type="button"
                  key={book.id}
                  aria-pressed={folder === book.id}
                  onClick={() => setFolder(book.id)}
                >
                  {book.name}
                </button>
              ))}
            </div>

            <div className="qn-list-tools">
              <select className="buddy-ui-input"
                aria-label="Zobrazení poznámek"
                value={scope}
                onChange={event =>
                  setScope(event.target.value as typeof scope)
                }
              >
                <option value="active">Aktivní</option>
                <option value="archive">Archiv</option>
                <option value="trash">Koš</option>
              </select>

              <select className="buddy-ui-input"
                aria-label="Řadit poznámky"
                value={sort}
                onChange={event =>
                  setSort(event.target.value as NoteSortMode)
                }
              >
                {NOTE_SORT_MODES.map(mode => (
                  <option key={mode} value={mode}>
                    {SORT_LABELS[mode]}
                  </option>
                ))}
              </select>

              {allTags.length > 0 && (
                <select className="buddy-ui-input"
                  aria-label="Filtr štítku"
                  value={tag}
                  onChange={event => setTag(event.target.value)}
                >
                  <option value="">Všechny štítky</option>
                  {allTags.map(value => (
                    <option key={value} value={value}>
                      #{value}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <main className="qn-list" aria-label="Seznam poznámek">
            {filtered.some(note => note.pinned) && (
              <section>
                <h2>Připnuté</h2>
                {cards(filtered.filter(note => note.pinned))}
              </section>
            )}

            {filtered.some(note => !note.pinned) && (
              <section>
                <h2>
                  {scope === 'trash'
                    ? 'Smazané poznámky'
                    : scope === 'archive'
                      ? 'Archivované'
                      : 'Poslední poznámky'}
                </h2>
                {cards(filtered.filter(note => !note.pinned))}
              </section>
            )}

            {filtered.length === 0 && (
              <div className="qn-empty buddy-ui-card">
                <Icon name="folder" />
                <h2>
                  {scope === 'trash'
                    ? 'Koš je prázdný'
                    : query || folder !== 'all' || tag
                      ? 'Žádná odpovídající poznámka'
                      : 'Místo pro tvoje myšlenky'}
                </h2>
                <p>
                  {scope === 'active'
                    ? 'Zapiš si nápad, zadání nebo něco, k čemu se chceš vrátit.'
                    : 'Tady se zobrazí přesunuté poznámky.'}
                </p>
              </div>
            )}
          </main>

          <footer className="qn-actions">
            <button
              type="button"
              className="buddy-ui-button buddy-ui-button--primary qn-primary"
              onClick={() => open()}
            >
              <Icon name="plus" />
              Nová poznámka
            </button>
          </footer>
        </>
      )}

      {message && (
        <div className="qn-message" role="status">
          <span>{message}</span>

          {undoId && (
            <button
              className="qn-text"
              type="button"
              onClick={() => run(() => {
                store.restoreNote(undoId)
                showMessage('Poznámka obnovena.')
              })}
            >
              Vrátit
            </button>
          )}

          <button
            className="qn-icon"
            type="button"
            aria-label="Zavřít zprávu"
            onClick={() => showMessage('')}
          >
            <Icon name="close" />
          </button>
        </div>
      )}

      {panel && (
        <Panel
          title="Zápisníky a data"
          onClose={() => setPanel(false)}
        >
          <form
            className="qn-book-form"
            onSubmit={event => {
              event.preventDefault()
              run(() => {
                store.addNotebook(bookName)
                setBookName('')
              })
            }}
          >
            <label>
              Nový zápisník
              <input
                aria-label="Název zápisníku"
                maxLength={60}
                value={bookName}
                onChange={event => setBookName(event.target.value)}
              />
            </label>

            <button className="buddy-ui-button buddy-ui-button--primary qn-primary" type="submit">
              Přidat zápisník
            </button>
          </form>

          {store.notebooks.map(book => (
            <div className="qn-book-row" key={book.id}>
              <span>{book.name}</span>

              {!DEFAULT_NOTEBOOKS.some(
                item => item.id === book.id
              ) && (
                <button
                  className="qn-text"
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Odstranit zápisník? Poznámky se přesunou do Osobní.'
                      )
                    ) {
                      run(() => {
                        store.deleteNotebook(book.id)
                        if (folder === book.id) setFolder('all')
                      })
                    }
                  }}
                >
                  Odstranit
                </button>
              )}
            </div>
          ))}

          <button
            className="qn-menu-item"
            type="button"
            onClick={() => stahnoutTextovySoubor(
              'Buddy-poznamky.json',
              JSON.stringify({
                format: 'buddy-notes-v1',
                notes: store.notes.filter(note => !note.deletedAt),
                notebooks: store.notebooks,
              }, null, 2)
            )}
          >
            Exportovat poznámky do JSON
          </button>

          <button
            className="qn-menu-item"
            type="button"
            onClick={() => file.current?.click()}
          >
            Importovat export poznámek
          </button>

          <p className="qn-hint">
            Import vytvoří kopie bez přepsání stávajících poznámek.
            Vlastní zápisníky se zachovají nebo spojí podle názvu.
            Poznámky a koncepty se ukládají do tohoto zařízení.
          </p>
        </Panel>
      )}

      <input
        ref={file}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={event => {
          const picked = event.target.files?.[0]
          event.target.value = ''

          if (!picked) return

          if (picked.size > 5 * 1024 * 1024) {
            showMessage('Soubor může mít nejvýš 5 MB.')
            return
          }

          void picked.text()
            .then(raw => {
              const count = store.importNotes(JSON.parse(raw))
              showMessage(`Importováno poznámek: ${count}`)
              setPanel(false)
            })
            .catch(error => showMessage(
              error instanceof Error
                ? error.message
                : 'Import se nepovedl.'
            ))
        }}
      />
    </div>
  )
}
