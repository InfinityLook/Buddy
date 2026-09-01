import { useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, type NavigateOptions } from 'react-router-dom'

// ==========================================
// Fáze 2 Social nav reworku — sdílený hook pro přechod mezi hlavními
// moduly appky (dnes jen Hub → Social/Chat, viz Hub.tsx). Postaveno na
// View Transitions API (document.startViewTransition), ne na knihovně —
// prohlížeč to umí sám zdarma, appka jen zabalí navigate() dovnitř.
// Samotný vzhled ("Posun", vybraný z náhledu se 6 variantami) je čistě
// CSS (styles/global.css's ::view-transition-old/-new(root)) — tenhle
// hook se o to, jak přechod vypadá, vůbec nestará, jen ho spustí.
//
// flushSync() je nutný: startViewTransition() vyfotí "starou" stránku
// synchronně před zavoláním callbacku a "novou" hned po jeho doběhnutí,
// ale React normálně stav aktualizuje asynchronně (batching) — bez
// flushSync by prohlížeč vyfotil DOM dřív, než React stihne přemalovat
// na cílovou obrazovku, a "nová" fotka by byla shodná se starou.
//
// Bez podpory (starší Safari, testovací prostředí) nebo při
// prefers-reduced-motion spadne rovnou na obyčejné navigate() — appka
// dál funguje úplně stejně, jen bez animace, stejné "postupné
// vylepšení" chování jako u Vzhledu aplikace nebo Badging API v
// docs/napady-a-plan.md.
export const useModulovyPrechod = () => {
  const navigate = useNavigate()

  return useCallback(
    (cesta: string, options?: NavigateOptions) => {
      const podporujeViewTransition =
        typeof document !== 'undefined' && typeof document.startViewTransition === 'function'
      const chceMeneAnimaci =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

      if (!podporujeViewTransition || chceMeneAnimaci) {
        navigate(cesta, options)
        return
      }

      document.startViewTransition(() => {
        flushSync(() => navigate(cesta, options))
      })
    },
    [navigate]
  )
}
