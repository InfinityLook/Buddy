import { BuddyDialog } from '@/components/buddy-ui/BuddyDialog'
import { AppIcon } from '@/pages/app/components/AppIcon'
import React, { useEffect, useRef, useState } from 'react'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import { useFileManager, useImageThumbnails } from './useFileManager'
import {
  ALL_FOLDERS,
  FileItem,
  FileKind,
  KIND_LABELS,
  SORT_LABELS,
  SortMode,
  UNSORTED_FOLDER,
  formatSize,
  sklonujSoubory,
} from './types'
import './FileManager.css'

const TYPE_ICONS: Record<FileKind, string> = {
  pdf: '📄',
  doc: '📝',
  img: '🖼️',
  zip: '📦',
  other: '📎',
}

export const FileManager: React.FC = () => {
  const { rootAttributes } = useSurfaceAppearance('file-manager')

  const {
    files,
    totalCount,
    totalBytes,
    folders,
    availableKinds,
    folder,
    setFolder,
    kindFilter,
    setKindFilter,
    sortMode,
    setSortMode,
    search,
    setSearch,
    uploadFile,
    downloadFile,
    updateFile,
    deleteFile,
    isAvailable,
  } = useFileManager()

  const thumbnails = useImageThumbnails(files)

  const inputRef = useRef<HTMLInputElement>(null)
  const uploadButton = useRef<HTMLButtonElement>(null)
  const cancelDeleteButton = useRef<HTMLButtonElement>(null)
  const messageTimer = useRef<number | undefined>(undefined)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [detail, setDetail] = useState<FileItem | null>(null)
  const [pendingDelete, setPendingDelete] = useState<FileItem | null>(null)

  useEffect(() => () => window.clearTimeout(messageTimer.current), [])

  // Přejmenování a přesun do složky v jednom formuláři
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editFolder, setEditFolder] = useState('')

  const showMessage = (text: string) => {
    window.clearTimeout(messageTimer.current)
    setMessage(text)
    messageTimer.current = window.setTimeout(() => setMessage(null), 3000)
  }

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (selected.length === 0) return

    setBusy(true)
    let added = 0
    for (const file of selected) {
      const result = await uploadFile(file, folder)
      if (result.ok) added += 1
      else showMessage(result.error)
    }
    setBusy(false)

    if (added > 0) showMessage(added === 1 ? 'Soubor uložen ✓' : `Uloženo souborů: ${added} ✓`)
  }

  const handleDownload = async (item: FileItem) => {
    const result = await downloadFile(item)
    if (!result.ok) showMessage(result.error)
  }

  const openEdit = (item: FileItem) => {
    setEditName(item.name)
    setEditFolder(item.folder || UNSORTED_FOLDER)
    setEditingId(item.id)
  }

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) updateFile(editingId, editName, editFolder)
    setEditingId(null)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    void deleteFile(pendingDelete.id)
    setPendingDelete(null)
    showMessage('Soubor smazán.')
    requestAnimationFrame(() => uploadButton.current?.focus())
  }

  return (
    <div className="buddy-miniapp fm-app buddy-theme-scope" {...rootAttributes}>
      <SurfaceBackdrop surfaceId="file-manager" />
      <div className="fm-header">
        <button ref={uploadButton} type="button" className="buddy-ui-button buddy-ui-button--primary fm-add-btn" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Ukládám…' : '+ Nahrát'}
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={handleFilesSelected} />
      </div>

      {totalCount > 0 && (
        <span className="fm-summary">
          {totalCount} {sklonujSoubory(totalCount)} · {formatSize(totalBytes)} v zařízení
        </span>
      )}

      <input
        type="search"
        className="buddy-ui-input fm-search"
        aria-label="Hledat soubor"
        placeholder="Hledat soubor..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Složky — objeví se, až je z čeho vybírat */}
      {folders.length > 1 && (
        <div className="fm-folders">
          <button
            className={`buddy-ui-button fm-folder-chip ${folder === ALL_FOLDERS ? 'active' : ''}`}
            aria-pressed={folder === ALL_FOLDERS}
            onClick={() => setFolder(ALL_FOLDERS)}
          >
            📂 {ALL_FOLDERS}
          </button>
          {folders.map((f) => (
            <button
              key={f}
              className={`buddy-ui-button fm-folder-chip ${folder === f ? 'active' : ''}`}
              aria-pressed={folder === f}
              onClick={() => setFolder(f)}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {totalCount > 1 && (
        <div className="fm-toolbar">
          <select
            className="buddy-ui-input fm-select"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as FileKind | 'all')}
            aria-label="Filtr podle typu"
          >
            <option value="all">Všechny typy</option>
            {availableKinds.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>

          <select
            className="buddy-ui-input fm-select"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            aria-label="Řazení"
          >
            {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
              <option key={m} value={m}>
                {SORT_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
      )}

      {message && <p className="buddy-ui-status fm-message" role="status">{message}</p>}

      <div className="fm-list">
        {files.length === 0 ? (
          <p className="buddy-ui-status fm-empty">
            {totalCount === 0
              ? 'Zatím tu nemáš žádné soubory.'
              : search.trim() || kindFilter !== 'all'
                ? 'Filtrům neodpovídá žádný soubor.'
                : 'V této složce nejsou žádné soubory.'}
          </p>
        ) : (
          files.map((f) => {
            const available = isAvailable(f.id)
            const thumb = thumbnails[f.id]

            return (
              <div key={f.id} className={`buddy-ui-card fm-card ${available ? '' : 'fm-card--missing'}`}>
                {thumb ? (
                  <img className="fm-thumb" src={thumb} alt="" />
                ) : (
                  <span className="fm-icon">{TYPE_ICONS[f.type]}</span>
                )}

                <div className="fm-info">
                  <button type="button" className="fm-name" onClick={() => setDetail(f)}>{f.name}</button>
                  <span className="fm-meta">
                    {available
                      ? `${formatSize(f.size)} • ${f.date}${
                          f.folder && f.folder !== UNSORTED_FOLDER ? ` • ${f.folder}` : ''
                        }`
                      : 'Obsah v tomto zařízení chybí'}
                  </span>
                </div>

                {available && (
                  <button
                    className="buddy-ui-button buddy-ui-button--icon fm-icon-btn"
                    onClick={() => handleDownload(f)}
                    aria-label={`Stáhnout ${f.name}`}
                  >
                    <AppIcon name="download" size={18} />
                  </button>
                )}
                <button
                  className="buddy-ui-button buddy-ui-button--icon fm-icon-btn"
                  onClick={() => openEdit(f)}
                  aria-label={`Přejmenovat ${f.name}`}
                >
                  <AppIcon name="document-editor" size={18} />
                </button>
                <button
                  className="buddy-ui-button buddy-ui-button--icon fm-icon-btn danger"
                  onClick={() => setPendingDelete(f)}
                  aria-label={`Smazat ${f.name}`}
                >
                  <AppIcon name="x" size={18} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {editingId && (
        <BuddyDialog
          surfaceId="file-manager"
          title="Název a složka"
          onClose={() => setEditingId(null)}
          contentClassName="buddy-miniapp"
        >
          <form className="fm-edit-form" onSubmit={submitEdit}>
            <input
              type="text"
              className="fm-edit-input"
              aria-label="Název souboru"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              autoFocus
            />
            <input
              type="text"
              className="fm-edit-input"
              aria-label="Složka"
              list="fm-folder-list"
              placeholder={`Složka — výchozí ${UNSORTED_FOLDER}`}
              value={editFolder}
              onChange={(e) => setEditFolder(e.target.value)}
            />
            <datalist id="fm-folder-list">
              {folders.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>

            <div className="fm-edit-actions">
              <button type="submit" className="buddy-ui-button buddy-ui-button--primary fm-add-btn">
                Uložit
              </button>
              <button
                type="button"
                className="buddy-ui-button fm-cancel-btn"
                onClick={() => setEditingId(null)}
              >
                Zrušit
              </button>
            </div>
          </form>
        </BuddyDialog>
      )}
      {detail && (
        <BuddyDialog
          surfaceId="file-manager"
          title={detail.name}
          onClose={() => setDetail(null)}
          footer={isAvailable(detail.id) && (
            <button type="button" className="buddy-ui-button buddy-ui-button--primary" onClick={() => {
              void handleDownload(detail)
              setDetail(null)
            }}>Stáhnout soubor</button>
          )}
        >
          <dl className="fm-detail">
            <dt>Typ</dt><dd>{KIND_LABELS[detail.type]}</dd>
            <dt>Velikost</dt><dd>{formatSize(detail.size)}</dd>
            <dt>Složka</dt><dd>{detail.folder || UNSORTED_FOLDER}</dd>
            <dt>Přidáno</dt><dd>{detail.date}</dd>
          </dl>
          {!isAvailable(detail.id) && <p className="buddy-ui-status">Obsah v tomto zařízení chybí.</p>}
        </BuddyDialog>
      )}

      {pendingDelete && (
        <BuddyDialog
          surfaceId="file-manager"
          title="Smazat soubor?"
          initialFocusRef={cancelDeleteButton}
          onClose={() => setPendingDelete(null)}
          footer={(
            <>
              <button type="button" ref={cancelDeleteButton} className="buddy-ui-button" onClick={() => setPendingDelete(null)}>
                Zrušit
              </button>
              <button type="button" className="buddy-ui-button fm-delete-btn" onClick={confirmDelete}>Smazat soubor</button>
            </>
          )}
        >
          <p>Soubor <strong>{pendingDelete.name}</strong> se odstraní ze zařízení.</p>
        </BuddyDialog>
      )}
    </div>
  )
}
