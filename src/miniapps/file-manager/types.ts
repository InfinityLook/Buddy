export interface FileItem {
  id: string
  name: string
  size: string
  type: 'pdf' | 'doc' | 'img' | 'zip'
  date: string
}

export const INITIAL_FILES: FileItem[] = [
  { id: '1', name: 'Přednáška_1_Algebra.pdf', size: '2.4 MB', type: 'pdf', date: '12. 08.' },
  { id: '2', name: 'Semestrální_práce_v02.doc', size: '512 KB', type: 'doc', date: '14. 08.' },
  { id: '3', name: 'Schéma_zapojení.img', size: '4.1 MB', type: 'img', date: '15. 08.' },
]
