import { describe, it, expect } from 'vitest'
import {
  NEJVICE_NAPOSLEDY_POUZITYCH_PREDMETU,
  PomodoroSession,
  jeSwitchModeNoOp,
  ziskejNaposledyPouziteNazvyPredmetu,
} from '@/miniapps/pomodoro/types'

// ==========================================
// Fáze 7 (Pomodoro): testy jdou výhradně přes types.ts, ne přes
// usePomodoro.ts samotný — ten importuje core/utils/notify.ts, co přes
// core/utils/registerSW.ts sahá na Vite-only virtual:pwa-register
// modul, nerozpoznatelný pro Vitestovu vlastní instanci Vite. Stejná
// past, jakou CLAUDE.md dokumentuje pro Writer's Room/Goal Tracker/
// Finance — proto je jeSwitchModeNoOp (celá logika Fáze 7's bug-fixu)
// vytažená do types.ts, kde nic takového nehrozí.
// ==========================================

describe('jeSwitchModeNoOp — klik na už aktivní záložku je no-op', () => {
  it('je true, cílí-li se na stejný režim bez autoStart (ruční klik na záložku)', () => {
    expect(jeSwitchModeNoOp('work', 'work', false)).toBe(true)
    expect(jeSwitchModeNoOp('shortBreak', 'shortBreak', false)).toBe(true)
    expect(jeSwitchModeNoOp('longBreak', 'longBreak', false)).toBe(true)
  })

  it('je false, cílí-li se na stejný režim S autoStart (complete()’s vlastní cesta)', () => {
    // complete() si vždycky žádá JINÝ режим, než ve kterém appka právě
    // je, takže tahle kombinace v appce reálně nenastane — guard ji ale
    // schválně nezastaví, aby autoStart cesta zůstala nedotčená.
    expect(jeSwitchModeNoOp('work', 'work', true)).toBe(false)
  })

  it('je false pro jinou cílovou než aktuální režim, ať autoStart nebo ne', () => {
    expect(jeSwitchModeNoOp('shortBreak', 'work', false)).toBe(false)
    expect(jeSwitchModeNoOp('shortBreak', 'work', true)).toBe(false)
    expect(jeSwitchModeNoOp('longBreak', 'shortBreak', false)).toBe(false)
  })
})

describe('ziskejNaposledyPouziteNazvyPredmetu', () => {
  const zaznam = (predmet: string | null, at: number): PomodoroSession => ({ at, minuty: 25, predmet })

  it('vrátí unikátní předměty od nejnověji použitého', () => {
    const log = [
      zaznam('Matematika', 1),
      zaznam('Čeština', 2),
      zaznam('Matematika', 3), // druhý výskyt, nemá se duplikovat
      zaznam('Fyzika', 4),
    ]
    expect(ziskejNaposledyPouziteNazvyPredmetu(log)).toEqual(['Fyzika', 'Matematika', 'Čeština'])
  })

  it('vynechá záznamy bez předmětu', () => {
    const log = [zaznam(null, 1), zaznam('Dějepis', 2), zaznam(null, 3)]
    expect(ziskejNaposledyPouziteNazvyPredmetu(log)).toEqual(['Dějepis'])
  })

  it('oříznuto na NEJVICE_NAPOSLEDY_POUZITYCH_PREDMETU, od nejnověji použitého', () => {
    const log = Array.from({ length: NEJVICE_NAPOSLEDY_POUZITYCH_PREDMETU + 5 }, (_, i) =>
      zaznam(`Předmět ${i}`, i)
    )
    const vysledek = ziskejNaposledyPouziteNazvyPredmetu(log)
    expect(vysledek).toHaveLength(NEJVICE_NAPOSLEDY_POUZITYCH_PREDMETU)
    expect(vysledek[0]).toBe(`Předmět ${NEJVICE_NAPOSLEDY_POUZITYCH_PREDMETU + 4}`)
  })

  it('prázdná historie vrátí prázdné pole', () => {
    expect(ziskejNaposledyPouziteNazvyPredmetu([])).toEqual([])
  })
})
