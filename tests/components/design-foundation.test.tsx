import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAppStore } from '@/core/store/useAppStore'
import { AppearancePicker } from '@/features/appearance/AppearancePicker'
import { useAppearanceStore } from '@/features/appearance/useAppearanceStore'
import { usePomodoroStatus } from '@/miniapps/pomodoro/usePomodoro'
import AppModule from '@/pages/app/AppModule'
import RoomsModule from '@/pages/rooms/RoomsModule'

vi.mock('@/pages/profil/hooks/useProfileData', () => ({
  useProfileData: () => ({ profile: { readNotifications: [], avatar: '' }, markNotificationRead: vi.fn() }),
}))
vi.mock('@/pages/profil/components/ProfilNotifications', () => ({
  ProfilNotifications: () => null,
  useNotificationItems: () => [],
}))
// Vitest's Vite config doesn't include the production PWA plugin.
vi.mock('@/core/utils/registerSW', () => ({
  APP_BUILD_ID: 'test',
  getServiceWorkerRegistration: vi.fn(),
}))
vi.mock('@/features/miniapps/registry', () => ({
  MINI_APP_REGISTRY: {
    kalendar: () => <p>Obsah kalendáře</p>,
    pomodoro: ({ onBack }: { onBack?: () => void }) => <button onClick={onBack}>Zpět z Pomodora</button>,
    'study-planner': ({ onBack }: { onBack?: () => void }) => <button onClick={onBack}>Zpět z Plánovače</button>,
  },
}))

beforeEach(() => {
  useAppStore.getState().setActiveAppId(null)
  useAppearanceStore.getState().resetAppearance()
})

afterEach(() => {
  cleanup()
  useAppStore.getState().setActiveAppId(null)
  useAppearanceStore.getState().resetAppearance()
})

describe('Buddy P0', () => {
  it('applies the global theme from Rooms while preserving the launcher override', () => {
    const appearance = useAppearanceStore.getState()
    appearance.setSurfaceTheme('apps-launcher', 'neonova-noc')

    const { container } = render(<MemoryRouter><RoomsModule /></MemoryRouter>)
    const rooms = container.querySelector('.rooms-page')
    const menu = screen.getByLabelText(/^Motiv Rooms/)
    const details = menu.closest('details')
    expect(rooms).toHaveAttribute('data-buddy-theme', 'neonova-noc')

    if (details) details.open = true
    const choices = screen.getByRole('group', { name: 'Náhled motivu' })
    fireEvent.click(within(choices).getByRole('button', { name: 'Čistý den' }))
    expect(rooms).toHaveAttribute('data-buddy-theme', 'cisty-den')
    expect(useAppearanceStore.getState().globalThemeId).toBe('zlaty-soumrak')

    fireEvent.click(screen.getByRole('button', { name: 'Použít v celé aplikaci' }))
    expect(useAppearanceStore.getState().globalThemeId).toBe('cisty-den')
    expect(useAppearanceStore.getState().surfaceOverrides['apps-launcher']).toBe('neonova-noc')
    expect(rooms).toHaveAttribute('data-buddy-theme', 'neonova-noc')
    expect(details).not.toHaveAttribute('open')
    expect(menu).toHaveFocus()
  })

  it('themes the shell around a generic miniapp and returns to its opening route', () => {
    useAppearanceStore.getState().setGlobalTheme('cisty-den')
    useAppearanceStore.getState().setSurfaceTheme('kalendar', 'polarni-zare')
    useAppStore.getState().setActiveAppId('kalendar', '/skola')

    const { container } = render(
      <MemoryRouter initialEntries={['/apps']}>
        <Routes>
          <Route path="/apps" element={<AppModule />} />
          <Route path="/skola" element={<h1>School Room</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    const shell = container.querySelector('.app-fullscreen-view')
    expect(shell).toHaveAttribute('data-buddy-surface', 'kalendar')
    expect(shell).toHaveAttribute('data-buddy-theme', 'polarni-zare')
    expect(screen.getByRole('navigation', { name: 'Hlavní navigace' })).toHaveClass('app-bottom-nav--edge')
    fireEvent.click(screen.getByRole('button', { name: 'Zpět' }))
    expect(screen.getByRole('heading', { name: 'School Room' })).toBeInTheDocument()
    expect(useAppStore.getState().activeAppId).toBeNull()
  })

  it('returns from Pomodoro through the planner before closing to School Room', () => {
    useAppStore.getState().setActiveAppId('pomodoro', '/skola')
    usePomodoroStatus.setState({ returnToPlanner: true })

    render(
      <MemoryRouter initialEntries={['/apps']}>
        <Routes>
          <Route path="/apps" element={<AppModule />} />
          <Route path="/skola" element={<h1>School Room</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Zpět z Pomodora' }))
    expect(useAppStore.getState().activeAppId).toBe('study-planner')
    expect(usePomodoroStatus.getState().returnToPlanner).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Zpět z Plánovače' }))
    expect(screen.getByRole('heading', { name: 'School Room' })).toBeInTheDocument()
  })

  it('preserves stored scenery when the view only supports choosing colors', () => {
    useAppearanceStore.getState().setSurfaceScenery('kalendar', true)
    render(<AppearancePicker wiredSurfaceIds={['kalendar']} scenerySurfaceIds={[]} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'kalendar' } })
    expect(screen.queryByRole('checkbox', { name: /Scénické pozadí/ })).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: /Čistý den/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Použít motiv' }))
    expect(useAppearanceStore.getState().surfaceOverrides.kalendar).toBe('cisty-den')
    expect(useAppearanceStore.getState().sceneryOverrides.kalendar).toBe(true)
  })
})
