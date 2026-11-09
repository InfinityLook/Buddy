import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'

vi.mock('@/core/utils/notify', () => ({
  notificationsEnabled: () => false,
  showAppNotification: vi.fn(),
}))

vi.mock('@/core/utils/push', () => ({
  nahlasPomodoroCasovac:
    vi.fn().mockResolvedValue(undefined),
  zrusPomodoroCasovac:
    vi.fn().mockResolvedValue(undefined),
  zajistiPushPrihlaseni:
    vi.fn().mockResolvedValue(undefined),
}))

import {
  Pomodoro,
} from '@/miniapps/pomodoro/Pomodoro'
import {
  usePomodoroStore,
  usePomodoroStatus,
  getPomodoroState,
} from '@/miniapps/pomodoro/usePomodoro'
import {
  setRawStudyPlannerState,
} from '@/miniapps/study-planner/useStudyPlanner'
import {
  useAppearanceStore,
} from '@/features/appearance/useAppearanceStore'
import {
  THEME_IDS,
} from '@/features/appearance/themeCatalog'
import {
  DEFAULT_SETTINGS,
} from '@/miniapps/pomodoro/types'

beforeEach(() => {
  usePomodoroStore.setState({
    settings: DEFAULT_SETTINGS,
    mode: 'work',
    remainingSeconds: 1500,
    block: null,
    isRunning: false,
    endsAt: null,
    sessionLog: [],
    completedSessions: 0,
    dailyTotals: {},
    cyclePosition: 0,
    aktivniPredmet: null,
    aktivniUkolId: null,
  })

  usePomodoroStatus.setState({
    error: '',
    finished: null,
    returnToPlanner: false,
  })

  setRawStudyPlannerState({
    tasks: [],
  })

  useAppearanceStore
    .getState()
    .resetAppearance()

  HTMLDialogElement.prototype.showModal =
    function () {
      this.setAttribute('open', '')
    }

  HTMLDialogElement.prototype.close =
    function () {
      this.removeAttribute('open')
    }
})

afterEach(() => {
  cleanup()
  getPomodoroState().resetTimer()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe(
  'Pomodoro – ovládání a motivy',
  () => {
    it.each(THEME_IDS)(
      'použije motiv %s i v nastavení',
      theme => {
        useAppearanceStore
          .getState()
          .setGlobalTheme(theme)

        render(<Pomodoro />)

        expect(
          document.querySelector(
            '.pomodoro-app'
          )
        ).toHaveAttribute(
          'data-buddy-theme',
          theme
        )

        fireEvent.click(
          screen.getByRole('button', {
            name: 'Nastavení časovače',
          })
        )

        expect(
          screen.getByRole('dialog')
        ).toHaveAttribute(
          'data-buddy-theme',
          theme
        )
      }
    )

    it(
      'spustí, pozastaví, pokračuje a při změně režimu vyžádá rozhodnutí',
      () => {
        vi.useFakeTimers()

        render(<Pomodoro />)

        fireEvent.click(
          screen.getByRole('button', {
            name: 'Spustit',
          })
        )

        act(() =>
          vi.advanceTimersByTime(1000)
        )

        fireEvent.click(
          screen.getByRole('button', {
            name: 'Pozastavit',
          })
        )

        expect(
          screen.getByRole('button', {
            name: 'Pokračovat',
          })
        ).toBeInTheDocument()

        fireEvent.click(
          screen.getByRole('button', {
            name: 'Krátká pauza',
          })
        )

        expect(
          screen.getByRole('dialog', {
            name: 'Změnit režim?',
          })
        ).toBeInTheDocument()

        fireEvent.click(
          screen.getByRole('button', {
            name: 'Vrátit se',
          })
        )

        expect(
          getPomodoroState().block
        ).not.toBeNull()
      }
    )

    it(
      'výběr úkolu z Planneru je nepovinný a přiřadí správné id',
      () => {
        setRawStudyPlannerState({
          tasks: [
            {
              id: 'one',
              topic: 'Prezentace',
              subject: 'Marketing',
              priority: 'Střední',
              completed: false,
              dueDate: '',
              createdAt:
                new Date().toISOString(),
              updatedAt: 1,
              deletedAt: null,
            },
          ],
        })

        render(<Pomodoro />)

        fireEvent.click(
          screen.getByRole('button', {
            name:
              /Vybrat úkol nebo činnost/,
          })
        )

        fireEvent.click(
          screen.getByRole('button', {
            name:
              'Prezentace Marketing',
          })
        )

        expect(
          getPomodoroState()
            .aktivniUkolId
        ).toBe('one')

        expect(
          screen.queryByRole('dialog')
        ).not.toBeInTheDocument()
      }
    )

    it(
      'předvolbu uloží až po potvrzení nastavení',
      () => {
        render(<Pomodoro />)

        fireEvent.click(
          screen.getByRole('button', {
            name: 'Nastavení časovače',
          })
        )

        fireEvent.click(
          screen.getByRole('button', {
            name: '50 / 10',
          })
        )

        expect(
          getPomodoroState()
            .settings.work
        ).toBe(25)

        fireEvent.click(
          screen.getByRole('button', {
            name:
              'Uložit nastavení',
          })
        )

        expect(
          getPomodoroState()
            .settings.work
        ).toBe(50)
      }
    )
  }
)
