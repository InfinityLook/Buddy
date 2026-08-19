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

// Název zámku, pod kterým se zakládá anonymní relace. Smí se lišit od
// zámků, které si drží samo supabase-js pro obnovu tokenů — shodný název
// by dvě části kódu poslal do vzájemného čekání.
const SESSION_LOCK = 'schoolbuddy-anon-session'

// Kdyby zámek z jakéhokoli důvodu nikdo neuvolnil, nesmí to zablokovat
// synchronizaci nadobro — po téhle době se čekání vzdá a zkusí se to bez něj.
const LOCK_TIMEOUT = 10_000

/** Vlastní založení relace. Počítá s tím, že už žádná neexistuje. */
const claimSession = async (): Promise<string | null> => {
  if (!supabase) return null

  // Znovu se ptej až tady. Když se čekalo na zámek, mezitím ji mohl založit
  // jiný panel a Supabase ji uložil do localStorage — tenhle dotaz ji najde
  // a účet se nezaloží podruhé.
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

/**
 * Zajistí anonymní relaci. Uživatel o ní neví — přihlašovací obrazovka
 * zůstává, jak je. Supabase si relaci uloží a příště ji obnoví sám.
 *
 * Zakládání je pod zámkem přes celý původ (Web Locks), protože samotné
 * "není relace → založ" není atomické: dva panely nebo dvě rychle po sobě
 * jdoucí načtení stránky (třeba reload po nasazení nové verze) starají obojí
 * "relace není" dřív, než první z nich stačí relaci uložit — a v databázi
 * pak vzniknou dvě identity, z nichž jedna zůstane prázdná a nedosažitelná.
 * Pojistka uvnitř jednoho běhu na tohle nestačí, každý běh má vlastní paměť.
 */
export const ensureSession = async (): Promise<string | null> => {
  if (!supabase) return null

  // Rychlá cesta: relace už je, na zámek není důvod sahat
  const { data } = await supabase.auth.getSession()
  if (data.session?.user?.id) return data.session.user.id

  // Starší Safari Web Locks nemá. Tam zůstává chování jako dřív — horší
  // než se zámkem, ale pořád funkční.
  if (typeof navigator === 'undefined' || !navigator.locks) return claimSession()

  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), LOCK_TIMEOUT)

  try {
    return await navigator.locks.request(
      SESSION_LOCK,
      { signal: abort.signal },
      () => claimSession()
    )
  } catch {
    // Vypršelé čekání na zámek. Raději relaci založit bez něj než nechat
    // uživatele bez synchronizace.
    return claimSession()
  } finally {
    clearTimeout(timer)
  }
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
