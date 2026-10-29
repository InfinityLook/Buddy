import { describe, it, expect } from 'vitest'
import { sestavChytrySouhrn, vetaODnesnimKroku, vetaONejblizsimTerminu } from '@/flagships/school-room/chytrySouhrn'
import { StudyTask, todayIso } from '@/miniapps/study-planner/types'

// ==========================================
// School Roomův chytrý souhrn (viz chytrySouhrn.ts) — čistá funkce nad
// Planerovými úkoly, žádný store ani komponenta, testovatelná přímo.
// ==========================================

const task = (patch: Partial<StudyTask> = {}): StudyTask => ({
  id: 't1',
  subject: 'Matematika',
  topic: 'Test',
  dueDate: '2025-01-10',
  priority: 'Střední',
  completed: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: 0,
  deletedAt: null,
  ...patch,
})

const DNES = '2025-01-05'

describe('sestavChytrySouhrn — nejblizsiTermin', () => {
  it('bez jediného nesplněného úkolu s platným termínem vrátí null', () => {
    expect(sestavChytrySouhrn([], DNES).nejblizsiTermin).toBeNull()
  })

  it('vybere úkol s nejbližším (nejmenším) termínem', () => {
    const tasks = [
      task({ id: 'a', dueDate: '2025-02-01' }),
      task({ id: 'b', dueDate: '2025-01-20' }),
      task({ id: 'c', dueDate: '2025-03-01' }),
    ]
    expect(sestavChytrySouhrn(tasks, DNES).nejblizsiTermin?.task.id).toBe('b')
  })

  it('splněný úkol se do nejbližšího termínu nepočítá, i kdyby byl termínem nejblíž', () => {
    const tasks = [task({ id: 'hotovo', dueDate: '2025-01-06', completed: true }), task({ id: 'zbyva', dueDate: '2025-01-20' })]
    expect(sestavChytrySouhrn(tasks, DNES).nejblizsiTermin?.task.id).toBe('zbyva')
  })

  it('úkol s neplatným (volným textovým) termínem se do nejbližšího termínu nepočítá', () => {
    const tasks = [task({ id: 'volny-text', dueDate: 'Brzy' }), task({ id: 'platny', dueDate: '2025-01-20' })]
    expect(sestavChytrySouhrn(tasks, DNES).nejblizsiTermin?.task.id).toBe('platny')
  })
})

describe('sestavChytrySouhrn — dnesniKrok', () => {
  it('bez úkolu plánovaného/splatného dnes vrátí null', () => {
    const tasks = [task({ dueDate: '2025-01-20' })]
    expect(sestavChytrySouhrn(tasks, DNES).dnesniKrok).toBeNull()
  })

  it('vybere úkol podle planDate, i když dueDate je jiný den', () => {
    const t = task({ dueDate: '2025-01-20', planDate: DNES })
    expect(sestavChytrySouhrn([t], DNES).dnesniKrok?.id).toBe(t.id)
  })

  it('bez planDate vybere úkol, jehož dueDate je dnes', () => {
    const t = task({ dueDate: DNES, planDate: null })
    expect(sestavChytrySouhrn([t], DNES).dnesniKrok?.id).toBe(t.id)
  })

  it('ze dvou dnešních úkolů vybere ten s vyšší priortou (Vysoká před Střední)', () => {
    const tasks = [
      task({ id: 'stredni', dueDate: DNES, priority: 'Střední' }),
      task({ id: 'vysoka', dueDate: DNES, priority: 'Vysoká' }),
    ]
    expect(sestavChytrySouhrn(tasks, DNES).dnesniKrok?.id).toBe('vysoka')
  })

  it('splněný dnešní úkol se jako dnešní krok nenabízí', () => {
    const tasks = [task({ dueDate: DNES, completed: true })]
    expect(sestavChytrySouhrn(tasks, DNES).dnesniKrok).toBeNull()
  })
})

describe('vetaONejblizsimTerminu', () => {
  it('bez nejbližšího termínu vrátí povzbuzující větu o prázdném plánu', () => {
    expect(vetaONejblizsimTerminu({ nejblizsiTermin: null, dnesniKrok: null })).toBe(
      'Zatím nemáš žádný nesplněný úkol s termínem.'
    )
  })

  it('s nejbližším termínem sestaví "kdy — co"', () => {
    // formatDueDate (uvnitř vetaONejblizsimTerminu) počítá "Dnes"
    // oproti SKUTEČNÉMU dnešku (todayIso()), ne oproti dnesniStr
    // parametru sestavChytrySouhrn — ten ovlivňuje jen dnesniKrok.
    // Termín úkolu proto musí být reálný dnešek, ne vymyšlené datum.
    const dnes = todayIso()
    const t = task({ subject: 'Fyzika', topic: 'Písemka', dueDate: dnes })
    const souhrn = sestavChytrySouhrn([t], dnes)
    expect(vetaONejblizsimTerminu(souhrn)).toBe('Dnes: Fyzika — Písemka.')
  })
})

describe('vetaODnesnimKroku', () => {
  it('bez dnešního kroku navrhne přidat si úkol', () => {
    expect(vetaODnesnimKroku({ nejblizsiTermin: null, dnesniKrok: null })).toBe(
      'Dnes nemáš nic naplánované — dobrá chvíle přidat si úkol v Planeru.'
    )
  })

  it('s odhadem času zmíní počet minut', () => {
    const t = task({ topic: 'Procvičování rovnic', dueDate: DNES, estimateMinutes: 25 })
    expect(vetaODnesnimKroku(sestavChytrySouhrn([t], DNES))).toBe('Dnes máš připravené Procvičování rovnic na 25 minut.')
  })

  it('bez odhadu času jen jmenuje úkol', () => {
    const t = task({ topic: 'Procvičování rovnic', dueDate: DNES, estimateMinutes: null })
    expect(vetaODnesnimKroku(sestavChytrySouhrn([t], DNES))).toBe('Dnes máš na programu Procvičování rovnic.')
  })
})
