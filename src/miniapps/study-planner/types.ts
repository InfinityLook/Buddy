export interface StudyTask {
  id: string
  subject: string
  topic: string
  dueDate: string
  priority: 'Vysoká' | 'Střední' | 'Nízká'
  completed: boolean
}

export const INITIAL_TASKS: StudyTask[] = [
  {
    id: '1',
    subject: 'Matematika',
    topic: 'Integrální počet - příprava na test',
    dueDate: '2026-08-18',
    priority: 'Vysoká',
    completed: false,
  },
  {
    id: '2',
    subject: 'Fyzika',
    topic: 'Laboratorní práce #3',
    dueDate: '2026-08-20',
    priority: 'Střední',
    completed: true,
  },
]
