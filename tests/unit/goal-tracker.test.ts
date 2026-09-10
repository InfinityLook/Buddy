import { describe, it, expect } from 'vitest'
import {
  compareGoals,
  dnesniDatum,
  formatujTermin,
  jeNavykOznacenDnes,
  sanitizujCil,
  spocitejSeriiNavyku,
  spocitejTydenniPokrokNavyku,
  Goal,
} from '@/miniapps/goal-tracker/types'
import { nejblizsiCile, pocetOdemcenych, spocitejPodleKategorie } from '@/flagships/growth-room/growthStats'
import type { Badge } from '@/core/types/gamification.types'

// ==========================================
// miniapps/goal-tracker/types.ts + useGoalTracker.ts + growthStats.ts —
// čisté funkce nad cíli/návyky, stejné "testovatelné bez komponenty"
// zdůvodnění jako u ostatních miniapek (finance.test.ts, fighting-*.test.ts).
// ==========================================

const cil = (over: Partial<Goal>): Goal => ({
  id: 'g1',
  title: 'Test cíl',
  current: 0,
  target: 10,
  unit: 'kroků',
  category: 'Studium',
  completedAt: null,
  typ: 'cil',
  priority: 'stredni',
  deadline: null,
  poznamka: '',
  milniky: [],
  navykDny: [],
  ...over,
})

describe('formatujTermin', () => {
  const dnes = new Date('2026-08-15T12:00:00')

  it('dnešní termín se popíše jako "Dnes"', () => {
    expect(formatujTermin('2026-08-15', dnes)).toEqual({ label: 'Dnes', tone: 'today' })
  })

  it('termín včera je "Včera" a po termínu', () => {
    expect(formatujTermin('2026-08-14', dnes)).toEqual({ label: 'Včera', tone: 'overdue' })
  })

  it('termín před déle než dnem je "Po termínu" s datem', () => {
    const info = formatujTermin('2026-08-01', dnes)
    expect(info.tone).toBe('overdue')
    expect(info.label).toContain('Po termínu')
  })

  it('zítřejší termín je "Zítra" a "soon"', () => {
    expect(formatujTermin('2026-08-16', dnes)).toEqual({ label: 'Zítra', tone: 'soon' })
  })

  it('termín za 2-3 dny je "soon" s počtem dní', () => {
    const info = formatujTermin('2026-08-17', dnes)
    expect(info.tone).toBe('soon')
    expect(info.label).toContain('Za 2 dny')
  })

  it('termín dál v budoucnu je "later"', () => {
    expect(formatujTermin('2026-09-01', dnes).tone).toBe('later')
  })

  it('neplatný/starý textový termín se vrátí beze změny místo pádu', () => {
    expect(formatujTermin('brzy', dnes)).toEqual({ label: 'brzy', tone: 'later' })
  })
})

describe('jeNavykOznacenDnes / spocitejTydenniPokrokNavyku', () => {
  const dnes = new Date('2026-08-15T12:00:00')

  it('nese true jen když je dnešní datum v navykDny', () => {
    expect(jeNavykOznacenDnes(cil({ navykDny: ['2026-08-15'] }), dnes)).toBe(true)
    expect(jeNavykOznacenDnes(cil({ navykDny: ['2026-08-14'] }), dnes)).toBe(false)
  })

  it('spočítá jen dny v posledních 7 dnech včetně dneška', () => {
    const goal = cil({
      navykDny: ['2026-08-15', '2026-08-14', '2026-08-09', '2026-08-01'],
    })
    // 08-15..08-09 je přesně 7 dní okno; 08-01 je mimo
    expect(spocitejTydenniPokrokNavyku(goal, dnes)).toBe(3)
  })

  it('prázdná historie vrátí 0, ne pád', () => {
    expect(spocitejTydenniPokrokNavyku(cil({ navykDny: [] }), dnes)).toBe(0)
  })
})

