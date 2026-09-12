import { describe, it, expect, beforeEach } from 'vitest'
import { useSurvivalStore } from '@/core/store/useSurvivalStore'

// ==========================================
// useSurvivalStore.ts — odemykání/výběr zbraně (bod 10 zadání, appčino
// "co dál tam chybí" bod 4). Testováno přímo přes Zustand API, stejný
// vzor jako gamification.test.ts/form-check-store.test.ts — žádné
// vykreslování, čistě store akce.
// ==========================================

const VYCHOZI_STAV = useSurvivalStore.getState()

const resetStore = () => {
  useSurvivalStore.setState({
    gold: 0,
    krystal: 0,
    nejvyssiVlna: 0,
    celkemBehu: 0,
    nejlepsiSkore: 0,
    bossPorazenoCelkem: 0,
    celkemPrezitySekund: 0,
    odemceneZbrane: [...VYCHOZI_STAV.odemceneZbrane],
    odemcenePostavy: [...VYCHOZI_STAV.odemcenePostavy],
    vybranaZbran: 'iron_sword',
  })
}

beforeEach(() => {
  resetStore()
})

describe('useSurvivalStore — odemknoutZbran', () => {
  it('bez dostatku Gold zbraň neodemkne a vrátí false', () => {
    useSurvivalStore.setState({ gold: 50 })
    const uspech = useSurvivalStore.getState().odemknoutZbran('flame_blade') // stojí 150
    expect(uspech).toBe(false)
    expect(useSurvivalStore.getState().odemceneZbrane).not.toContain('flame_blade')
    expect(useSurvivalStore.getState().gold).toBe(50) // appka nic nestrhla
  })

  it('s dostatkem Gold zbraň odemkne, strhne přesně cenu, a vrátí true', () => {
    useSurvivalStore.setState({ gold: 200 })
    const uspech = useSurvivalStore.getState().odemknoutZbran('flame_blade')
    expect(uspech).toBe(true)
    expect(useSurvivalStore.getState().odemceneZbrane).toContain('flame_blade')
    expect(useSurvivalStore.getState().gold).toBe(50) // 200 - 150
  })

  it('opakované odemčení už odemčené zbraně je no-op (appka nestrhne cenu podruhé)', () => {
    useSurvivalStore.setState({ gold: 1000 })
    useSurvivalStore.getState().odemknoutZbran('flame_blade')
    const goldPoPrvnim = useSurvivalStore.getState().gold
    const uspechDruhy = useSurvivalStore.getState().odemknoutZbran('flame_blade')
    expect(uspechDruhy).toBe(false)
    expect(useSurvivalStore.getState().gold).toBe(goldPoPrvnim)
  })

  it('neexistující zbraň (nemá odemkovaciCena) appka neodemkne', () => {
    useSurvivalStore.setState({ gold: 99999 })
    const uspech = useSurvivalStore.getState().odemknoutZbran('neexistuje')
    expect(uspech).toBe(false)
  })
})

describe('useSurvivalStore — vybratZbran', () => {
  it('vybere odemčenou zbraň', () => {
    useSurvivalStore.getState().vybratZbran('iron_sword')
    expect(useSurvivalStore.getState().vybranaZbran).toBe('iron_sword')
  })

  it('nedovolí vybrat zbraň, která ještě není odemčená', () => {
    useSurvivalStore.getState().vybratZbran('void_scythe')
    expect(useSurvivalStore.getState().vybranaZbran).toBe('iron_sword') // beze změny
  })

  it('po odemčení jde nově odemčenou zbraň vybrat', () => {
    useSurvivalStore.setState({ gold: 1200 })
    useSurvivalStore.getState().odemknoutZbran('void_scythe')
    useSurvivalStore.getState().vybratZbran('void_scythe')
    expect(useSurvivalStore.getState().vybranaZbran).toBe('void_scythe')
  })
})
