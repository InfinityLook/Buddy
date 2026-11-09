import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

vi.mock('@/core/utils/notify', () => ({
  notificationsEnabled: () => false,
  showAppNotification: vi.fn(),
}))

vi.mock('@/core/utils/push', () => ({
  nahlasPomodoroCasovac:
    vi.fn().mockResolvedValue(undefined),
  zrusPomodoroCasovac:
    vi.fn().mockResolvedValue(undefined),
}))

import {
  getPomodoroState,
  usePomodoroStore,
  spustitSoustredeniUkolu,
} from '@/miniapps/pomodoro/usePomodoro'
import {
  zrusPomodoroCasovac,
} from '@/core/utils/push'
import {
  useGamificationStore,
} from '@/core/store/useGamificationStore'
import {
  DEFAULT_SETTINGS,
  localDay,
} from '@/miniapps/pomodoro/types'

beforeEach(() => {
  vi.useFakeTimers()

  vi.setSystemTime(
    new Date('2026-11-09T12:00:00Z')
  )

  getPomodoroState().resetTimer()

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
  })

  vi.spyOn(
    useGamificationStore.getState(),
    'recordAction'
  ).mockImplementation(() => {})

  vi.clearAllMocks()
})

afterEach(() => {
  getPomodoroState().resetTimer()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Pomodoro – skutečný blok', () => {
  it(
    'běžící blok zachová 25 minut i odměnu při změně předvolby na 90',
    () => {
      getPomodoroState().start()

      const end =
        getPomodoroState().endsAt

      getPomodoroState().updateSettings({
        work: 90,
      })

      expect(
        getPomodoroState().endsAt
      ).toBe(end)

      vi.advanceTimersByTime(1500001)

      expect(
        getPomodoroState()
          .sessionLog[0].minuty
      ).toBe(25)

      expect(
        useGamificationStore.getState()
          .recordAction
      ).toHaveBeenCalledWith(
        'pomodoro',
        15
      )
    }
  )

  it(
    'změna zvuku zachová rozpracovaných 15 minut i při pauze',
    () => {
      getPomodoroState().start()

      vi.advanceTimersByTime(600000)

      getPomodoroState().pause()

      const blockId =
        getPomodoroState().block!.id

      getPomodoroState().updateSettings({
        soundEnabled: false,
      })

      expect(
        getPomodoroState().remainingSeconds
      ).toBe(900)

      getPomodoroState().start()

      expect(
        getPomodoroState().block!.id
      ).toBe(blockId)

      vi.advanceTimersByTime(900001)

      expect(
        getPomodoroState().completedSessions
      ).toBe(1)
    }
  )

  it(
    'jiný režim ruší oznámení konkrétního starého bloku',
    () => {
      getPomodoroState().start()

      const id =
        getPomodoroState().block!.id

      getPomodoroState().switchMode(
        'shortBreak'
      )

      expect(
        zrusPomodoroCasovac
      ).toHaveBeenCalledWith(id)

      expect(
        getPomodoroState()
      ).toMatchObject({
        isRunning: false,
        block: null,
        remainingSeconds: 300,
      })
    }
  )

  it(
    'předčasné a opakované dokončení nepřipíše blok ani odměnu navíc',
    () => {
      getPomodoroState().start()
      getPomodoroState().complete()

      expect(
        getPomodoroState().completedSessions
      ).toBe(0)

      vi.advanceTimersByTime(1500001)

      getPomodoroState().complete()

      expect(
        getPomodoroState().completedSessions
      ).toBe(1)

      expect(
        useGamificationStore.getState()
          .recordAction
      ).toHaveBeenCalledTimes(1)
    }
  )

  it(
    'blok drží původní přiřazení a odmítne jiný úkol během pauzy',
    () => {
      expect(
        spustitSoustredeniUkolu(
          'task-one',
          'První'
        )
      ).toBe(true)

      vi.advanceTimersByTime(1000)

      getPomodoroState().pause()

      getPomodoroState()
        .setAktivniPredmet('Jiný')

      expect(
        spustitSoustredeniUkolu(
          'task-two',
          'Druhý'
        )
      ).toBe(false)

      expect(
        getPomodoroState().block
      ).toMatchObject({
        taskId: 'task-one',
        title: 'První',
      })
    }
  )

  it(
    'ořez historie nesmaže denní součty',
    () => {
      const log = Array.from(
        { length: 300 },
        (_, index) => ({
          at: Date.now(),
          minuty: 25,
          predmet: null,
          id: String(index),
        })
      )

      usePomodoroStore.setState({
        sessionLog: log,
        dailyTotals: {
          [localDay()]: {
            minuty: 7500,
            bloky: 300,
          },
        },
        completedSessions: 300,
      })

      getPomodoroState().start()

      vi.advanceTimersByTime(1500001)

      expect(
        getPomodoroState().sessionLog
      ).toHaveLength(300)

      expect(
        getPomodoroState()
          .dailyTotals[localDay()]
      ).toEqual({
        minuty: 7525,
        bloky: 301,
      })
    }
  )

  it(
    'po dlouhém odložení nevymýšlí další bloky a připíše čas ke dni skutečného konce',
    () => {
      getPomodoroState().updateSettings({
        autoStartNextPhase: true,
      })

      getPomodoroState().start()

      const dueDay = localDay(
        getPomodoroState().endsAt!
      )

      vi.setSystemTime(
        Date.now() + 86400000
      )

      getPomodoroState().complete()

      expect(
        getPomodoroState().completedSessions
      ).toBe(1)

      expect(
        getPomodoroState().isRunning
      ).toBe(false)

      expect(
        getPomodoroState()
          .dailyTotals[dueDay].bloky
      ).toBe(1)
    }
  )
})

describe(
  'Pomodoro – obnova a selhání úložiště',
  () => {
    it(
      'poškozená data nenahradí akce storu ani nepřijmou neplatné délky',
      async () => {
        const { secureStorage } =
          await import(
            '@/core/utils/secureStorage'
          )

        secureStorage.setItem(
          'schoolbuddy-pomodoro-storage',
          JSON.stringify({
            state: {
              settings: {
                work: -100,
                shortBreak: 'x',
              },
              mode: 'broken',
              start: 'broken',
              completedSessions: -1,
              sessionLog: [
                null,
                {
                  at: 1,
                  minuty: -2,
                  predmet: null,
                },
              ],
            },
            version: 0,
          })
        )

        await usePomodoroStore
          .persist.rehydrate()

        expect(
          typeof getPomodoroState().start
        ).toBe('function')

        expect(
          getPomodoroState().settings
        ).toMatchObject({
          work: 5,
          shortBreak: 5,
        })

        expect(
          getPomodoroState().sessionLog
        ).toEqual([])

        expect(
          getPomodoroState().mode
        ).toBe('work')
      }
    )

    it(
      'při plném úložišti neoznámí úspěšné spuštění',
      () => {
        const spy = vi
          .spyOn(
            Storage.prototype,
            'setItem'
          )
          .mockImplementation(() => {
            throw new DOMException(
              'Quota',
              'QuotaExceededError'
            )
          })

        try {
          expect(() =>
            getPomodoroState().start()
          ).toThrow(
            'Zápis Pomodora selhal'
          )

          expect(
            getPomodoroState().isRunning
          ).toBe(false)
        } finally {
          spy.mockRestore()
        }
      }
    )
  }
)
