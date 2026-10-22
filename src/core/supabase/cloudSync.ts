import { create } from 'zustand'
import { DEFAULT_BADGES, useGamificationStore } from '@/core/store/useGamificationStore'
import { DEFAULT_PROFILE, useProfileStore } from '@/pages/profil/hooks/useProfileData'
import { isSupabaseConfigured } from './client'
import { mergeSnapshots, snapshotsEqual } from './merge'
import { useAccount } from './auth'
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
    bio: profile.bio,
    frameId: profile.frameId,
    pinnedBadges: profile.pinnedBadges,
    xp: game.xp,
    level: game.level,
    streakDays: game.streakDays,
    lastActiveDate: game.lastActiveDate,
    badges,
    counters: game.counters,
    fitnessXp: game.fitnessXp,
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
    fitnessXp: snapshot.fitnessXp,
  })

  const { profile, updateProfile } = useProfileStore.getState()
  if (
    profile.name !== snapshot.displayName ||
    profile.motto !== snapshot.motto ||
    profile.bio !== snapshot.bio ||
    profile.frameId !== snapshot.frameId ||
    JSON.stringify(profile.pinnedBadges) !== JSON.stringify(snapshot.pinnedBadges)
  ) {
    updateProfile({
      name: snapshot.displayName,
      motto: snapshot.motto,
      bio: snapshot.bio,
      frameId: snapshot.frameId,
      pinnedBadges: snapshot.pinnedBadges,
    })
  }
}

let userId: string | null = null
let pushTimer: number | null = null
let inFlight = false

// Odhazitelné bookkeeping (localStorage přímo, ne Zustand) — stejná
// kategorie jako sync kurzory v core/supabase/recordSync.ts/
// financeSync.ts, nepatří do BACKUP_STORES, nepotřebuje migraci.
//
// Pamatuje si, KTERÉMU účtu patří gamifikace/profil, co teď leží v
// místních storech. Bez týhle kontroly by přepnutí účtu na jednom
// zařízení (audit #2+#3 — sdílený rodinný tablet, druhý člověk se
// přihlásí na stejném telefonu...) vedlo k tomu, že appka "vyšší
// vyhrává" mergem přepíše NOVÉHO účtu skutečné XP/odznaky/profil
// zbylými čísly PŘEDCHOZÍHO účtu — a tenhle sloučený (zkontaminovaný)
// stav by se ještě poslal zpátky do cloudu pod NOVÝM účtem.
const UCET_KLIC = 'schoolbuddy-cloud-sync-ucet'

const resetniPriNeshodeUctu = (noveUserId: string) => {
  const posledniVlastnik = localStorage.getItem(UCET_KLIC)
  // `null` znamená "appka si na tomhle zařízení ještě nikoho
  // nepamatuje" (čerstvý telefon, nebo appka až teď poprvé přihlásila
  // skutečný účet poté, co uživatel hrál offline) — tam se lokální
  // offline postup má sloučit s cloudem, ne zahodit, takže reset
  // schválně NEPROBĚHNE.
  if (posledniVlastnik && posledniVlastnik !== noveUserId) {
    useGamificationStore.setState({
      xp: 0,
      level: 1,
      streakDays: 0,
      lastActiveDate: null,
      badges: DEFAULT_BADGES,
      counters: {},
      fitnessXp: 0,
      xpLog: [],
    })
    // Jméno a motto se resetují na PRÁZDNÝ řetězec, ne na
    // DEFAULT_PROFILE's kosmetický placeholder ("Uživatel"/motto věta)
    // — mergeSnapshots's own pravidlo pro tahle dvě pole je "neprázdné
    // místní vyhrává" (viz merge.ts), takže kdyby appka resetovala na
    // neprázdný placeholder, ten by se tvářil jako "uživatelova
    // skutečná volba" a navždycky by vyhrál nad B's SKUTEČNÝM
    // cloudovým jménem/mottem — B by viděl "Uživatel" natrvalo místo
    // svého vlastního jména, dokud by ho sám znovu nezadal. Prázdný
    // řetězec appce naopak dovolí tomu samému existujícímu pravidlu,
    // ať normálně propustí B's reálnou cloudovou hodnotu. (Honest
    // UI-fallback pro tu vzácnou kombinaci "B ještě NIKDY nesynchronizoval
    // vůbec" je dole v runSync, ne tady — tam, kde appka vidí VÝSLEDEK
    // mergu, ne jen tenhle jeden lokální reset.)
    useProfileStore.getState().updateProfile({
      name: '',
      motto: '',
      bio: DEFAULT_PROFILE.bio,
      frameId: DEFAULT_PROFILE.frameId,
      pinnedBadges: DEFAULT_PROFILE.pinnedBadges,
    })
    lastPushed = null
  }
  localStorage.setItem(UCET_KLIC, noveUserId)
}
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

    // Nejdřív zkontroluj, čí gamifikace/profil v místních storech teď
    // doopravdy leží — AŽ POTOM stahovat/slučovat/posílat. Jinak by se
    // kontrola mohla stihnout pozdě a stejně by proběhl jeden merge
    // pod cizím účtem, než se stav vyprázdní.
    resetniPriNeshodeUctu(userId)

    const remote = await fetchSnapshot(userId)
    const slouceny = mergeSnapshots(localSnapshot(), remote)

    // Čestná záchranná síť přesně pro tu jednu zbylou vzácnou kombinaci
    // resetniPriNeshodeUctu's own prázdného jména/motta výš: tenhle
    // účet ještě NIKDY nikde nesynchronizoval (remote je null nebo má
    // samo taky prázdné jméno), takže appka tu nemá co SKUTEČNÉHO
    // stáhnout — DEFAULT_PROFILE's placeholder je tady správný, žádné
    // riziko, že by přepsal/odeslal něčí reálná data, protože merged
    // je v téhle chvíli nejvýš jen tenhle jeden, už vyprázdněný účet.
    const merged = {
      ...slouceny,
      displayName: slouceny.displayName.trim() || DEFAULT_PROFILE.name,
      motto: slouceny.motto.trim() || DEFAULT_PROFILE.motto,
    }

    applyLocally(merged)
    await pushSnapshot(userId, merged)

    lastPushed = merged
    setStatus({ status: 'synced', lastSyncedAt: new Date().toISOString(), error: null })
  } catch (err) {
    failed(err)
  }
}

// Probíhající průchod. Volá se z pěti míst (start, změna přihlášení,
// návrat k aplikaci, obnovené připojení, tlačítko v profilu) a bez
// tohohle sdílení by se překrývající se volání zbytečně prala o stejné
// řádky a přepisovala si výsledky.
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

  // Přihlášení nebo odhlášení mění identitu. Bez tohohle by aplikace
  // dál psala do účtu, ze kterého se uživatel právě odhlásil.
  let posledniUcet = useAccount.getState().userId
  useAccount.subscribe((stav) => {
    if (stav.userId === posledniUcet) return
    posledniUcet = stav.userId

    // Odeslaný stav patřil předchozímu účtu; kdyby se nezahodil,
    // porovnání by u nového účtu vyšlo jako "není co posílat".
    lastPushed = null
    void syncNow()
  })

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
