import { useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, type NavigateOptions } from 'react-router-dom'

// ==========================================
// Fáze 2 Social nav reworku — sdílený hook pro přechod mezi hlavními
// moduly appky (dnes Hub → Social/Chat, viz Hub.tsx, a od tohohle
// commitu i šipky mezi vlajkovými Roomy, viz FlagshipShell.tsx).
// Postaveno na View Transitions API (document.startViewTransition), ne
// na knihovně — prohlížeč to umí sám zdarma, appka jen zabalí
// navigate() dovnitř. Samotný vzhled ("Posun", vybraný z náhledu se 6
// variantami) je čistě CSS (styles/global.css's
// ::view-transition-old/-new(root)) — tenhle hook se o to, jak přechod
// vypadá, vůbec nestará, jen ho spustí.
//
// Třetí argument, `smer`, je nový — Hub → Social zůstává jednosměrný
// (výchozí 'vpravo', beze změny), ale Room-to-Room šipka musí umět
// obě strany (další Room najede zprava, předchozí zleva). Appka
// to řeší jedním atributem na <html> (`data-prechod-smer`), který CSS
// čte přes `:root[data-prechod-smer="vlevo"]::view-transition-*(root)`
// — atributové selektory fungují i na tenhle speciální pseudo-strom
// mimo běžný DOM. Atribut appka drží až do `transition.finished`, ne
// jen do doby, kdy startViewTransition() vrátí řízení — smazat ho dřív
// by mohlo přepsat animaci uprostřed běhu, protože se v tu chvíli
// prohlížeč pořád dívá na aktuální computed style pseudo-elementu.
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
    (cesta: string, options?: NavigateOptions, smer: 'vpravo' | 'vlevo' = 'vpravo') => {
      const podporujeViewTransition =
        typeof document !== 'undefined' && typeof document.startViewTransition === 'function'
      const chceMeneAnimaci =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

      if (!podporujeViewTransition || chceMeneAnimaci) {
        navigate(cesta, options)
        return
      }

      if (smer === 'vlevo') {
        document.documentElement.setAttribute('data-prechod-smer', 'vlevo')
      }

      const transition = document.startViewTransition(() => {
        flushSync(() => navigate(cesta, options))
      })

      transition.finished.finally(() => {
        document.documentElement.removeAttribute('data-prechod-smer')
      })
    },
    [navigate]
  )
}
