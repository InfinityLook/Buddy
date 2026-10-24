import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ==========================================
// Regresní test pro core/supabase/cloudSync.ts's VLASTNÍ kopii opravy
// "únik dat mezi účty při přepnutí účtu na jednom zařízení"
// (audit #2+#3) — jiný tvar dat než recordSync.ts/financeSync.ts
// (jeden snímek gamifikace/profilu, "vyšší vyhrává" merge místo
// záznam-po-záznamu), takže potřebuje svůj vlastní test nad REÁLNÝMI
// useGamificationStore/useProfileStore, jen s mockovaným
// ensureSession/fetchSnapshot/pushSnapshot (core/supabase/sync.ts).
// ==========================================

const ensureSessionMock = vi.hoisted(() => vi.fn<() => Promise<string | null>>())
const fetchSnapshotMock = vi.hoisted(() => vi.fn())
const pushSnapshotMock = vi.hoisted(() => vi.fn())

vi.mock('@/core/supabase/client', () => ({ isSupabaseConfigured: true }))

vi.mock('@/core/supabase/sync', () => ({
  ensureSession: ensureSessionMock,
  fetchSnapshot: fetchSnapshotMock,
  pushSnapshot: pushSnapshotMock,
}))

import { DEFAULT_BADGES, useGamificationStore } from '@/core/store/useGamificationStore'
import { DEFAULT_PROFILE, useProfileStore } from '@/pages/profil/hooks/useProfileData'

