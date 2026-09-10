import { describe, it, expect, beforeEach } from 'vitest'
import { useWriterCheckpoints, checkpointyProDilo, MAX_CHECKPOINTU_NA_DILO } from '@/flagships/writer-room/useWriterCheckpoints'
import { validateWriterCheckpointsData } from '@/core/utils/writerCheckpointsValidation'

// ==========================================
// src/flagships/writer-room/useWriterCheckpoints.ts — testováno přímo
// přes Zustand store API (getState()/setState()), stejná "store funguje
// samostatně, žádná komponenta" zásada jako core/store/useGamificationStore.ts.
// ==========================================

const resetStore = () => {
  useWriterCheckpoints.setState({ checkpointy: [] })
}

beforeEach(resetStore)

describe('vytvorCheckpoint', () => {
  it('přidá nový checkpoint s daným druhem/dilaId/nazvem/daty', () => {
    useWriterCheckpoints.getState().vytvorCheckpoint('kniha', 'k1', 'Před koncem', { nazev: 'Test' })
    const vsechny = useWriterCheckpoints.getState().checkpointy
    expect(vsechny).toHaveLength(1)
    expect(vsechny[0]).toMatchObject({ druh: 'kniha', dilaId: 'k1', nazev: 'Před koncem', data: { nazev: 'Test' } })
  })

  it('prázdný název spadne na "Záloha"', () => {
    useWriterCheckpoints.getState().vytvorCheckpoint('scenar', 's1', '   ', {})
    expect(useWriterCheckpoints.getState().checkpointy[0].nazev).toBe('Záloha')
  })

  it('nad stropem MAX_CHECKPOINTU_NA_DILO zahodí nejstarší checkpoint TÉHOŽ díla', () => {
    for (let i = 0; i < MAX_CHECKPOINTU_NA_DILO + 2; i++) {
      useWriterCheckpoints.getState().vytvorCheckpoint('komiks', 'c1', `Verze ${i}`, { poradi: i })
    }
    const teDila = checkpointyProDilo(useWriterCheckpoints.getState().checkpointy, 'komiks', 'c1')
    expect(teDila).toHaveLength(MAX_CHECKPOINTU_NA_DILO)
    // Nejstarší dvě (Verze 0, Verze 1) měly být zahozené jako první.
    expect(teDila.some((c) => c.nazev === 'Verze 0')).toBe(false)
    expect(teDila.some((c) => c.nazev === 'Verze 1')).toBe(false)
    expect(teDila.some((c) => c.nazev === `Verze ${MAX_CHECKPOINTU_NA_DILO + 1}`)).toBe(true)
  })

  it('strop se počítá per dílo, ne globálně — jiné dilaId není zasažené', () => {
    for (let i = 0; i < MAX_CHECKPOINTU_NA_DILO + 2; i++) {
      useWriterCheckpoints.getState().vytvorCheckpoint('kniha', 'k1', `V${i}`, {})
    }
    useWriterCheckpoints.getState().vytvorCheckpoint('kniha', 'k2', 'Jiná kniha', {})
    expect(checkpointyProDilo(useWriterCheckpoints.getState().checkpointy, 'kniha', 'k2')).toHaveLength(1)
  })
})

describe('smazCheckpoint', () => {
  it('smaže přesně ten jeden checkpoint podle id', () => {
    useWriterCheckpoints.getState().vytvorCheckpoint('kniha', 'k1', 'A', {})
    useWriterCheckpoints.getState().vytvorCheckpoint('kniha', 'k1', 'B', {})
    const idPrvniho = useWriterCheckpoints.getState().checkpointy[0].id
    useWriterCheckpoints.getState().smazCheckpoint(idPrvniho)
    const zbyle = useWriterCheckpoints.getState().checkpointy
    expect(zbyle).toHaveLength(1)
    expect(zbyle[0].nazev).toBe('B')
  })
})

describe('checkpointyProDilo', () => {
  it('vrátí jen checkpointy odpovídajícího druhu a dilaId, seřazené od nejnovějšího', () => {
    // Přímý setState s odlišnými createdAt — reálné vytvorCheckpoint volání
    // by v jednom testu proběhla ve stejné milisekundě a řazení by tak
    // nešlo ověřit (viz stabilní sort na shodných klíčích).
    useWriterCheckpoints.setState({
      checkpointy: [
        { id: '1', druh: 'kniha', dilaId: 'k1', nazev: 'Stará', createdAt: '2026-01-01T00:00:00.000Z', data: {} },
        { id: '2', druh: 'scenar', dilaId: 'k1', nazev: 'Jiný druh, stejné id', createdAt: '2026-01-02T00:00:00.000Z', data: {} },
        { id: '3', druh: 'kniha', dilaId: 'k1', nazev: 'Nová', createdAt: '2026-06-01T00:00:00.000Z', data: {} },
      ],
    })
    const vysledek = checkpointyProDilo(useWriterCheckpoints.getState().checkpointy, 'kniha', 'k1')
    expect(vysledek.map((c) => c.nazev)).toEqual(['Nová', 'Stará'])
  })

  it('bez odpovídajících checkpointů vrátí prázdné pole', () => {
    expect(checkpointyProDilo([], 'komiks', 'neexistuje')).toEqual([])
  })
})

describe('validateWriterCheckpointsData', () => {
  it('projde platná data beze změny', () => {
    const data = { checkpointy: [{ id: '1', druh: 'kniha', dilaId: 'k1', nazev: 'A', createdAt: '1', data: { x: 1 } }] }
    const vysledek = validateWriterCheckpointsData(data)
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.checkpointy).toHaveLength(1)
  })

  it('zahodí jeden poškozený checkpoint, ne celý seznam', () => {
    const data = {
      checkpointy: [
        { id: '1', druh: 'kniha', dilaId: 'k1', nazev: 'A', createdAt: '1', data: { x: 1 } },
        { id: '2', druh: 'neplatny-druh', dilaId: 'k2', nazev: 'B', createdAt: '1', data: {} },
        { id: '3', druh: 'scenar', dilaId: 'k3', nazev: 'C', createdAt: '1' /* chybí data */ },
      ],
    }
    const vysledek = validateWriterCheckpointsData(data)
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.checkpointy).toHaveLength(1)
      expect(vysledek.data.checkpointy[0].id).toBe('1')
    }
  })

  it('chybějící pole checkpointy spadne na prázdné pole', () => {
    const vysledek = validateWriterCheckpointsData({})
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.checkpointy).toEqual([])
  })
})
