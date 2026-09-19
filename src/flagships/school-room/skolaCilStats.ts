import { PomodoroSession } from '@/miniapps/pomodoro/types'
import { MAX_ZNAMKA } from '@/miniapps/znamky/types'

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

/** Progres cíle průměru — na klasifikační škále je NIŽŠÍ známka lepší,
 *  takže prostý poměr aktuální/cíl by ukazoval opačný směr než
 *  skutečný pokrok. Appka místo toho měří, kolik z cesty od nejhorší
 *  možné známky (5) k cíli je už ušlé — cíl už dosažený nebo
 *  překonaný (aktuální <= cíl) vždycky ukáže 100 %, žádný cíl nebo
 *  žádná zapsaná známka vrátí null (žádný progres bar, ne 0 %, co by
 *  vypadalo jako "vůbec žádný pokrok"). */
export const spocitejProcentaCileProumeru = (
  aktualniPrumer: number | null,
  cil: number | null
): number | null => {
  if (cil === null || cil <= 0 || aktualniPrumer === null) return null
  if (aktualniPrumer <= cil) return 100
  const rozpeti = MAX_ZNAMKA - cil
  if (rozpeti <= 0) return 100
  return Math.max(0, Math.min(100, Math.round(((MAX_ZNAMKA - aktualniPrumer) / rozpeti) * 100)))
}
