import { describe, it, expect } from 'vitest'
import { nejblizsiCile, pocetOdemcenych } from '@/flagships/growth-room/growthStats'
import type { Goal } from '@/miniapps/goal-tracker/types'
import type { Badge } from '@/core/types/gamification.types'

const cil = (id: string, current: number, target: number): Goal => ({
  id,
  title: `Cíl ${id}`,
  current,
  target,
  unit: 'kroků',
  category: 'Osobní',
  completedAt: null,
})

describe('nejblizsiCile', () => {
  it('vynechá dokončené cíle a seřadí zbytek od nejblíž splnění', () => {
    const vysledek = nejblizsiCile(
      [
        cil('a', 5, 10), // 50 %
        cil('b', 10, 10), // dokončený — nepočítá se
        cil('c', 9, 10), // 90 %
        cil('d', 1, 10), // 10 %
      ],
      10
    )

    expect(vysledek.map((v) => v.goal.id)).toEqual(['c', 'a', 'd'])
    expect(vysledek[0].percent).toBe(90)
  })

  it('ořízne na zadaný počet', () => {
    const vysledek = nejblizsiCile([cil('a', 1, 10), cil('b', 2, 10), cil('c', 3, 10)], 2)
    expect(vysledek).toHaveLength(2)
  })

  it('bez cílů vrátí prázdné pole', () => {
    expect(nejblizsiCile([], 5)).toEqual([])
  })
})

describe('pocetOdemcenych', () => {
  const odznak = (id: string, unlockedAt: string | null): Badge => ({
    id,
    title: id,
    description: '',
    icon: '🏅',
    unlockedAt,
  })

  it('spočítá jen odznaky se skutečným unlockedAt', () => {
    const pocet = pocetOdemcenych([
      odznak('a', '2026-01-01'),
      odznak('b', null),
      odznak('c', '2026-02-01'),
    ])
    expect(pocet).toBe(2)
  })

  it('bez odznaků vrátí 0', () => {
    expect(pocetOdemcenych([])).toBe(0)
  })
})
