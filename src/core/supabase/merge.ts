import { getLevelFromXp } from '@/core/utils/gamificationUtils'
import { CloudSnapshot } from './types'

// ==========================================
// Slučování místního a cloudového stavu.
//
// Pravidlo je "vyšší vyhrává". Vychází z rozhodnutí, které v aplikaci
// platí už u záloh (viz BACKUP_STORES): XP, úroveň a odznaky jsou vydřený
// postup, ne nastavení — obnova ho nikdy nevrací zpátky. Stejně tak
// synchronizace nesmí uživateli sebrat, co si nasbíral, jen proto, že se
// druhá strana ozvala později.
//
// Díky tomu nepotřebujeme porovnávat časy ani řešit, které zařízení mělo
// správně nastavené hodiny. Slučování je navíc idempotentní: opakované
// spuštění nad stejnými daty dá pořád stejný výsledek.
// ==========================================

const higher = (a: number, b: number): number => (a > b ? a : b)

export const mergeSnapshots = (local: CloudSnapshot, remote: CloudSnapshot | null): CloudSnapshot => {
  if (!remote) return { ...local, level: getLevelFromXp(local.xp) }

  const xp = higher(local.xp, remote.xp)

  // Odznaky: sjednocení. U odznaku odemčeného na obou stranách bereme
  // dřívější datum — odemkl ho tehdy, ne až když se to doneslo do cloudu.
  const badges: Record<string, string> = { ...remote.badges }
  for (const [id, unlockedAt] of Object.entries(local.badges)) {
    const existing = badges[id]
    badges[id] = existing && existing < unlockedAt ? existing : unlockedAt
  }

  const counters: Record<string, number> = { ...remote.counters }
  for (const [kind, count] of Object.entries(local.counters)) {
    counters[kind] = higher(count, counters[kind] ?? 0)
  }

  // Datum posledního použití je ve tvaru YYYY-MM-DD, takže stačí porovnat
  // řetězce — pozdější datum je i lexikograficky větší.
  const lastActiveDate =
    !local.lastActiveDate || (remote.lastActiveDate ?? '') > local.lastActiveDate
      ? remote.lastActiveDate
      : local.lastActiveDate

  return {
    // Jméno a motto patří k zařízení, kde je uživatel naposledy změnil.
    // Prázdné pole z jedné strany nesmí přepsat vyplněné z druhé.
    displayName: local.displayName.trim() || remote.displayName,
    motto: local.motto.trim() || remote.motto,
    bio: local.bio.trim() || remote.bio,
    frameId: local.frameId ?? remote.frameId,
    // Prázdný seznam z jedné strany taky nesmí přepsat vyplněný
    // z druhé — stejné pravidlo jako u textových polí výš.
    pinnedBadges: local.pinnedBadges.length > 0 ? local.pinnedBadges : remote.pinnedBadges,
    xp,
    // Úroveň se dopočítá z XP, ať nemůže zůstat viset na staré hodnotě
    level: getLevelFromXp(xp),
    streakDays: higher(local.streakDays, remote.streakDays),
    lastActiveDate: lastActiveDate ?? null,
    badges,
    counters,
  }
}

// Porovná dva snímky. Když se neliší, není co posílat na server.
export const snapshotsEqual = (a: CloudSnapshot, b: CloudSnapshot): boolean =>
  a.displayName === b.displayName &&
  a.motto === b.motto &&
  a.bio === b.bio &&
  a.frameId === b.frameId &&
  JSON.stringify(a.pinnedBadges) === JSON.stringify(b.pinnedBadges) &&
  a.xp === b.xp &&
  a.level === b.level &&
  a.streakDays === b.streakDays &&
  a.lastActiveDate === b.lastActiveDate &&
  JSON.stringify(a.badges) === JSON.stringify(b.badges) &&
  JSON.stringify(a.counters) === JSON.stringify(b.counters)