describe('spocitejSeriiNavyku', () => {
  const dnes = new Date('2026-08-15T12:00:00')

  it('nepřerušená série dní končící dneškem se spočítá celá', () => {
    const goal = cil({ navykDny: ['2026-08-15', '2026-08-14', '2026-08-13'] })
    expect(spocitejSeriiNavyku(goal, dnes)).toBe(3)
  })

  it('dnešek ještě neoznačený se počítá od včerejška, ne od nuly', () => {
    const goal = cil({ navykDny: ['2026-08-14', '2026-08-13'] })
    expect(spocitejSeriiNavyku(goal, dnes)).toBe(2)
  })

  it('mezera v historii sérii přeruší', () => {
    const goal = cil({ navykDny: ['2026-08-15', '2026-08-13'] }) // chybí 08-14
    expect(spocitejSeriiNavyku(goal, dnes)).toBe(1)
  })

  it('žádná historie vrátí sérii 0', () => {
    expect(spocitejSeriiNavyku(cil({ navykDny: [] }), dnes)).toBe(0)
  })
})

describe('dnesniDatum', () => {
  it('formátuje na YYYY-MM-DD v místním čase, ne UTC', () => {
    expect(dnesniDatum(new Date('2026-01-05T23:30:00'))).toBe('2026-01-05')
  })
})

describe('compareGoals', () => {
  it('nesplněné cíle jsou vždy před splněnými', () => {
    const hotovy = cil({ id: 'a', current: 10, target: 10 })
    const aktivni = cil({ id: 'b', current: 0, target: 10 })
    expect(compareGoals(hotovy, aktivni)).toBeGreaterThan(0)
  })

  it('mezi aktivními cíli řadí dřívější termín napřed', () => {
    const drivejsi = cil({ id: 'a', deadline: '2026-08-01' })
    const pozdejsi = cil({ id: 'b', deadline: '2026-09-01' })
    expect(compareGoals(drivejsi, pozdejsi)).toBeLessThan(0)
  })

  it('cíl bez termínu jde až za cíl s termínem', () => {
    const sTerminem = cil({ id: 'a', deadline: '2026-12-31' })
    const bezTerminu = cil({ id: 'b', deadline: null })
    expect(compareGoals(sTerminem, bezTerminu)).toBeLessThan(0)
  })

  it('při shodném termínu rozhoduje priorita (Vysoká napřed)', () => {
    const vysoka = cil({ id: 'a', deadline: null, priority: 'vysoka' })
    const nizka = cil({ id: 'b', deadline: null, priority: 'nizka' })
    expect(compareGoals(vysoka, nizka)).toBeLessThan(0)
  })

  it('návykový cíl se nikdy nepovažuje za "hotový"', () => {
    const navyk = cil({ id: 'a', typ: 'navyk', current: 999, target: 5 })
    const aktivniCil = cil({ id: 'b', typ: 'cil', current: 0, target: 10 })
    // Návyk se nikdy neřadí za "hotové" bez ohledu na current/target
    expect(compareGoals(navyk, aktivniCil)).not.toBeGreaterThan(0)
  })
})

