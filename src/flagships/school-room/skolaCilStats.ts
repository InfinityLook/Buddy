import { PomodoroSession } from '@/miniapps/pomodoro/types'

// ==========================================
// Pure funkce nad Pomodorovou historií soustředění (sessionLog) —
// stejný "toDateString() porovnání pro dnešek" idiom jako Writer
// Roomovy/Fitness Roomovy/Economy Roomovy vlastní *Stats.ts moduly,
// žádný store, testovatelné bez komponenty.
// ==========================================

export const spocitejMinutyDnes = (log: PomodoroSession[], ted: Date = new Date()): number =>
  log
    .filter((s) => new Date(s.at).toDateString() === ted.toDateString())
    .reduce((soucet, s) => soucet + s.minuty, 0)

// Posledních 7 dní včetně dneška, ne kalendářní týden od pondělí —
// stejná volba jako Writer Roomovo spocitejTvorbuPodleDne.
export const spocitejMinutyTyden = (log: PomodoroSession[], ted: Date = new Date()): number => {
  const hranice = new Date(ted)
  hranice.setDate(hranice.getDate() - 6)
  hranice.setHours(0, 0, 0, 0)
  return log.filter((s) => s.at >= hranice.getTime()).reduce((soucet, s) => soucet + s.minuty, 0)
}
