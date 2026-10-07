import { mistniDatum } from './date'
import { Badge, XpLogEntry } from '../types/gamification.types'

// Každý level vyžaduje o něco více XP (progresivní křivka)
export const getLevelFromXp = (xp: number): number => {
  return Math.floor(Math.sqrt(xp / 50)) + 1
}

// Spočítá XP potřebné pro další level
export const getXpForNextLevel = (currentLevel: number): number => {
  return Math.pow(currentLevel, 2) * 50
}

// Spočítá % pokroku k dalšímu levelu (pro Progress Bar)
export const getLevelProgress = (xp: number): number => {
  const currentLevel = getLevelFromXp(xp)
  const currentLevelXp = Math.pow(currentLevel - 1, 2) * 50
  const nextLevelXp = getXpForNextLevel(currentLevel)
  
  const xpInCurrentLevel = xp - currentLevelXp
  const xpNeededForNext = nextLevelXp - currentLevelXp
  
  return Math.min(Math.round((xpInCurrentLevel / xpNeededForNext) * 100), 100)
}

// Zkontroluje a aktualizuje denní streak
export const checkStreak = (lastActiveDate: string | null, currentStreak: number): { newStreak: number; todayFormatted: string } => {
  // Místní datum, ne UTC (viz komentář u mistniDatum) — jinak appka
  // umí připsat "nový den" o hodinu až dvě dřív, nebo ho naopak
  // nepoznat hned po půlnoci.
  const today = mistniDatum()

  if (!lastActiveDate) {
    return { newStreak: 1, todayFormatted: today }
  }

  if (lastActiveDate === today) {
    return { newStreak: currentStreak, todayFormatted: today }
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayFormatted = mistniDatum(yesterday)

  if (lastActiveDate === yesterdayFormatted) {
    return { newStreak: currentStreak + 1, todayFormatted: today }
  }

  // Uživatel vynechal den -> reset na 1
  return { newStreak: 1, todayFormatted: today }
}

// Krok 14e (Hubovo "Upozornění na blížící se konec série") — čistá
// logika "má appka dnes ještě upozornit, že séria je v ohrožení",
// oddělená od core/utils/notify.ts (ten appka importuje jen v
// core/streakWarningReminder.ts, ne tady — stejný "notify.ts kontaminuje
// testovatelnost čehokoli, co ho importuje" důvod, co má appka zapsaný
// i u fitnessReminders.ts).
//
// Appka neupozorňuje: (a) bez skutečné série (nic by se neztratilo),
// (b) dřív než HODINA_UPOZORNENI_NA_SERII (den ještě reálně neskončil,
// appka nechce otravovat zbytečně brzo), (c) pokud uživatel dnes už
// nějakou aktivitu zaznamenal (lastActiveDate === dnešek).
export const HODINA_UPOZORNENI_NA_SERII = 20

export const melaByUpozornitNaKonecSerie = (
  streakDays: number,
  lastActiveDate: string | null,
  ted: Date = new Date()
): boolean => {
  if (streakDays <= 0) return false
  if (ted.getHours() < HODINA_UPOZORNENI_NA_SERII) return false
  return lastActiveDate !== mistniDatum(ted)
}

// Krok 14f (Hubův "Náhled na příští odznak") — appka schválně nabízí
// jen tyhle čtyři odznaky, ne všechny v DEFAULT_BADGES: jsou to jediné,
// co appka umí spočítat přímo z dat, co Hub už má po ruce (xp/level/
// streak), bez čtení desítek počítadel jednotlivých miniaplikací jen
// pro jeden drobný náhled dole na Hubu.
//
// Appka mezi ještě-neodemčenými vybere ten s NEJVYŠŠÍM pokrokem (0..1)
// — "tomuhle jsi nejblíž" je užitečnější náhled než první v pořadí.
// Když jsou odemčené všechny čtyři, appka vrátí null (žádný "příští"
// z téhle čtveřice appka nabídnout nemá, Hub v tom případě celý řádek
// schová, ne poloprázdný).
export const nejblizsiOdznak = (
  xp: number,
  level: number,
  streakDays: number,
  badges: Badge[]
): { badge: Badge; pokrok: number } | null => {
  const kandidati: { id: string; pokrok: number }[] = [
    { id: 'streak_3', pokrok: Math.min(streakDays / 3, 1) },
    { id: 'streak_7', pokrok: Math.min(streakDays / 7, 1) },
    { id: 'level_5', pokrok: Math.min(level / 5, 1) },
    { id: 'xp_1000', pokrok: Math.min(xp / 1000, 1) },
  ]

  let nejlepsi: { badge: Badge; pokrok: number } | null = null
  for (const kandidat of kandidati) {
    const badge = badges.find((b) => b.id === kandidat.id)
    if (!badge || badge.unlockedAt) continue
    if (!nejlepsi || kandidat.pokrok > nejlepsi.pokrok) {
      nejlepsi = { badge, pokrok: kandidat.pokrok }
    }
  }
  return nejlepsi
}

// Krok 14f — malý formátovač k nejblizsiOdznak výš: appka jednotku
// (dní/úroveň/XP) odvozuje přímo z id odznaku, ne z appkou odhadnuté
// obecné "X/Y" bez jednotky, co by uživateli neřeklo, čeho se číslo
// vlastně týká.
export const popisekPokrokuOdznaku = (
  badgeId: string,
  xp: number,
  level: number,
  streakDays: number
): string => {
  switch (badgeId) {
    case 'streak_3':
      return `${Math.min(streakDays, 3)}/3 dní`
    case 'streak_7':
      return `${Math.min(streakDays, 7)}/7 dní`
    case 'level_5':
      return `úroveň ${Math.min(level, 5)}/5`
    case 'xp_1000':
      return `${Math.min(xp, 1000)}/1000 XP`
    default:
      return ''
  }
}

// Krok 14g (Hubův "Týdenní souhrn") — appka sčítá xpLog jen za
// posledních `dny` dní VČETNĚ dneška (dny=7 → dnešek + 6 dní zpátky).
// Appka datum počítá přes y/m/d rozpad + new Date(rok, mesic-1, den-N),
// NE new Date(dnesRetezec) — ten by appka parsovala jako UTC půlnoc,
// přesně ta "zone-less řetězec se posune o pár hodin" past, co appka
// má zapsanou i v core/utils/date.ts's vlastním komentáři.
export const spocitejXpZaPoslednichNDni = (
  xpLog: XpLogEntry[],
  dny: number = 7,
  dnes: string = mistniDatum()
): number => {
  const [rok, mesic, den] = dnes.split('-').map(Number)
  const hranice = new Date(rok, mesic - 1, den - (dny - 1))
  const hraniceStr = mistniDatum(hranice)
  return xpLog.filter((zaznam) => zaznam.datum >= hraniceStr).reduce((sum, z) => sum + z.castka, 0)
}