describe('sanitizujCil', () => {
  it('doplní chybějící pole na bezpečné výchozí hodnoty', () => {
    const poskozeny = { id: 'x', title: 'T', current: 0, target: 5, unit: '', category: 'Studium' } as Goal
    const vysledek = sanitizujCil(poskozeny)
    expect(vysledek.priority).toBe('stredni')
    expect(vysledek.poznamka).toBe('')
    expect(vysledek.milniky).toEqual([])
    expect(vysledek.typ).toBe('cil')
    expect(vysledek.navykDny).toEqual([])
    expect(vysledek.deadline).toBeNull()
  })

  it('neplatnou prioritu spadne na "stredni"', () => {
    const goal = cil({ priority: 'nesmysl' as unknown as Goal['priority'] })
    expect(sanitizujCil(goal).priority).toBe('stredni')
  })

  it('poškozený milník (bez id/text) se vyřadí, platný zůstane', () => {
    const goal = cil({
      milniky: [
        { id: 'm1', text: 'Platný', done: false },
        { text: 'Bez id' } as never,
        null as never,
      ],
    })
    const vysledek = sanitizujCil(goal)
    expect(vysledek.milniky).toHaveLength(1)
    expect(vysledek.milniky![0].id).toBe('m1')
  })

  it('neplatné datum v navykDny se odfiltruje', () => {
    const goal = cil({ navykDny: ['2026-08-15', 'včera', '2026-13-40'] as string[] })
    // '2026-13-40' projde regexem (jen tvar YYYY-MM-DD), reálná platnost
    // data se tu neřeší — stejná mez jako Study Plannerovo dueDate.
    expect(sanitizujCil(goal).navykDny).toEqual(['2026-08-15', '2026-13-40'])
  })

  it('neplatný termín (ne YYYY-MM-DD) se nahradí null místo pádu', () => {
    expect(sanitizujCil(cil({ deadline: 'brzy' })).deadline).toBeNull()
  })

  it('reálný bug: starý splněný cíl s completedAt "" dostane skutečný (truthy) timestamp, ne prázdný řetězec', () => {
    // Tohle je přesně tvar, co dřív appka do secureStorage ukládala pro
    // cíl splněný ještě předtím, než pole completedAt vzniklo — '' je
    // falsy stejně jako null, takže changeProgress's `!goal.completedAt`
    // by takový cíl bral pořád za nesplněný a XP šlo vytěžit podruhé.
    const staryHotovyCil = cil({ current: 10, target: 10, completedAt: '' as unknown as string })
    const vysledek = sanitizujCil(staryHotovyCil)
    expect(vysledek.completedAt).toBeTruthy()
    expect(vysledek.completedAt).not.toBe('')
  })

  it('nesplněný cíl s completedAt "" (neočekávaný, ale možný stav) se opraví na null', () => {
    const goal = cil({ current: 2, target: 10, completedAt: '' as unknown as string })
    expect(sanitizujCil(goal).completedAt).toBeNull()
  })

  it('skutečně nesplněný nový cíl si drží completedAt null beze změny', () => {
    expect(sanitizujCil(cil({ current: 0, target: 10, completedAt: null })).completedAt).toBeNull()
  })

  it('už správně vyplněný completedAt zůstane beze změny, nepřepíše se novým datem', () => {
    const puvodni = '2020-01-01T00:00:00.000Z'
    expect(sanitizujCil(cil({ current: 10, target: 10, completedAt: puvodni })).completedAt).toBe(puvodni)
  })
})

describe('nejblizsiCile', () => {
  it('vyřadí návykové a už splněné cíle', () => {
    const aktivni = cil({ id: 'a', current: 5, target: 10 })
    const hotovy = cil({ id: 'b', current: 10, target: 10 })
    const navyk = cil({ id: 'c', typ: 'navyk', current: 0, target: 5 })
    const vysledek = nejblizsiCile([aktivni, hotovy, navyk], 5)
    expect(vysledek.map((v) => v.goal.id)).toEqual(['a'])
  })

  it('seřadí od nejblíž splnění a ořízne na max', () => {
    const goals = [
      cil({ id: 'a', current: 1, target: 10 }), // 10 %
      cil({ id: 'b', current: 9, target: 10 }), // 90 %
      cil({ id: 'c', current: 5, target: 10 }), // 50 %
    ]
    const vysledek = nejblizsiCile(goals, 2)
    expect(vysledek.map((v) => v.goal.id)).toEqual(['b', 'c'])
  })
})

describe('pocetOdemcenych', () => {
  it('spočítá jen odznaky se skutečným unlockedAt', () => {
    const badges: Badge[] = [
      { id: 'a', title: '', description: '', icon: '', unlockedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'b', title: '', description: '', icon: '', unlockedAt: null },
    ]
    expect(pocetOdemcenych(badges)).toBe(1)
  })
})

describe('spocitejPodleKategorie', () => {
  it('nezahrne prázdnou kategorii vůbec', () => {
    const goals = [cil({ id: 'a', category: 'Studium' })]
    const vysledek = spocitejPodleKategorie(goals)
    expect(vysledek.find((k) => k.category === 'Osobní')).toBeUndefined()
  })

  it('splněný číselný cíl se do počtu nezapočítá, návyk ano', () => {
    const goals = [
      cil({ id: 'a', category: 'Studium', current: 10, target: 10 }), // hotovo, nepočítá se
      cil({ id: 'b', category: 'Studium', current: 2, target: 10 }), // aktivní
      cil({ id: 'c', category: 'Návyky', typ: 'navyk', current: 0, target: 5 }), // návyk se počítá vždy
    ]
    const vysledek = spocitejPodleKategorie(goals)
    expect(vysledek.find((k) => k.category === 'Studium')?.count).toBe(1)
    expect(vysledek.find((k) => k.category === 'Návyky')?.count).toBe(1)
  })
})
