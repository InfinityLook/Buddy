import { describe, it, expect, beforeEach } from 'vitest'
import { simulujSporeni, vypocitejPotrebnyMesicniVklad } from '@/miniapps/sporici-simulator/types'
import { useSporiciSimulatorStore } from '@/miniapps/sporici-simulator/useSporiciSimulator'
import { validateSporiciSimulatorData } from '@/core/utils/sporiciSimulatorValidation'
import { useGamificationStore } from '@/core/store/useGamificationStore'

describe('simulujSporeni', () => {
  it('bez úroku odpovídá celkem přesně vloženému (žádný zisk)', () => {
    const body = simulujSporeni(1000, 500, 0, 3)
    expect(body).toHaveLength(3)
    expect(body[0].vlozeno).toBe(1000 + 500 * 12)
    expect(body[0].urok).toBe(0)
    expect(body[0].celkem).toBe(body[0].vlozeno)
  })

  it('s úrokem roste celkem rychleji než vloženo, urok je kladný', () => {
    const body = simulujSporeni(10000, 1000, 5, 5)
    for (const bod of body) {
      expect(bod.celkem).toBeGreaterThan(bod.vlozeno)
      expect(bod.urok).toBe(bod.celkem - bod.vlozeno)
    }
    // Úrok roste rok od roku (delší doba na úročení).
    expect(body[4].urok).toBeGreaterThan(body[0].urok)
  })

  it('roky jsou očíslované postupně od 1', () => {
    const body = simulujSporeni(0, 100, 3, 4)
    expect(body.map((b) => b.rok)).toEqual([1, 2, 3, 4])
  })

  it('bez počátečního vkladu a bez měsíčního vkladu zůstane nula', () => {
    const body = simulujSporeni(0, 0, 5, 2)
    expect(body.every((b) => b.celkem === 0 && b.vlozeno === 0 && b.urok === 0)).toBe(true)
  })
})

describe('vypocitejPotrebnyMesicniVklad', () => {
  it('bez úroku rozdělí chybějící částku rovnoměrně na měsíce', () => {
    // Cíl 12000, počáteční 0, 0% úrok, 1 rok = 12 měsíců → přesně 1000/měs.
    expect(vypocitejPotrebnyMesicniVklad(12000, 0, 0, 1)).toBe(1000)
  })

  it('vrátí 0, pokud počáteční vklad cíl už sám splňuje', () => {
    expect(vypocitejPotrebnyMesicniVklad(10000, 50000, 5, 5)).toBe(0)
  })

  it('s úrokem vyjde nižší měsíční vklad než bez úroku pro stejný cíl', () => {
    const bezUroku = vypocitejPotrebnyMesicniVklad(500000, 0, 0, 10)
    const sUrokem = vypocitejPotrebnyMesicniVklad(500000, 0, 6, 10)
    expect(sUrokem).toBeLessThan(bezUroku)
  })

  it('vypočtený vklad dosadený zpátky do simulace skutečně cíl splní nebo přesáhne', () => {
    const cil = 300000
    const potrebny = vypocitejPotrebnyMesicniVklad(cil, 5000, 4, 8)
    const vysledek = simulujSporeni(5000, potrebny, 4, 8)
    expect(vysledek[vysledek.length - 1].celkem).toBeGreaterThanOrEqual(cil - 1)
  })

  it('nulová doba spoření vrátí 0, ne dělení nulou', () => {
    expect(vypocitejPotrebnyMesicniVklad(10000, 0, 5, 0)).toBe(0)
  })
})

describe('validateSporiciSimulatorData', () => {
  it('poškozenou položku scénáře tiše vyřadí, ne celý seznam', () => {
    const vysledek = validateSporiciSimulatorData({
      scenare: [
        { id: '1', nazev: 'Na auto', pocatecniVklad: 1000, mesicniVklad: 500, rocniUrokProcenta: 3, pocetLet: 5, createdAt: '' },
        { id: '2' }, // chybí nazev → vyřadit
        null,
      ],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.scenare).toHaveLength(1)
      expect(vysledek.data.scenare[0].nazev).toBe('Na auto')
    }
  })

  it('chybějící scenare pole se bezpečně nahradí prázdným seznamem', () => {
    const vysledek = validateSporiciSimulatorData({})
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.scenare).toEqual([])
  })
})

describe('useSporiciSimulatorStore', () => {
  const vychoziBadges = useGamificationStore.getState().badges

  beforeEach(() => {
    useSporiciSimulatorStore.setState({ scenare: [] })
    // Bez `replace: true` — akce žijí na stejném objektu jako data,
    // stejný důvod jako gamification.test.ts's vlastní resetStore.
    useGamificationStore.setState({
      xp: 0,
      counters: {},
      badges: vychoziBadges.map((b) => ({ ...b, unlockedAt: null })),
    })
  })

  it('ulozitScenar přidá nový scénář na začátek seznamu a připíše XP', () => {
    const xpPred = useGamificationStore.getState().xp
    useSporiciSimulatorStore.getState().ulozitScenar('Na dovolenou', 5000, 1500, 3.5, 4)

    const scenare = useSporiciSimulatorStore.getState().scenare
    expect(scenare).toHaveLength(1)
    expect(scenare[0].nazev).toBe('Na dovolenou')
    expect(scenare[0].pocetLet).toBe(4)
    expect(useGamificationStore.getState().xp).toBeGreaterThan(xpPred)
  })

  it('prázdný název scénář neuloží', () => {
    useSporiciSimulatorStore.getState().ulozitScenar('   ', 1000, 100, 2, 3)
    expect(useSporiciSimulatorStore.getState().scenare).toHaveLength(0)
  })

  it('smazatScenar odstraní jen scénář se zadaným id', () => {
    useSporiciSimulatorStore.getState().ulozitScenar('A', 100, 10, 1, 1)
    useSporiciSimulatorStore.getState().ulozitScenar('B', 200, 20, 2, 2)
    const id = useSporiciSimulatorStore.getState().scenare.find((s) => s.nazev === 'A')!.id

    useSporiciSimulatorStore.getState().smazatScenar(id)

    const zbyle = useSporiciSimulatorStore.getState().scenare
    expect(zbyle).toHaveLength(1)
    expect(zbyle[0].nazev).toBe('B')
  })
})