describe('cloudSync — reset gamifikace/profilu při přepnutí na jiný účet', () => {
  beforeEach(() => {
    ensureSessionMock.mockReset()
    fetchSnapshotMock.mockReset()
    pushSnapshotMock.mockReset()
    // Čistý výchozí stav obou REÁLNÝCH storů před každým testem — appka
    // mezi jednotlivými it() blocky uvnitř tohoto souboru jinak nechává
    // Zustand's own stav (jen partial-merge přes setState) prosakovat
    // z jednoho testu do dalšího, což by matlo, co test skutečně ověřuje.
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
    // Přímo setState, ne updateProfile — ten by (audit #4's own novou
    // logikou) sám nastavil profilNastaven: true, protože patch
    // obsahuje name/motto. Čistá výchozí základna musí být "ještě
    // nikdy nedotčená", ne "zrovna uložená".
    useProfileStore.setState({ profile: { ...DEFAULT_PROFILE, profilNastaven: false } })
    // Výchozí vzdálený snímek je "ještě nikdy nesynchronizoval" (null) —
    // konkrétní test si ho přepíše, kde na tom záleží (druhý test, B's
    // skutečný cloud stav).
    fetchSnapshotMock.mockResolvedValue(null)
    pushSnapshotMock.mockResolvedValue(undefined)
    localStorage.removeItem('schoolbuddy-cloud-sync-ucet')
  })

  afterEach(() => {
    localStorage.removeItem('schoolbuddy-cloud-sync-ucet')
  })

  it('na čerstvém zařízení (žádný zaznamenaný vlastník) se místní XP NEzahodí', async () => {
    const { syncNow } = await import('@/core/supabase/cloudSync')
    useGamificationStore.setState({ xp: 500, level: 3, streakDays: 2, badges: DEFAULT_BADGES, counters: {} })
    useProfileStore.getState().updateProfile({ name: 'Áček' })
    ensureSessionMock.mockResolvedValue('ucet-a')

    await syncNow()

    // "Vyšší vyhrává" merge s nulovým vzdáleným snímkem si zachovává
    // místních 500 XP — reset NEPROBĚHL, žádný dřívější vlastník
    // nebyl zaznamenaný.
    expect(useGamificationStore.getState().xp).toBe(500)
    expect(localStorage.getItem('schoolbuddy-cloud-sync-ucet')).toBe('ucet-a')
  })

  it('přepnutí na jiný skutečný účet vynuluje gamifikaci a profil PŘED mergem', async () => {
    const { syncNow } = await import('@/core/supabase/cloudSync')

    // Účet A: skutečný postup, 2500 XP, odemčený odznak, vlastní jméno.
    useGamificationStore.setState({
      xp: 2500,
      level: 8,
      streakDays: 14,
      badges: DEFAULT_BADGES.map((b, i) => (i === 0 ? { ...b, unlockedAt: '2024-01-01T00:00:00.000Z' } : b)),
      counters: { workout: 10 },
    })
    useProfileStore.getState().updateProfile({ name: 'Áček', motto: 'Áčkovo tajné motto' })
    ensureSessionMock.mockResolvedValue('ucet-a')
    await syncNow()
    expect(localStorage.getItem('schoolbuddy-cloud-sync-ucet')).toBe('ucet-a')
    pushSnapshotMock.mockClear()

    // Teď se na tom samém zařízení přihlásí JINÝ skutečný účet B, se
    // skutečným (nižším) cloudovým postupem — "vyšší vyhrává" by bez
    // opravy nechalo vyhrát Áčkovo zůstalé místní 2500 XP i Áčkovo
    // jméno/motto, přepsalo by to B's REÁLNÝ, menší postup, a ještě by
    // se to sloučené (zkontaminované) XP odeslalo zpátky pod B's účet.
    ensureSessionMock.mockResolvedValue('ucet-b')
    fetchSnapshotMock.mockResolvedValue({
      displayName: 'Bček',
      motto: 'Bčkovo skutečné motto',
      bio: '',
      frameId: null,
      pinnedBadges: [],
      xp: 40,
      level: 1,
      streakDays: 1,
      lastActiveDate: null,
      badges: {},
      counters: {},
      fitnessXp: 0,
    })

    await syncNow()

    // Áčkovo 2500 XP/odznak/jméno se NESMÍ projevit v nově mergnutém
    // stavu ani v tom, co appka odeslala pod B's user_id.
    expect(useGamificationStore.getState().xp).toBe(40)
    expect(useGamificationStore.getState().badges.some((b) => b.unlockedAt)).toBe(false)
    expect(useProfileStore.getState().profile.name).toBe('Bček')
    expect(useProfileStore.getState().profile.motto).toBe('Bčkovo skutečné motto')
    expect(pushSnapshotMock).toHaveBeenCalledWith(
      'ucet-b',
      expect.objectContaining({ xp: 40, displayName: 'Bček' })
    )
    expect(localStorage.getItem('schoolbuddy-cloud-sync-ucet')).toBe('ucet-b')
  })

  it('přepnutí na účet B, co ještě NIKDY nikde nesynchronizoval, ukáže placeholder jméno, ne prázdné', async () => {
    // Záchranná síť v runSync (ne v resetniPriNeshodeUctu samotné):
    // reset nastaví jméno/motto na '' (ať je nepřepíše neprávem přes
    // mergeSnapshots's "neprázdné vyhrává" pravidlo), ale tahle
    // konkrétní kombinace — B je úplně nový účet, fetchSnapshot vrací
    // null — appce po mergi nedá nic SKUTEČNÉHO ke stažení. Appka tu
    // musí ukázat DEFAULT_PROFILE's placeholder, ne prázdné jméno.
    const { syncNow } = await import('@/core/supabase/cloudSync')

    useGamificationStore.setState({ xp: 2500, badges: DEFAULT_BADGES, counters: {} })
    useProfileStore.getState().updateProfile({ name: 'Áček', motto: 'Áčkovo tajné motto' })
    ensureSessionMock.mockResolvedValue('ucet-a')
    await syncNow()

    ensureSessionMock.mockResolvedValue('ucet-b')
    fetchSnapshotMock.mockResolvedValue(null)

    await syncNow()

    expect(useProfileStore.getState().profile.name).toBe(DEFAULT_PROFILE.name)
    expect(useProfileStore.getState().profile.motto).toBe(DEFAULT_PROFILE.motto)
    // A hlavně: Áčkovo jméno se ani v téhle kombinaci nikam nepropašovalo.
    expect(useProfileStore.getState().profile.name).not.toBe('Áček')
  })

  it('audit #4: čerstvé zařízení synchronizující PRVNÍ KRÁT proti existujícímu účtu ukáže skutečné cloudové jméno, ne placeholder', async () => {
    // Tohle je přesně ten scénář, co audit #4 popisuje jako chybu:
    // zařízení nikdy předtím nic nesynchronizovalo (žádný zaznamenaný
    // vlastník, resetniPriNeshodeUctu se tu vůbec nespustí), takže
    // useProfileStore.profile pořád nese DEFAULT_PROFILE's placeholder
    // ('Uživatel'). Bez opravy by merge.ts's "neprázdné vyhrává"
    // pravidlo vzalo neupravený placeholder jako vědomou volbu a
    // navždy by jím přepsalo (i ZPĚT do databáze) existující, skutečné
    // cloudové jméno/motto.
    const { syncNow } = await import('@/core/supabase/cloudSync')

    // Čerstvý profil na tomhle zařízení — profilNastaven: false,
    // jméno/motto zůstávají na DEFAULT_PROFILE's placeholderu (žádný
    // updateProfile tu ještě nikdy neproběhl).
    expect(useProfileStore.getState().profile.profilNastaven).toBe(false)
    expect(useProfileStore.getState().profile.name).toBe(DEFAULT_PROFILE.name)

    ensureSessionMock.mockResolvedValue('ucet-c')
    fetchSnapshotMock.mockResolvedValue({
      displayName: 'Céčko',
      motto: 'Céčkovo skutečné cloudové motto',
      bio: 'Céčkovo skutečné bio',
      frameId: 'zlaty',
      pinnedBadges: ['prvni_krok'],
      xp: 1200,
      level: 6,
      streakDays: 9,
      lastActiveDate: null,
      badges: {},
      counters: {},
      fitnessXp: 0,
    })

    await syncNow()

    // Skutečné cloudové jméno/motto vyhrálo, ne placeholder.
    expect(useProfileStore.getState().profile.name).toBe('Céčko')
    expect(useProfileStore.getState().profile.motto).toBe('Céčkovo skutečné cloudové motto')
    expect(useProfileStore.getState().profile.bio).toBe('Céčkovo skutečné bio')
    expect(useProfileStore.getState().profile.frameId).toBe('zlaty')
    expect(useProfileStore.getState().profile.pinnedBadges).toEqual(['prvni_krok'])

    // A hlavně: appka neposlala zkontaminovaný (placeholder) profil
    // ZPĚT do databáze pod tímhle účtem — to by poškodilo zdroj pravdy
    // pro úplně všechna zařízení toho uživatele, ne jen tohle jedno.
    expect(pushSnapshotMock).toHaveBeenCalledWith(
      'ucet-c',
      expect.objectContaining({ displayName: 'Céčko', motto: 'Céčkovo skutečné cloudové motto' })
    )
  })

  it('audit #4: dříve přizpůsobený profil BEZ vlajky (uložený před touhle opravou) se pořád chová jako "nastavený"', async () => {
    // Zpětná kompatibilita bez migrace: appka pro profil uložený dřív
    // (profilNastaven je undefined) musí správně odvodit "dotčeno" z
    // toho, že jméno/motto se liší od DEFAULT_PROFILE's placeholderu —
    // a tohle "dotčeno" musí přežít i merge s cloudem, kde cloud sám
    // nemá nic skutečného k nabídnutí (null snímek).
    const { syncNow } = await import('@/core/supabase/cloudSync')

    // Simulace profilu uloženého PŘED touhle opravou — žádné
    // updateProfile volání (to by vlajku nastavilo), přímý setState
    // bez profilNastaven vůbec, jako starý soubor ze storage.
    useProfileStore.setState({
      profile: { ...DEFAULT_PROFILE, name: 'Dávný Déček', motto: 'Déčkovo staré motto', profilNastaven: undefined },
    })
    expect(useProfileStore.getState().profile.profilNastaven).toBeUndefined()

    ensureSessionMock.mockResolvedValue('ucet-d')
    fetchSnapshotMock.mockResolvedValue(null)

    await syncNow()

    // Déčkovo dřív uložené jméno/motto se nezahodilo ani nepřepsalo
    // placeholderem jen proto, že appka o vlajce neví.
    expect(useProfileStore.getState().profile.name).toBe('Dávný Déček')
    expect(useProfileStore.getState().profile.motto).toBe('Déčkovo staré motto')
  })

  it('opětovné přihlášení TOHO SAMÉHO účtu žádný reset nespustí', async () => {
    const { syncNow } = await import('@/core/supabase/cloudSync')

    useGamificationStore.setState({ xp: 777, level: 5, streakDays: 3, badges: DEFAULT_BADGES, counters: {} })
    ensureSessionMock.mockResolvedValue('ucet-a')
    await syncNow()

    ensureSessionMock.mockResolvedValue('ucet-a')
    await syncNow()

    // "Odhlášení" a opětovné přihlášení toho samého účtu nesmí nic
    // vynulovat (v tomhle testu by se jinak 777 slouilo s nulovým
    // fetchSnapshot a stejně zůstalo 777 — proto se tu ověřuje, že
    // reset NEPROBĚHL tím, že se po druhém průchodu neobjevilo žádné
    // vynulování mezi průchody — localStorage marker zůstal stejný).
    expect(localStorage.getItem('schoolbuddy-cloud-sync-ucet')).toBe('ucet-a')
    expect(useGamificationStore.getState().xp).toBe(777)
  })
})
