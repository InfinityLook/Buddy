export interface DocumentState {
  id: string
  title: string
  content: string
  lastModified: string
}

export type MenuDropdown = 'file' | 'edit' | 'insert' | 'format' | null
export type ActiveTab = 'editor' | 'files'
