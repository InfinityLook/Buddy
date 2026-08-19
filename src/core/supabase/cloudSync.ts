import { create } from 'zustand'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useProfileStore } from '@/pages/profil/hooks/useProfileData'
import { isSupabaseConfigured } from './client'
import { mergeSnapshots, snapshotsEqual } from './merge'
import { ensureSession, fetchSnapshot, pushSnapshot } from './sync'
import { CloudSnapshot, SyncStatus } from './types'

// ==========================================
// Propojení místních storů s cloudem.
//
// Zdrojem pravdy zůstává localStorage. Cloud je kopie navíc: aplikace
// funguje offline přesně jako dřív a synchronizace jen doběhne, až bude
// síť. Žádná operace neblokuje vykreslení.
// ==========================================

// Jak dlouho po poslední změně se odesílá. Sbírání XP spustí několik
// zápisů za sebou (počítadlo, XP, odznak) — nemá smysl volat server
// po každém z nich.
const PUSH_DELAY = 2500

interface CloudState {
  status: SyncStatus
  lastSyncedAt: string | null
  error: string | null
}

export const useCloudStatus = create<CloudState>(() => ({
  status: isSupabaseConfigured ? 'connecting' : 'off',
  lastSyncedAt: null,
  error: null,
}))

const setStatus = (patch: Partial<CloudState>) => useCloudStatus.setState(patch)

// Poskládá snímek z toho, co je právě v místních storech
const localSnapshot = (): CloudSnapshot => {
  const game = useGamificationStore.getState()
  const { profile } = useProfileStore.getState()

  const badges: Record<string, string> = {}
  for (const badge of game.badges) {
    if (badge.unlockedAt) badges[badge.id] = badge.unlockedAt
  }

  return {
    displayName: profile.name,
    motto: profile.motto,
    xp: game.xp,
    level: game.level,
    streakDays: game.streakDays,
    lastActiveDate: game.lastActiveDate,
    badges,
    counters: game.counters,
  }
}

// Zapíše sloučený stav zpátky do místních storů
const applyLocally = (snapshot: CloudSnapshot) => {
  useGamificationStore.getState().applyCloudSnapshot({
    xp: snapshot.xp,
    level: snapshot.level,
    streakDays: snapshot.streakDays,
    lastActiveDate: snapshot.lastActiveDate,
    badges: snapshot.badges,
    counters: snapshot.counters,
  })

  const { profile, updateProfile } = useProfileStore.getState()
  if (profile.name !== snapshot.displayName || profile.motto !== snapshot.motto) {
    updateProfile({ name: snapshot.displayName, motto: snapshot.motto })
  }
}

let userId: string | null = null
let pushTimer: number | null = null
let inFlight = false
// Poslední úspěšně odeslaný stav — brání zbytečným zápisům
let lastPushed: CloudSnapshot | null = null

const failed = (err: unknown) => {
  const message = err instanceof Error ? err.message : 'Synchronizace selhala.'
  console.warn('[cloud]', message)
  setStatus({ status: navigator.onLine === false ? 'offline' : 'error', error: message })
}

/** Odešle aktuální stav. Chybu jen zaznamená — data zůstávají v zařízení. */
const push = async () => {
  if (!userId || inFlight) return

  const snapshot = localSnapshot()
  if (lastPushed && snapshotsEqual(snapshot, lastPushed)) return

  inFlight = true
  try {
    await pushSnapshot(userId, snapshot)
    lastPushed = snapshot
    setStatus({ status: 'synced', lastSyncedAt: new Date().toISOString(), error: null })
  } catch (err) {
    failed(err)
  } finally {
    inFlight = false
  }
}

const schedulePush = () => {
  if (!userId) return
  if (pushTimer) window.clearTimeout(pushTimer)
  pushTimer = window.setTimeout(() => void push(), PUSH_DELAY)
}

const runSync = async (): Promise<void> => {
  setStatus({ status: 'connecting', error: null })

  try {
    userId = await ensureSession()
    if (!userId) {
      setStatus({
        status: 'error',
        error: 'Nepodařilo se založit relaci. Je v projektu povolené anonymní přihlášení?',
      })
      return
    }

    const remote = await fetchSnapshot(userId)
    const merged = mergeSnapshots(localSnapshot(), remote)

    applyLocally(merged)
    await pushSnapshot(userId, merged)

    lastPushed = merged
    setStatus({ status: 'synced', lastSyncedAt: new Date().toISOString(), error: null })
  } catch (err) {
    failed(err)
  }
}

// Probíhající průchod. Volá se ze čtyř míst (start, návrat k aplikaci,
// obnovené připojení, tlačítko v profilu) a bez tohohle sdílení mohla dvě
// překrývající se volání obě zjistit "relace není" a obě založit
// anonymní účet — v databázi pak vznikly dvě identity pár vteřin po sobě
// a ta první zůstala prázdná a nedosažitelná.
let syncPromise: Promise<void> | null = null

/**
 * První průchod: přihlásit, stáhnout, sloučit a poslat zpátky.
 * Slučuje se pravidlem "vyšší vyhrává", takže tenhle krok nemůže
 * uživateli sebrat postup ani v jednom směru.
 *
 * Souběžná volání se přidají k už běžícímu průchodu místo spuštění dalšího.
 */
export const syncNow = (): Promise<void> => {
  if (!isSupabaseConfigured) return Promise.resolve()
  if (syncPromise) return syncPromise

  syncPromise = runSync().finally(() => {
    syncPromise = null
  })

  return syncPromise
}

let started = false

/**
 * Spustí se jednou z App.tsx. Když Supabase nastavené není, neudělá nic
 * a aplikace jede dál jen nad localStorage.
 */
export const startCloudSync = (): void => {
  if (started || !isSupabaseConfigured) return
  started = true

  void syncNow()

  // Změna v gamifikaci nebo profilu se odešle se zpožděním
  useGamificationStore.subscribe(schedulePush)
  useProfileStore.subscribe(schedulePush)

  // Návrat k aplikaci a obnovené připojení jsou nejlepší chvíle to dohnat
  const resync = () => {
    if (document.visibilityState === 'visible') void syncNow()
  }
  document.addEventListener('visibilitychange', resync)
  window.addEventListener('online', () => void syncNow())

  // Odchod ze stránky nesmí spolknout posledních pár vteřin sbírání XP
  window.addEventListener('pagehide', () => {
    if (pushTimer) window.clearTimeout(pushTimer)
    void push()
  })
}
