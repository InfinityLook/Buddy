import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useModulovyPrechod } from '@/core/navigation/useModulovyPrechod'

// ==========================================
// core/navigation/useModulovyPrechod.ts — appka tu novou třetí `smer`
// možnost potřebuje pro Room-to-Room swipe/šipky (FlagshipShell.tsx),
// kde na rozdíl od appčina staršího jednosměrného Hub -> Social kroku
// musí umět obě strany. jsdom document.startViewTransition vůbec
// nemá, takže appka ho tu jednoduše zamockuje a ověří jen appčinu
// vlastní logiku (nastavení/smazání atributu), ne prohlížečovu
// animaci samotnou — tu jde ověřit jen skutečným Chromiem.
// ==========================================

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(MemoryRouter, null, children)

afterEach(() => {
  document.documentElement.removeAttribute('data-prechod-smer')
  // @ts-expect-error — appka tu jen v testu maže vlastní mock, ne skutečné API.
  delete document.startViewTransition
  vi.restoreAllMocks()
})

describe('useModulovyPrechod — směrový atribut pro Room swipe', () => {
  it('výchozí "vpravo" nikdy atribut nenastaví (appčino starší Hub -> Social chování beze změny)', async () => {
    let zachytUpdate: (() => void) | null = null
    // @ts-expect-error — jsdom nemá, appka si ho pro test dodá sama.
    document.startViewTransition = vi.fn((update: () => void) => {
      zachytUpdate = update
      return { finished: Promise.resolve() }
    })

    const { result } = renderHook(() => useModulovyPrechod(), { wrapper })
    await act(async () => {
      result.current('/apps')
      zachytUpdate?.()
    })

    expect(document.documentElement.getAttribute('data-prechod-smer')).toBeNull()
  })

  it('smer "vlevo" nastaví atribut PŘED spuštěním přechodu a smaže ho, jakmile přechod skutečně doběhne', async () => {
    let atributTehdyKdyzSeSpustilPrechod: string | null = null
    // @ts-expect-error — jsdom nemá, appka si ho pro test dodá sama.
    document.startViewTransition = vi.fn((update: () => void) => {
      atributTehdyKdyzSeSpustilPrechod = document.documentElement.getAttribute('data-prechod-smer')
      update()
      return { finished: Promise.resolve() }
    })

    const { result } = renderHook(() => useModulovyPrechod(), { wrapper })
    await act(async () => {
      result.current('/economy', undefined, 'vlevo')
    })

    expect(atributTehdyKdyzSeSpustilPrechod).toBe('vlevo')
    // Po doběhnutí (transition.finished) appka atribut zase smaže,
    // ať nezůstane trvale viset na <html> a neovlivní příští přechod.
    expect(document.documentElement.getAttribute('data-prechod-smer')).toBeNull()
  })

  it('bez podpory View Transitions API prostě naviguje, žádný atribut se vůbec nedotkne', async () => {
    const { result } = renderHook(() => useModulovyPrechod(), { wrapper })
    expect(() => {
      result.current('/growth', undefined, 'vlevo')
    }).not.toThrow()
    expect(document.documentElement.getAttribute('data-prechod-smer')).toBeNull()
  })
})
