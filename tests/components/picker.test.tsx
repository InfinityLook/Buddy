// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AppearancePicker } from '@/features/appearance/AppearancePicker'
import { useAppearanceStore } from '@/features/appearance/useAppearanceStore'

beforeEach(() => {
  localStorage.clear()
  useAppearanceStore.getState().resetAppearance()
})
afterEach(cleanup)

describe('appearance picker saves only confirmed choices', () => {
  it('previews and cancels without changing the saved global theme', () => {
    render(<AppearancePicker />)
    fireEvent.click(screen.getByRole('radio', { name: /Čistý den/ }))
    expect(useAppearanceStore.getState().globalThemeId).toBe('zlaty-soumrak')
    fireEvent.click(screen.getByRole('button', { name: 'Zrušit změny' }))
    expect((screen.getByRole('radio', { name: /Zlatý soumrak/ }) as HTMLInputElement).checked).toBe(true)
  })
  it('applies a global theme and leaves the success message visible', () => {
    render(<AppearancePicker />)
    fireEvent.click(screen.getByRole('radio', { name: /Čistý den/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Použít motiv' }))
    expect(useAppearanceStore.getState().globalThemeId).toBe('cisty-den')
    expect(screen.getByRole('status').textContent).toContain('Motiv Čistý den je uložený.')
  })
  it('sets and removes an individual override without modifying the global choice', () => {
    render(<AppearancePicker />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'finance' } })
    fireEvent.click(screen.getByRole('radio', { name: /Lesní klid/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Použít motiv' }))
    expect(useAppearanceStore.getState().surfaceOverrides.finance).toBe('lesni-klid')
    expect(useAppearanceStore.getState().globalThemeId).toBe('zlaty-soumrak')
    fireEvent.click(screen.getByRole('radio', { name: /Podle společného motivu/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Použít motiv' }))
    expect(useAppearanceStore.getState().surfaceOverrides.finance).toBeUndefined()
  })
  it('persists preferences through the existing storage adapter and preserves unrelated content', async () => {
    localStorage.setItem('unrelated-user-draft', 'rozepsaný text')
    useAppearanceStore.getState().setGlobalTheme('neonova-noc')
    useAppearanceStore.getState().setSurfaceTheme('quick-notes', 'lesni-klid')
    const saved = await useAppearanceStore.persist.getOptions().storage?.getItem('buddy-appearance-storage')
    expect(saved?.state).toMatchObject({ globalThemeId: 'neonova-noc', surfaceOverrides: { 'quick-notes': 'lesni-klid' } })
    expect(localStorage.getItem('unrelated-user-draft')).toBe('rozepsaný text')
  })
})
