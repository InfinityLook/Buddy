import { describe, it, expect, beforeEach } from 'vitest'
import { validateExamPrepData } from '@/core/utils/examPrepValidation'
import { isDue, useExamPrepStore } from '@/miniapps/exam-prep/useExamPrepStore'
import { useGamificationStore } from '@/core/store/useGamificationStore'

// ==========================================
// Fáze 6 (Maturitní centrum): useExamPrepStore je exportovaný přímo,
// stejný vzor jako useRozvrhStore/useFlashcardsStore — testuje se rovnou
// přes .getState()/.setState(), bez komponenty.
// ==========================================

describe('isDue', () => {
  it('chybějící termín (null) znamená "na řadě"', () => {
    expect(isDue({ nextRevisionAt: null } as any)).toBe(true)
  })

  it('termín v minulosti je na řadě', () => {
    expect(isDue({ nextRevisionAt: '2020-01-01T00:00:00.000Z' } as any)).toBe(true)
  })

  it('termín v budoucnu ještě na řadě není', () => {
    const budouci = new Date()
    budouci.setDate(budouci.getDate() + 5)
    expect(isDue({ nextRevisionAt: budouci.toISOString() } as any)).toBe(false)
  })
})

describe('validateExamPrepData', () => {
  it('platná data projdou se všemi poli', () => {
    const vysledek = validateExamPrepData({
      subjects: [{ id: 's1', name: 'Matematika', color: '#38bdf8', examDate: '2025-06-01', targetGrade: 2 }],
      topics: [{ id: 't1', subjectId: 's1', topicNumber: 1, title: 'Limity', notes: 'poznámka' }],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.subjects).toHaveLength(1)
      expect(vysledek.data.topics).toHaveLength(1)
    }
  })

  it('poškozená položka (bez názvu) se tiše vyřadí, ne celý seznam', () => {
    const vysledek = validateExamPrepData({
      subjects: [
        { id: 's1', name: 'Matematika' },
        { id: 's2', name: '   ' },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.subjects).toHaveLength(1)
      expect(vysledek.data.subjects[0].id).toBe('s1')
    }
  })

  it('okruh pod neexistujícím předmětem se vyřadí, ať se nepočítá do připravenosti bez předmětu', () => {
    const vysledek = validateExamPrepData({
      subjects: [{ id: 's1', name: 'Matematika' }],
      topics: [
        { id: 't1', subjectId: 's1', title: 'Platný okruh' },
        { id: 't2', subjectId: 'neexistuje', title: 'Osamělý okruh' },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.topics).toHaveLength(1)
      expect(vysledek.data.topics[0].id).toBe('t1')
    }
  })

  it('targetGrade mimo rozsah 1-5 se ořízne, ne že by zahodilo celý předmět', () => {
    const vysledek = validateExamPrepData({
      subjects: [{ id: 's1', name: 'Matematika', targetGrade: 99 }],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.subjects[0].targetGrade).toBe(5)
  })

  it('confidenceLevel mimo rozsah 1-5 se ořízne stejně', () => {
    const vysledek = validateExamPrepData({
      subjects: [{ id: 's1', name: 'Matematika' }],
      topics: [{ id: 't1', subjectId: 's1', title: 'Okruh', confidenceLevel: -3 }],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.topics[0].confidenceLevel).toBe(1)
  })

  it('starší uložený okruh bez simulatedAt dostane bezpečnou výchozí hodnotu null', () => {
    const vysledek = validateExamPrepData({
      subjects: [{ id: 's1', name: 'Matematika' }],
      topics: [{ id: 't1', subjectId: 's1', title: 'Okruh' }],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.topics[0].simulatedAt).toBe(null)
  })

  it('neplatný tvar nejvyšší úrovně (subjects jako řetězec) appku nerozbije', () => {
    const vysledek = validateExamPrepData({ subjects: 'tohle není pole' })
    expect(vysledek.success).toBe(false)
  })

  it('zcela chybějící data vrátí prázdné, platné seznamy', () => {
    const vysledek = validateExamPrepData({})
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.subjects).toEqual([])
      expect(vysledek.data.topics).toEqual([])
    }
  })
})

describe('useExamPrepStore.rateTopic — XP jen za otázku, co je doopravdy na řadě', () => {
  const vychoziGamifikace = useGamificationStore.getState()

  beforeEach(() => {
    useExamPrepStore.setState({ subjects: [], topics: [] })
    useGamificationStore.setState({
      xp: 0,
      level: 1,
      streakDays: 0,
      lastActiveDate: null,
      badges: vychoziGamifikace.badges.map((b) => ({ ...b, unlockedAt: null })),
      counters: {},
    })
  })

  const pridejOkruh = () => {
    useExamPrepStore.getState().addSubject({ name: 'Matematika', color: '#38bdf8', examDate: '', targetGrade: 1 })
    const subjectId = useExamPrepStore.getState().subjects[0].id
    useExamPrepStore.getState().addTopic({ subjectId, topicNumber: 1, title: 'Limity', notes: '' })
    return useExamPrepStore.getState().topics[0].id
  }

  it('i confidence 1 posune nextRevisionAt aspoň o 1 den — nová otázka tak ze "na řadě" po ohodnocení zmizí', () => {
    const topicId = pridejOkruh()
    const pred = new Date()

    useExamPrepStore.getState().rateTopic(topicId, 1)

    const po = useExamPrepStore.getState().topics[0]
    expect(new Date(po.nextRevisionAt!).getTime()).toBeGreaterThan(pred.getTime())
    expect(isDue(po)).toBe(false)
  })

  it('otázka na řadě dá XP podle confidence × 10', () => {
    const topicId = pridejOkruh()
    useExamPrepStore.getState().rateTopic(topicId, 5)
    expect(useGamificationStore.getState().xp).toBe(50)
  })

  it('tatáž otázka ohodnocená podruhé (už není na řadě) XP znovu nepřičte', () => {
    const topicId = pridejOkruh()
    useExamPrepStore.getState().rateTopic(topicId, 5)
    const xpPoPrvnim = useGamificationStore.getState().xp

    useExamPrepStore.getState().rateTopic(topicId, 5)
    expect(useGamificationStore.getState().xp).toBe(xpPoPrvnim)
  })

  it('neexistující okruh je no-op, appka nespadne', () => {
    expect(() => useExamPrepStore.getState().rateTopic('neexistuje', 3)).not.toThrow()
    expect(useGamificationStore.getState().xp).toBe(0)
  })
})
