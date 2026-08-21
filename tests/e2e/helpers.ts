import type { BrowserContext, Page } from '@playwright/test'

// ==========================================
// Sdílené pomocníky pro tests/e2e/*.spec.ts a tests/security/*.spec.ts.
//
// Formalizuje vzor používaný celou tuhle session v ručních Playwright
// skriptech (pwtest/*.js ve scratchpadu): appka se nikdy nepouští proti
// skutečné produkční databázi — ctx.route() odchytí volání na Supabase
// a odpoví z malé napodobeniny v paměti. VITE_SUPABASE_URL/
// VITE_SUPABASE_PUBLISHABLE_KEY jsou schválně "publishable" klíče (viz
// .env.example) — bezpečné mít v CI natvrdo, appka bez nich vůbec
// nesestaví klienta (isSupabaseConfigured by bylo false a testy by
// mířily na jinou větev appky, ne tu, co používá naprostá většina uživatelů).
// ==========================================

export const SUPABASE_REF = 'fsrjlxxaehijbflueuin'
export const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`

/** Vloží platnou (nadmnamovanou) Supabase relaci do localStorage ještě
 *  před prvním načtením appky — stejný trik jako `vlozRelaci`/
 *  `addInitScript` napříč celou touhle session. */
export const vlozRelaci = async (ctx: BrowserContext, userId: string) => {
  await ctx.addInitScript(
    ([ref, id]) => {
      const token =
        'h.' +
        btoa(
          JSON.stringify({
            sub: id,
            role: 'authenticated',
            is_anonymous: false,
            exp: Math.floor(Date.now() / 1000) + 3600,
          })
        ) +
        '.s'
      localStorage.setItem(
        `sb-${ref}-auth-token`,
        JSON.stringify({
          access_token: token,
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'r',
          user: {
            id,
            aud: 'authenticated',
            role: 'authenticated',
            email: 'test@skola.cz',
            is_anonymous: false,
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        })
      )
    },
    [SUPABASE_REF, userId]
  )
}

/** Řádky napodobeniny databáze — jen to, co daný test potřebuje. */
export type MockData = Record<string, Record<string, unknown>[]>

interface MockOptions {
  /** Odpovědi na jmenovaná RPC volání (klíč = jméno funkce). */
  rpc?: Record<string, unknown | ((body: unknown) => unknown)>
}

/** Odchytí veškerý provoz na Supabase a odpovídá z `data`/`rpc` —
 *  obecný GET (eq/in filtry) + POST/PATCH/DELETE nad `data`, jmenovaná
 *  RPC volání z `rpc`. Cokoli neznámého dostane prázdnou odpověď, ne
 *  chybu — appka se tak chová jako proti prázdné, ale funkční databázi. */
export const mockSupabase = async (ctx: BrowserContext, data: MockData, options: MockOptions = {}) => {
  await ctx.route(`${SUPABASE_URL}/**`, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const cesta = url.pathname
    const json = (telo: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(telo) })

    if (cesta.startsWith('/auth/v1')) return json({})

    if (cesta.startsWith('/rest/v1/rpc/')) {
      const jmeno = cesta.replace('/rest/v1/rpc/', '')
      if (jmeno in (options.rpc ?? {})) {
        const odpoved = options.rpc![jmeno]
        const telo = JSON.parse(req.postData() || '{}')
        return json(typeof odpoved === 'function' ? (odpoved as (b: unknown) => unknown)(telo) : odpoved)
      }
      return json(null)
    }

    const tabulka = cesta.replace('/rest/v1/', '')
    const radky = data[tabulka]
    if (!radky) return json([])

    if (req.method() === 'GET') {
      let vysledek = [...radky]
      for (const [klic, hodnota] of url.searchParams) {
        if (['select', 'order', 'limit'].includes(klic)) continue
        if (hodnota.startsWith('eq.')) {
          const v = hodnota.slice(3)
          vysledek = vysledek.filter((r) => String(r[klic]) === v)
        } else if (hodnota.startsWith('in.')) {
          const seznam = hodnota
            .slice(4, -1)
            .split(',')
            .map((s) => s.replace(/^"|"$/g, ''))
          vysledek = vysledek.filter((r) => seznam.includes(String(r[klic])))
        }
      }
      const jedno = (req.headers()['accept'] || '').includes('vnd.pgrst.object')
      return jedno ? json(vysledek[0] ?? null) : json(vysledek)
    }

    if (req.method() === 'POST') {
      const telo = JSON.parse(req.postData() || '{}')
      const nove = (Array.isArray(telo) ? telo : [telo]).map((r, i) => ({
        id: `${tabulka}-${Date.now()}-${i}`,
        created_at: new Date().toISOString(),
        ...r,
      }))
      radky.push(...nove)
      const jednoP = (req.headers()['accept'] || '').includes('vnd.pgrst.object')
      return json(jednoP ? nove[0] : nove, 201)
    }

    if (req.method() === 'PATCH') {
      const telo = JSON.parse(req.postData() || '{}')
      const id = url.searchParams.get('id')?.slice(3)
      for (const r of radky) if (!id || String(r.id) === id) Object.assign(r, telo)
      return json([])
    }

    if (req.method() === 'DELETE') {
      const id = url.searchParams.get('id')?.slice(3)
      data[tabulka] = radky.filter((r) => id && String(r.id) !== id)
      return json([])
    }

    return json([])
  })
}

/** Čeká, až appka doopravdy doběhne na Hub — společný bod po přihlášení
 *  pro všechny specy, které z něj dál pokračují jinam. */
export const cekejNaHub = (page: Page) => page.waitForURL('**/hub', { timeout: 15_000 })
