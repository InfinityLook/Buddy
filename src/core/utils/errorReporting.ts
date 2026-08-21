import { supabase, isSupabaseConfigured } from '@/core/supabase/client'
import { APP_BUILD_ID } from './registerSW'

// ==========================================
// System monitoring: neošetřené chyby z běžícího prohlížeče se pošlou
// do public.client_errors (migrace client_errors_monitoring), odkud
// je Admin panel čte v záložce Systém. Na rozdíl od zátěže Supabase/
// Vercelu (odloženo, potřebuje tajný token — viz metrics.ts) tohle
// nic tajného nepotřebuje, jen normální přihlášenou relaci: RLS pustí
// insert jen za vlastní auth.uid() a číst smí jen admin.
//
// Cloud je pořád doplněk — bez nastaveného Supabase se nic neposílá
// a appka běží dál přesně jako dřív, stejný princip jako cloudSync.ts.
// ==========================================

/** Kolik hlášení nejvýš odešle jedna běžící relace stránky. Bez limitu
 *  by rozbitá komponenta v nekonečné smyčce vykreslení dokázala
 *  zaplavit tabulku tisíci řádky během vteřin — reálné chyby stačí
 *  zachytit v pár prvních výskytech, ne v každém opakování. */
const MAX_HLASENI_ZA_RELACI = 5
let odeslano = 0

const oriznout = (text: string, max: number): string =>
  text.length > max ? text.slice(0, max) : text

const nahlasit = async (message: string, stack?: string) => {
  if (!supabase || odeslano >= MAX_HLASENI_ZA_RELACI) return
  odeslano += 1

  // RLS na client_errors vyžaduje auth.uid() shodné s user_id — bez
  // relace by insert stejně spadl, tak se ani nezkouší (viz "offline
  // je normální stav, ne chyba" jinde v appce).
  const { data } = await supabase.auth.getSession()
  if (!data.session?.user?.id) return

  await supabase.from('client_errors').insert({
    message: oriznout(message, 500),
    stack: stack ? oriznout(stack, 2000) : null,
    url: oriznout(location.pathname, 300),
    build_id: APP_BUILD_ID,
  })
}

/** Zapne odchytávání chyb pro celou dobu běhu stránky. Volá se jednou
 *  z App.tsx, stejný vzor jako setupPWAUpdates/startCloudSync. */
export const setupErrorReporting = (): void => {
  if (!isSupabaseConfigured) return

  window.addEventListener('error', (e) => {
    void nahlasit(e.message || 'Neznámá chyba', e.error?.stack)
  })

  window.addEventListener('unhandledrejection', (e) => {
    const duvod = e.reason
    const zprava = duvod instanceof Error ? duvod.message : String(duvod)
    void nahlasit(`Nezachycené odmítnutí: ${zprava}`, duvod instanceof Error ? duvod.stack : undefined)
  })
}
