// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

// Kalendar.tsx (přímo, i přes useStudyPlanner.ts) importuje
// core/utils/notify.ts -> registerSW.ts's Vite-only virtual:pwa-register
// modul, co Vitest's vlastní Vite instance neumí vyřešit (stejný důvod,
// proč tohle musí zamockovat i QuickNotes's vlastní komponentový test).
// useRozvrh/useStudyPlanner/useAppStore/useSurfaceAppearance samy žádnou
// takovou závislost nemají - běží reálně.
vi.mock('@/core/utils/notify', () => ({
  requestNotificationPermission: vi.fn(),
  notificationsEnabled: () => false,
  showAppNotification: vi.fn(),
}))

const { Kalendar } = await import('@/miniapps/kalendar/Kalendar')
const { useKalendarStore } = await import('@/miniapps/kalendar/useKalendar')

// jsdom neimplementuje <dialog>'s showModal()/close() - Kalendar.tsx's
// vlastní Modal komponenta oba volá ve svém useEffectu.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
}

beforeEach(() => {
  localStorage.clear()
  useKalendarStore.setState({ udalosti: [], barvyDniZaznamy: [] })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Kalendar komponenta: celý tok vytvoření -> program/hledání -> úprava -> smazání', () => {
  it('vytvoří jednorázovou událost, najde ji v Programu, upraví název a smaže přes potvrzení', async () => {
    render(<Kalendar />)

    fireEvent.click(screen.getByRole('button', { name: '+ Událost' }))

    const nazev = screen.getByLabelText('Název')
    fireEvent.change(nazev, { target: { value: 'Zubař' } })

    // Odškrtnutím "Celodenní" se objeví časová pole, ať appka ověří, že
    // se čas i skutečně uloží.
    fireEvent.click(screen.getByLabelText('Celodenní'))
    fireEvent.change(screen.getByLabelText('Čas od'), { target: { value: '14:30' } })

    fireEvent.click(screen.getByRole('button', { name: 'Uložit událost' }))

    expect(useKalendarStore.getState().udalosti).toHaveLength(1)
    const ulozena = useKalendarStore.getState().udalosti[0]
    expect(ulozena.nazev).toBe('Zubař')
    expect(ulozena.celodenni).toBe(false)
    expect(ulozena.casOd).toBe('14:30')

    // Přepnutí na Program zobrazí následujících 14 dní včetně dneška -
    // nová jednorázová událost založená na dnešek se tam musí objevit.
    fireEvent.click(screen.getByRole('button', { name: 'Program' }))
    expect(screen.getByText('Zubař')).toBeInTheDocument()

    // Hledání v programu - cizí dotaz žádnou položku nenajde.
    const hledani = screen.getByPlaceholderText('Hledat v programu…')
    fireEvent.change(hledani, { target: { value: 'neexistuje' } })
    expect(screen.queryByText('Zubař')).not.toBeInTheDocument()

    fireEvent.change(hledani, { target: { value: 'zub' } })
    expect(screen.getByText('Zubař')).toBeInTheDocument()

    // Otevření "⋯" a úprava názvu.
    fireEvent.click(screen.getByRole('button', { name: 'Možnosti: Zubař' }))
    fireEvent.click(screen.getByRole('button', { name: 'Upravit událost' }))

    const nazevUpravy = screen.getByLabelText('Název')
    fireEvent.change(nazevUpravy, { target: { value: 'Zubař - kontrola' } })
    fireEvent.click(screen.getByRole('button', { name: 'Uložit událost' }))

    expect(useKalendarStore.getState().udalosti[0].nazev).toBe('Zubař - kontrola')
    expect(screen.getByText('Zubař - kontrola')).toBeInTheDocument()

    // Smazání - window.confirm musí appka reálně zavolat (a dodržet jeho
    // výsledek), ne jen potichu smazat.
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Možnosti: Zubař - kontrola' }))
    fireEvent.click(screen.getByRole('button', { name: 'Smazat událost' }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(useKalendarStore.getState().udalosti[0].deletedAt).not.toBeNull()
    expect(screen.queryByText('Zubař - kontrola')).not.toBeInTheDocument()
  })

  it('zrušení potvrzovacího dialogu událost nesmaže', async () => {
    render(<Kalendar />)

    fireEvent.click(screen.getByRole('button', { name: '+ Událost' }))
    fireEvent.change(screen.getByLabelText('Název'), { target: { value: 'Oslava' } })
    fireEvent.click(screen.getByRole('button', { name: 'Uložit událost' }))

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: 'Možnosti: Oslava' }))
    fireEvent.click(screen.getByRole('button', { name: 'Smazat událost' }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(useKalendarStore.getState().udalosti[0].deletedAt).toBeNull()
  })

  it('barva dne se uloží a projeví se jako data-color na dnešní buňce v měsíčním pohledu', async () => {
    render(<Kalendar />)

    const vyberBarvy = screen.getByLabelText('Barva dne')
    fireEvent.change(vyberBarvy, { target: { value: 'green' } })

    expect(useKalendarStore.getState().barvyDniZaznamy.some(
      z => z.barva === 'green' && !z.deletedAt
    )).toBe(true)

    const dnesniBunka = screen.getByRole('button', { current: 'date' })
    expect(dnesniBunka).toHaveAttribute('data-color', 'green')

    // "Bez barvy" musí appka zase skutečně odebrat, ne jen ignorovat.
    fireEvent.change(vyberBarvy, { target: { value: '' } })
    expect(dnesniBunka).not.toHaveAttribute('data-color')
  })

  it('odmítne uložit událost jen s mezerami v názvu a formulář nezavře', async () => {
    render(<Kalendar />)

    fireEvent.click(screen.getByRole('button', { name: '+ Událost' }))
    // required="" na "Název" by samotné jsdom's submit zablokovalo
    // (jsdom HTML5 required skutečně respektuje) - appčina vlastní
    // ulozit() ale sama ořezává (.trim()), takže jen-mezery musí
    // odmítnout její vlastní kontrola, ne browserové required.
    fireEvent.change(screen.getByLabelText('Název'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Uložit událost' }))

    expect(screen.getByText('Vyplň název události.')).toBeInTheDocument()
    expect(useKalendarStore.getState().udalosti).toHaveLength(0)
    // Dialog zůstal otevřený (formulář se nezavřel).
    expect(screen.getByLabelText('Název')).toBeInTheDocument()
  })

  it('export ICS je dostupný jen když existuje alespoň jedna (nesmazaná) událost', async () => {
    render(<Kalendar />)

    expect(screen.getByRole('button', { name: 'Export ICS' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: '+ Událost' }))
    fireEvent.change(screen.getByLabelText('Název'), { target: { value: 'Výlet' } })
    fireEvent.click(screen.getByRole('button', { name: 'Uložit událost' }))

    expect(screen.getByRole('button', { name: 'Export ICS' })).not.toBeDisabled()
  })
})
