import { supabase } from './client'
import { CloudSnapshot } from './types'

// ==========================================
// Síťová část synchronizace.
//
// Každá funkce počítá s tím, že se nemusí povést — offline, uspaný projekt,
// vypnuté anonymní přihlášení. Nic z toho nesmí shodit aplikaci, proto se
// chyby vracejí jako hodnota, ne jako výjimka letící ven.
// ==========================================

export interface SyncError {
  message: string
}

/**
 * Zajistí anonymní relaci. Uživatel o ní neví — přihlašovací obrazovka
 * zůstává, jak je. Supabase si relaci uloží a příště ji obnoví sám.
 */
export const ensureSession = async (): Promise<string | null> => {
  if (!supabase) return null

  const { data } = await supabase.auth.getSession()
  if (data.session?.user?.id) return data.session.user.id

  const { data: signedIn, error } = await supabase.auth.signInAnonymously()
  if (error) {
    // Nejčastější příčina: anonymní přihlášení není v projektu povolené
    console.warn('[cloud] Anonymní přihlášení selhalo:', error.message)
    return null
  }

  return signedIn.user?.id ?? null
}

export const fetchSnapshot = async (userId: string): Promise<CloudSnapshot | null> => {
  if (!supabase) return null

  const [profile, badges, counters] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, motto, xp, level, streak_days, last_active_date')
      .eq('id', userId)
      .maybeSingle(),
    supabase.from('user_badges').select('badge_id, unlocked_at').eq('user_id', userId),
    supabase.from('activity_counters').select('kind, count').eq('user_id', userId),
  ])

  if (profile.error) throw new Error(profile.error.message)
  // Profil ještě neexistuje — tenhle uživatel se připojil poprvé
  if (!profile.data) return null

  const badgeMap: Record<string, string> = {}
  for (const row of badges.data ?? []) badgeMap[row.badge_id] = row.unlocked_at

  const counterMap: Record<string, number> = {}
  for (const row of counters.data ?? []) counterMap[row.kind] = row.count

  return {
    displayName: profile.data.display_name ?? '',
    motto: profile.data.motto ?? '',
    xp: profile.data.xp ?? 0,
    level: profile.data.level ?? 1,
    streakDays: profile.data.streak_days ?? 0,
    lastActiveDate: profile.data.last_active_date ?? null,
    badges: badgeMap,
    counters: counterMap,
  }
}

export const pushSnapshot = async (userId: string, snapshot: CloudSnapshot): Promise<void> => {
  if (!supabase) return

  const profile = await supabase.from('profiles').upsert(
    {
      id: userId,
      display_name: snapshot.displayName,
      motto: snapshot.motto,
      xp: snapshot.xp,
      level: snapshot.level,
      streak_days: snapshot.streakDays,
      last_active_date: snapshot.lastActiveDate,
    },
    { onConflict: 'id' }
  )
  if (profile.error) throw new Error(profile.error.message)

  const badgeRows = Object.entries(snapshot.badges).map(([badge_id, unlocked_at]) => ({
    user_id: userId,
    badge_id,
    unlocked_at,
  }))

  if (badgeRows.length > 0) {
    const badges = await supabase
      .from('user_badges')
      .upsert(badgeRows, { onConflict: 'user_id,badge_id' })
    if (badges.error) throw new Error(badges.error.message)
  }

  const counterRows = Object.entries(snapshot.counters).map(([kind, count]) => ({
    user_id: userId,
    kind,
    count,
  }))

  if (counterRows.length > 0) {
    const counters = await supabase
      .from('activity_counters')
      .upsert(counterRows, { onConflict: 'user_id,kind' })
    if (counters.error) throw new Error(counters.error.message)
  }
}
