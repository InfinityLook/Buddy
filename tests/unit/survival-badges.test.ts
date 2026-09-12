import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, RenderHookResult } from '@testing-library/react'
import { useSurvivalEngine } from '@/survival/useSurvivalEngine'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { RANGER } from '@/survival/data/postavy'
import type { SurvivalHerniStav } from '@/survival/types'

// `stavRef` je typované jako React.RefObject<SurvivalHerniStav>, a
// React sám typuje `.current` na takovým objektu jako `T | null` bez
// ohledu na to, že appka ho v praxi vždycky vytváří s neprázdnou
// počáteční hodnotou (viz useSurvivalEngine.ts's vlastní komentář) —
// tenhle malý helper je jediné místo, kde appka tenhle typový rozdíl
// řeší, ať test samotný zůstává čitelný.
const stav = (result: RenderHookResult<ReturnType<typeof useSurvivalEngine>, unknown>['result']): SurvivalHerniStav => {
  const s = result.current.stavRef.current
  if (!s) throw new Error('stavRef.current je null')
  return s
}

// ==========================================
// Bod 21 zadání (odznaky) — appčino "co dál tam chybí" bod 7: appka
// odjakživa měla kód pro Survivor/Impossible/Night Legend v
// useSurvivalEngine.ts's krok() callbacku, ale žádný test (permanentní
// ani dočasný) ho nikdy nezavolal, takže "Night Legend se odemkne na
// vlně 100" bylo tvrzení, které nikdo nikdy skutečně neověřil —
// CLAUDE.md to poctivě přiznávalo jako "present in code, just never
// actually reached in testing".
//
// Appka NEsimuluje celý běh přes 100 vln tiknutí po tiknutí (to by
// znamenalo tisíce reálných krokHry() volání jen kvůli počítání vln) —
// místo toho, stejně jako engine.ts's vlastní testy dělají přímo se
// stav objektem, appka natvrdo posune stavRef.current.vlna a zavolá
// krok() jednou, ať se spustí přesně ta logika (badge-check blok v
// useSurvivalEngine.ts), co appku doopravdy zajímá — krokHry() sama
// vlnu nikdy neresetuje ani nepřepočítává zpětně, takže tohle věrně
// odpovídá "hráč skutečně dosáhl týhle vlny", jen bez zbytečného
// simulování cesty tam.
//
// useSurvivalEngine je React hook (useCallback/useRef/useState), takže
// appka ho musí spustit přes renderHook — ne přímo jako čistou funkci,
// jako to jde u combat/engine.ts.
// ==========================================

const vychoziStav = useGamificationStore.getState()

const resetGamifikaci = () => {
  useGamificationStore.setState({
    xp: 0,
    level: 1,
    streakDays: 0,
    lastActiveDate: null,
    badges: vychoziStav.badges.map((b) => ({ ...b, unlockedAt: null })),
    counters: {},
  })
}

const odznak = (id: string) => useGamificationStore.getState().badges.find((b) => b.id === id)

beforeEach(() => {
  resetGamifikaci()
})

describe('useSurvivalEngine — odznaky za dosaženou vlnu (bod 21 zadání)', () => {
  it('Survivor se odemkne, jakmile stav.vlna přesáhne 10', () => {
    const { result } = renderHook(() => useSurvivalEngine(RANGER))
    expect(odznak('survivor')?.unlockedAt).toBeNull()

    act(() => {
      stav(result).vlna = 11
      result.current.krok(0)
    })

    expect(odznak('survivor')?.unlockedAt).not.toBeNull()
    expect(odznak('impossible')?.unlockedAt).toBeNull()
    expect(odznak('night_legend')?.unlockedAt).toBeNull()
  })

  it('Impossible se odemkne, jakmile stav.vlna přesáhne 50', () => {
    const { result } = renderHook(() => useSurvivalEngine(RANGER))

    act(() => {
      stav(result).vlna = 51
      result.current.krok(0)
    })

    expect(odznak('impossible')?.unlockedAt).not.toBeNull()
    expect(odznak('night_legend')?.unlockedAt).toBeNull()
  })

  it('Night Legend se odemkne, jakmile stav.vlna přesáhne 100 — appka to tímhle testem doopravdy poprvé ověřuje', () => {
    const { result } = renderHook(() => useSurvivalEngine(RANGER))

    act(() => {
      stav(result).vlna = 101
      result.current.krok(0)
    })

    const badge = odznak('night_legend')
    expect(badge?.unlockedAt).not.toBeNull()
    // A všechny nižší mezníky odemkne taky — appka je nekontroluje
    // exkluzivně, každá podmínka platí nezávisle (viz jejich `if`y
    // vedle sebe v useSurvivalEngine.ts).
    expect(odznak('survivor')?.unlockedAt).not.toBeNull()
    expect(odznak('impossible')?.unlockedAt).not.toBeNull()
  })

  it('vlna přesně 100 (ne 101) Night Legend ještě neodemkne — appka kontroluje "přesáhla", ne "dosáhla"', () => {
    const { result } = renderHook(() => useSurvivalEngine(RANGER))

    act(() => {
      stav(result).vlna = 100
      result.current.krok(0)
    })

    expect(odznak('night_legend')?.unlockedAt).toBeNull()
    // 100 > 50 pořád platí, Impossible odemčený být má.
    expect(odznak('impossible')?.unlockedAt).not.toBeNull()
  })

  it('opakované volání krok() na vlně nad 100 neodemyká odznak podruhé (unlockBadge samo o sobě je idempotentní)', () => {
    const { result } = renderHook(() => useSurvivalEngine(RANGER))

    act(() => {
      stav(result).vlna = 101
      result.current.krok(0)
    })
    const prvniOdemceni = odznak('night_legend')?.unlockedAt

    act(() => {
      result.current.krok(0)
    })
    expect(odznak('night_legend')?.unlockedAt).toBe(prvniOdemceni)
  })
})
