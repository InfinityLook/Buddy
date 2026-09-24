import { describe, it, expect } from 'vitest'
import { StudyTask, spocitejPodukoly } from '@/miniapps/study-planner/types'

// ==========================================
// Podúkoly u úkolu v Planeru — spocitejPodukoly je jediná čistá funkce,
// co appka pro tuhle appku píše (zbytek je Zustand store akce v
// useStudyPlanner.ts, ten importuje core/utils/notify.ts a nedá se
// proto testovat ve Vitestu, viz CLAUDE.md's zeď kolem virtual:pwa-register).
// ==========================================

const task = (patch: Partial<StudyTask> = {}): StudyTask => ({
  id: 't1',
  subject: 'Matematika',
  topic: 'Test',
  dueDate: '2025-01-01',
  priority: 'Střední',
  completed: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: 0,
  deletedAt: null,
  ...patch,
})

describe('spocitejPodukoly', () => {
  it('starší úkol bez pole podukoly vrátí 0 z 0, ne pád', () => {
    const t = task()
    delete (t as { podukoly?: unknown }).podukoly
    expect(spocitejPodukoly(t)).toEqual({ hotovo: 0, celkem: 0 })
  })

  it('spočítá hotové podúkoly z celkového počtu', () => {
    const t = task({
      podukoly: [
        { id: 'p1', text: 'Krok 1', hotovo: true },
        { id: 'p2', text: 'Krok 2', hotovo: false },
        { id: 'p3', text: 'Krok 3', hotovo: true },
      ],
    })
    expect(spocitejPodukoly(t)).toEqual({ hotovo: 2, celkem: 3 })
  })

  it('prázdné pole podukoly vrátí 0 z 0', () => {
    expect(spocitejPodukoly(task({ podukoly: [] }))).toEqual({ hotovo: 0, celkem: 0 })
  })
})
