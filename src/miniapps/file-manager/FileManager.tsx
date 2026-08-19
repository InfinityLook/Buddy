import React, { useRef, useState } from 'react'
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
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Přejmenování a přesun do složky v jednom formuláři
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editFolder, setEditFolder] = useState('')

  const showMessage = (text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(null), 2600)
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

  // Mazání je nevratné a obsah souboru zmizí i z IndexedDB, takže se
  // na něj ptáme. Dřív stačilo jedno klepnutí a soubor byl pryč.
  const handleDelete = (item: FileItem) => {
    if (window.confirm(`Smazat soubor „${item.name}“? Obsah se z zařízení odstraní.`)) {
      void deleteFile(item.id)
      if (editingId === item.id) setEditingId(null)
    }
  }

  return (
    <div className="fm-app">
      <div className="fm-header">
        <h2>File Manager</h2>
        <button className="fm-add-btn" onClick={() => inputRef.current?.click()} disabled={busy}>
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
        className="fm-search"
        placeholder="Hledat soubor..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Složky — objeví se, až je z čeho vybírat */}
      {folders.length > 1 && (
        <div className="fm-folders">
          <button
            className={`fm-folder-chip ${folder === ALL_FOLDERS ? 'active' : ''}`}
            onClick={() => setFolder(ALL_FOLDERS)}
          >
            📂 {ALL_FOLDERS}
          </button>
          {folders.map((f) => (
            <button
              key={f}
              className={`fm-folder-chip ${folder === f ? 'active' : ''}`}
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
            className="fm-select"
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
            className="fm-select"
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

      {message && <p className="fm-message">{message}</p>}

      <div className="fm-list">
        {files.length === 0 ? (
          <p className="fm-empty">
            {totalCount === 0
              ? 'Zatím tu nemáš žádné soubory. Nahraj první 📎'
              : 'Téhle podmínce neodpovídá žádný soubor.'}
          </p>
        ) : (
          files.map((f) => {
            const available = isAvailable(f.id)
            const thumb = thumbnails[f.id]

            return (
              <div key={f.id} className={`fm-card ${available ? '' : 'fm-card--missing'}`}>
                {thumb ? (
                  <img className="fm-thumb" src={thumb} alt="" />
                ) : (
                  <span className="fm-icon">{TYPE_ICONS[f.type]}</span>
                )}

                <div className="fm-info">
                  <span className="fm-name">{f.name}</span>
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
                    className="fm-icon-btn"
                    onClick={() => handleDownload(f)}
                    aria-label={`Stáhnout ${f.name}`}
                  >
                    ⬇️
                  </button>
                )}
                <button
                  className="fm-icon-btn"
                  onClick={() => openEdit(f)}
                  aria-label={`Přejmenovat ${f.name}`}
                >
                  ✏️
                </button>
                <button
                  className="fm-icon-btn danger"
                  onClick={() => handleDelete(f)}
                  aria-label={`Smazat ${f.name}`}
                >
                  ✕
                </button>
              </div>
            )
          })
        )}
      </div>

      {editingId && (
        <form className="fm-edit-form" onSubmit={submitEdit}>
          <span className="fm-edit-title">Název a složka</span>
          <input
            type="text"
            className="fm-edit-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
            autoFocus
          />
          <input
            type="text"
            className="fm-edit-input"
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
            <button type="submit" className="fm-add-btn">
              Uložit
            </button>
            <button
              type="button"
              className="fm-cancel-btn"
              onClick={() => setEditingId(null)}
            >
              Zrušit
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
