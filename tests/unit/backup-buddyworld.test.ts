import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ==========================================
// Regresní test pro core/utils/backup.ts's opravu "Doplnit úplnou
// zálohu Buddy Worldu" (audit #5). Appka dřív v BACKUP_STORES znala
// jen 3 ze skutečných 11 persistovaných klíčů Buddy Worldu — nejvíc
// bil Frontier (src/buddyworld/frontier/store.ts), celý herní postup
// (zlato, vybavení, mise, uložené regiony...).
//
// indexedDbStorage mockujeme, protože jsdom v tomhle projektu
// (tests/setup.ts) nenabízí reálné window.indexedDB — collectFullBackup/
// restoreFullBackup iterují přes VŠECHNY BACKUP_STORES, včetně
// 'schoolbuddy-finance-storage' (storage: 'indexeddb'), a bez téhle
// náhražky by na tom spadly ReferenceErrorem úplně nesouvisejícím
// s tím, co tenhle soubor doopravdy testuje.
// ==========================================

vi.mock('@/core/utils/indexedDbStorage', () => ({
  indexedDbStorage: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => {}),
    removeItem: vi.fn(async () => {}),
  },
}))

import { BACKUP_STORES, collectFullBackup, restoreFullBackup } from '@/core/utils/backup'

const FRONTIER_KLIC = 'buddyworld:frontier:v42'
const STRAZCE_KLIC = 'buddyworld-kristalovy-strazce-v1'
const LES_KLIC = 'buddyworld:magicky-les-objevy:v1'
const HLIDAC_KLIC = 'buddyworld:hlidac-ruin:v1'
const CHECKPOINT_KLIC = 'buddyworld:checkpoint:v1'
const FRAGMENTY_KLIC = 'buddyworld:fragmenty-ruin:v1'
const ULOMKY_KLIC = 'buddyworld-mytina-ulomky-v1'
const RUINY_KLIC = 'buddyworld:ruiny-hadanka:v1'
const KVALITA_KLIC = 'buddyworld-graficka-kvalita-v1'

describe('backup.ts — kompletní záloha Buddy Worldu (audit #5)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('katalog zná všech 8 reálných Buddy World klíčů, co appka dřív neznala', () => {
    const klice = BACKUP_STORES.map((s) => s.key)
    expect(klice).toContain(FRONTIER_KLIC)
    expect(klice).toContain(STRAZCE_KLIC)
    expect(klice).toContain(LES_KLIC)
    expect(klice).toContain(HLIDAC_KLIC)
    expect(klice).toContain(CHECKPOINT_KLIC)
    expect(klice).toContain(FRAGMENTY_KLIC)
    expect(klice).toContain(ULOMKY_KLIC)
    expect(klice).toContain(RUINY_KLIC)
  })

  it('grafická kvalita zůstává záměrně mimo katalog (zařízení, ne uživatelská data)', () => {
    const klice = BACKUP_STORES.map((s) => s.key)
    expect(klice).not.toContain(KVALITA_KLIC)
  })

  it('Frontierův celý herní postup (JSON) se zálohuje a obnoví beze změny', async () => {
    const frontierStav = {
      state: {
        version: 44,
        region: 'les',
        mission: 7,
        gold: 1234,
        shards: 9,
        owned: ['mec', 'kabatec', 'koren'],
        bond: 11,
      },
      version: 44,
    }
    localStorage.setItem(FRONTIER_KLIC, JSON.stringify(frontierStav))

    const zaloha = await collectFullBackup()
    expect(zaloha.data[FRONTIER_KLIC]).toEqual(frontierStav)

    localStorage.removeItem(FRONTIER_KLIC)
    const vysledek = await restoreFullBackup(zaloha)

    expect(vysledek.success).toBe(true)
    expect(vysledek.restored).toContain('Buddy World — Frontier')
    expect(JSON.parse(localStorage.getItem(FRONTIER_KLIC)!)).toEqual(frontierStav)
  })

  it('appčin ne-JSON "claimed" zámek krystalového strážce přežije zálohu a obnovu BEZE ZMĚNY (ne jako "claimed" s uvozovkami)', async () => {
    localStorage.setItem(STRAZCE_KLIC, 'claimed')

    const zaloha = await collectFullBackup()
    // Musí to být přesně 'claimed', ne JSON.parse('claimed') (to by
    // spadlo) ani '"claimed"' (to by appčinu '===' kontrolu rozbilo).
    expect(zaloha.data[STRAZCE_KLIC]).toBe('claimed')

    localStorage.removeItem(STRAZCE_KLIC)
    const vysledek = await restoreFullBackup(zaloha)

    expect(vysledek.success).toBe(true)
    expect(vysledek.restored).toContain('Buddy World — Krystalový strážce')
    // Tohle je appčina vlastní skutečná kontrola z BuddyWorldHra.tsx —
    // pokud se po obnově nerovná přesně 'claimed', appka by bosse
    // ukázala jako znovu živého.
    expect(localStorage.getItem(STRAZCE_KLIC)).toBe('claimed')
  })

  it('poškozená záloha s jiným než řetězcovým "claimed" se tiše vynechá, ne že by appku rozbila', async () => {
    const zaloha = await collectFullBackup()
    zaloha.data[STRAZCE_KLIC] = { malicious: true }

    const vysledek = await restoreFullBackup(zaloha)

    expect(vysledek.restored).not.toContain('Buddy World — Krystalový strážce')
    expect(localStorage.getItem(STRAZCE_KLIC)).toBeNull()
  })

  it('zbylých 6 JSON Buddy World klíčů (objevy, hlídač, checkpoint, fragmenty, úlomky, hádanka) se zálohuje a obnoví', async () => {
    const data: Record<string, unknown> = {
      [LES_KLIC]: ['objev-a', 'objev-b'],
      [HLIDAC_KLIC]: { hp: 80, probuzen: true },
      [CHECKPOINT_KLIC]: { region: 'ruiny', x: 3, z: -2 },
      [FRAGMENTY_KLIC]: ['fragment-1'],
      [ULOMKY_KLIC]: ['ulomek-x', 'ulomek-y', 'ulomek-z'],
      [RUINY_KLIC]: { poradi: ['koreny', 'svetlo'], dokonceno: false },
    }

    for (const [klic, hodnota] of Object.entries(data)) {
      localStorage.setItem(klic, JSON.stringify(hodnota))
    }

    const zaloha = await collectFullBackup()
    for (const [klic, hodnota] of Object.entries(data)) {
      expect(zaloha.data[klic]).toEqual(hodnota)
      localStorage.removeItem(klic)
    }

    const vysledek = await restoreFullBackup(zaloha)
    expect(vysledek.success).toBe(true)

    for (const [klic, hodnota] of Object.entries(data)) {
      expect(JSON.parse(localStorage.getItem(klic)!)).toEqual(hodnota)
    }
  })

  it('grafická kvalita se do zálohy nedostane, i kdyby v localStorage ležela', async () => {
    localStorage.setItem(KVALITA_KLIC, 'detailni')

    const zaloha = await collectFullBackup()

    expect(zaloha.data[KVALITA_KLIC]).toBeUndefined()
  })
})
