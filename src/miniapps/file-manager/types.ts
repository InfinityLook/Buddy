export type FileKind = 'pdf' | 'doc' | 'img' | 'zip' | 'other'

export interface FileItem {
  id: string
  name: string
  // Skutečná velikost v bajtech. Dřív to byl řetězec s náhodně
  // vygenerovaným číslem, který s obsahem souboru neměl nic společného.
  size: number
  type: FileKind
  mime: string
  date: string
}

// Odvodí kategorii z přípony a MIME typu, ať má soubor správnou ikonu
export const kindFromFile = (file: File): FileKind => {
  const mime = file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (mime.startsWith('image/')) return 'img'
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'zip'
  if (['doc', 'docx', 'odt', 'txt', 'rtf', 'md'].includes(ext)) return 'doc'
  return 'other'
}

export const formatSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
