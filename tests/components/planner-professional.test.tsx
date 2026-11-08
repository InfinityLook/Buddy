import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
vi.mock('@/core/utils/notify', () => ({ notificationsEnabled: () => false, requestNotificationPermission: vi.fn(), showAppNotification: vi.fn() }))
vi.mock('@/core/utils/push', () => ({ nahlasPomodoroCasovac: vi.fn(), zajistiPushPrihlaseni: vi.fn(), zrusPomodoroCasovac: vi.fn() }))
import { StudyPlanner } from '@/miniapps/study-planner/StudyPlanner'
import { usePlannerView, useStudyPlannerStore } from '@/miniapps/study-planner/useStudyPlanner'
import { useAppearanceStore } from '@/features/appearance/useAppearanceStore'
import { THEME_IDS } from '@/features/appearance/themeCatalog'
import { todayIso } from '@/miniapps/study-planner/types'
const seed = (patch = {}) => ({ id: 'task', topic: 'Připravit prezentaci', subject: 'Biologie', dueDate: todayIso(), priority: 'Střední' as const, completed: false, createdAt: new Date().toISOString(), updatedAt: 100, deletedAt: null, ...patch })
beforeEach(() => {
  useStudyPlannerStore.setState({ tasks: [] })
  usePlannerView.setState({ view: 'dnes', day: todayIso(), detailId: null, focusTaskId: null, focusReturnPath: null })
  useAppearanceStore.getState().resetAppearance()
  // jsdom nemá implementaci nativního modálního dialogu.
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers() })

describe('Planner UI', () => {
  it.each(THEME_IDS)('inherits %s on both the main view and portal detail', theme => {
    useAppearanceStore.getState().setGlobalTheme(theme)
    render(<StudyPlanner />)
    expect(document.querySelector('.sp-app')).toHaveAttribute('data-buddy-theme', theme)
    fireEvent.click(screen.getByRole('button', { name: 'Přidat úkol' }))
    expect(screen.getByRole('dialog')).toHaveAttribute('data-buddy-theme', theme)
  })
  it('keeps the form open on missing title and saves an inbox task without a subject', () => {
    usePlannerView.setState({ view: 'vse' })
    render(<StudyPlanner />)
    fireEvent.click(screen.getByRole('button', { name: 'Přidat úkol' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.submit(dialog.querySelector('form')!)
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Napiš název')
    fireEvent.change(within(dialog).getByLabelText('Co potřebuješ udělat?'), { target: { value: 'Nápad bez termínu' } })
    fireEvent.submit(dialog.querySelector('form')!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useStudyPlannerStore.getState().tasks[0]).toMatchObject({ topic: 'Nápad bez termínu', dueDate: '', planDate: null, subject: '' })
    expect(screen.getByRole('button', { name: 'Nápad bez termínu' })).toBeInTheDocument()
  })
  it('shows the deadline even when work is planned for another day', () => {
    useStudyPlannerStore.setState({ tasks: [seed({ planDate: '2099-12-31' })] })
    render(<StudyPlanner />)
    expect(screen.getByRole('region', { name: 'Termíny tohoto dne' })).toHaveTextContent('Připravit prezentaci')
  })
  it('changes selected day without moving to another week and can navigate weeks', () => {
    render(<StudyPlanner />)
    fireEvent.click(screen.getByRole('button', { name: 'Další týden' }))
    expect(usePlannerView.getState().day).not.toBe(todayIso())
    fireEvent.click(screen.getByRole('button', { name: 'Zpět na dnešek' }))
    expect(usePlannerView.getState().day).toBe(todayIso())
  })
  it('autosaves notes and steps, and can undo deletion with all detail data retained', async () => {
    vi.useFakeTimers()
    useStudyPlannerStore.setState({ tasks: [seed()] })
    render(<StudyPlanner />)
    fireEvent.click(screen.getByRole('button', { name: 'Připravit prezentaci' }))
    fireEvent.change(screen.getByLabelText('Nový krok'), { target: { value: 'Najít zdroje' } })
    fireEvent.click(screen.getByRole('button', { name: 'Přidat krok' }))
    expect(useStudyPlannerStore.getState().tasks[0].podukoly?.[0].text).toBe('Najít zdroje')
    fireEvent.change(screen.getByLabelText('Poznámka'), { target: { value: 'Tři kvalitní zdroje' } })
    await act(async () => { vi.advanceTimersByTime(700) })
    expect(useStudyPlannerStore.getState().tasks[0].poznamka).toBe('Tři kvalitní zdroje')
    fireEvent.click(screen.getByRole('button', { name: 'Smazat úkol' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Vrátit' }))
    expect(useStudyPlannerStore.getState().tasks[0]).toMatchObject({ deletedAt: null, poznamka: 'Tři kvalitní zdroje' })
    vi.useRealTimers()
  })
  it('searches without accents and respects the surface theme override', () => {
    useStudyPlannerStore.setState({ tasks: [seed()] })
    useAppearanceStore.getState().setSurfaceTheme('study-planner', 'cisty-den')
    render(<StudyPlanner />)
    fireEvent.click(screen.getByRole('button', { name: 'Hledat úkoly' }))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pripravit' } })
    expect(screen.getByRole('button', { name: 'Připravit prezentaci' })).toBeInTheDocument()
    expect(document.querySelector('.sp-app')).toHaveAttribute('data-buddy-theme', 'cisty-den')
  })
})
