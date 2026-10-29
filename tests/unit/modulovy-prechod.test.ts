import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useModulovyPrechod } from '@/core/navigation/useModulovyPrechod'

// ==========================================
// core/navigation/useModulovyPrechod.ts — appka tenhle hook zjednodušila
// zpátky na jednosměrnou verzi (appka druhý, "vlevo" směr odstranila
// spolu s šipkami mezi vlajkovými Roomy, viz AppBottomNav.tsx/
// FlagshipShell.tsx). Appka tu ověřuje jen svou vlastní logiku (kdy
// zabalí navigate() do startViewTransition a kdy spadne na obyčejnou
// navigaci), ne prohlížečovu animaci samotnou — tu jde ověřit jen
// skutečným Chromiem. jsdom document.startViewTransition vůbec nemá,
// takže appka ho tu podle potřeby sama zamockuje/smaže.
// ==========================================

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(MemoryRouter, null, children)

afterEach(() => {
  // @ts-expect-error — appka tu jen v testu maže vlastní mock, ne skutečné API.
  delete document.startViewTransition
  vi.restoreAllMocks()
})

describe('useModulovyPrechod — zjednodušený jednosměrný přechod', () => {
  it('s podporou View Transitions zabalí navigaci do startViewTransition()', async () => {
    let zavolanoSUpdatem: (() => void) | null = null
    const mock = vi.fn((update: () => void) => {
      zavolanoSUpdatem = update
      return { finished: Promise.resolve() }
    })
    // @ts-expect-error — jsdom nemá, appka si ho pro test dodá sama.
    document.startViewTransition = mock

    const { result } = renderHook(() => useModulovyPrechod(), { wrapper })
    await act(async () => {
      result.current('/apps')
    })

    expect(mock).toHaveBeenCalledTimes(1)
    expect(zavolanoSUpdatem).not.toBeNull()
  })

  it('bez podpory View Transitions API prostě naviguje, žádnou chybu nevyhodí', async () => {
    const { result } = renderHook(() => useModulovyPrechod(), { wrapper })
    expect(() => {
      result.current('/growth')
    }).not.toThrow()
  })

  it('volá se dál i s druhým argumentem (NavigateOptions), beze změny chování', async () => {
    const mock = vi.fn((update: () => void) => {
      update()
      return { finished: Promise.resolve() }
    })
    // @ts-expect-error — jsdom nemá, appka si ho pro test dodá sama.
    document.startViewTransition = mock

    const { result } = renderHook(() => useModulovyPrechod(), { wrapper })
    await act(async () => {
      result.current('/economy', { replace: true })
    })

    expect(mock).toHaveBeenCalledTimes(1)
  })
})
