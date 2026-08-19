export type FileKind = 'pdf' | 'doc' | 'img' | 'zip' | 'other'

export const UNSORTED_FOLDER = 'Nezařazené'
export const ALL_FOLDERS = 'Vše'

export type SortMode = 'date' | 'name' | 'size'

export const SORT_LABELS: Record<SortMode, string> = {
  date: 'Nejnovější',
  name: 'Podle názvu',
  size: 'Podle velikosti',
}

export const KIND_LABELS: Record<FileKind, string> = {
  pdf: 'PDF',
  doc: 'Dokumenty',
  img: 'Obrázky',
  zip: 'Archivy',
  other: 'Ostatní',
}

export interface FileItem {
  id: string
  name: string
  // Skutečná velikost v bajtech. Dřív to byl řetězec s náhodně
  // vygenerovaným číslem, který s obsahem souboru neměl nic společného.
  size: number
  type: FileKind
  mime: string
  date: string
  // Čas přidání v milisekundách. Řetězec `date` je jen na zobrazení
  // a řadit se podle něj nedá ("9. 1." vs "10. 1.").
  addedAt?: number
  // Složka, do které si soubor uživatel zařadil
  folder?: string
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

// Skloňování počtu souborů: 1 soubor / 2–4 soubory / 5+ souborů
export const sklonujSoubory = (pocet: number): string => {
  if (pocet === 1) return 'soubor'
  if (pocet >= 2 && pocet <= 4) return 'soubory'
  return 'souborů'
}
