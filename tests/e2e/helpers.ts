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
      // order/limit se dřív ignorovaly úplně — stačilo to, dokud žádný
      // test nepotřeboval ověřit, že appka skutečně čte "posledních N",
      // ne "všechno". Social/ChatView.tsx teď stránkuje zprávy přes
      // order+limit+lt (viz nactiZpravy v api.ts), a bez skutečného
      // řazení/ořezání v mocku by test tuhle logiku neodlišil od staré,
      // chybné verze — obojí by mockem prošlo stejně.
      let razeni: { sloupec: string; sestupne: boolean } | null = null
      let limit: number | null = null

      for (const [klic, hodnota] of url.searchParams) {
        if (klic === 'select') continue
        if (klic === 'order') {
          const [sloupec, smer] = hodnota.split('.')
          razeni = { sloupec, sestupne: smer === 'desc' }
          continue
        }
        if (klic === 'limit') {
          limit = Number(hodnota)
          continue
        }
        if (hodnota.startsWith('eq.')) {
          const v = hodnota.slice(3)
          vysledek = vysledek.filter((r) => String(r[klic]) === v)
        } else if (hodnota.startsWith('in.')) {
          const seznam = hodnota
            .slice(4, -1)
            .split(',')
            .map((s) => s.replace(/^"|"$/g, ''))
          vysledek = vysledek.filter((r) => seznam.includes(String(r[klic])))
        } else if (hodnota.startsWith('lt.')) {
          const v = hodnota.slice(3)
          vysledek = vysledek.filter((r) => String(r[klic]) < v)
        } else if (hodnota.startsWith('gt.')) {
          const v = hodnota.slice(3)
          vysledek = vysledek.filter((r) => String(r[klic]) > v)
        }
      }

      if (razeni) {
        const { sloupec, sestupne } = razeni
        vysledek.sort((a, b) => {
          const av = String(a[sloupec] ?? '')
          const bv = String(b[sloupec] ?? '')
          if (av === bv) return 0
          const vzestupne = av < bv ? -1 : 1
          return sestupne ? -vzestupne : vzestupne
        })
      }
      if (limit !== null) vysledek = vysledek.slice(0, limit)

      const jedno = (req.headers()['accept'] || '').includes('vnd.pgrst.object')
      return jedno ? json(vysledek[0] ?? null) : json(vysledek)
    }

    if (req.method() === 'POST') {
      const telo = JSON.parse(req.postData() || '{}')
      const zaznamy = Array.isArray(telo) ? telo : [telo]
      // .upsert(row, { onConflict: 'sloupec' }) posílá ?on_conflict=sloupec —
      // appka to používá při startu (cloudSync.ts nahrává profil). Bez
      // podpory tady by to spadlo do "vždycky přidej nový řádek" a
      // vytvořilo druhý řádek se stejným id: další .single()/.maybeSingle()
      // čtení pak dostane "více než jeden řádek" a appka to potichu
      // vyhodnotí jako chybu (přesně tohle mě chytilo na TVŮJ KÓD, co
      // zůstávalo "········", dokud tenhle upsert chyběl).
      const onConflict = url.searchParams.get('on_conflict')

      // Sloupce, co existující řádky téhle tabulky mají, ale nový řádek
      // je nezadal, doplníme jako null. Bez toho appka po INSERT ...
      // SELECT dostane u nezadaného sloupce (typicky deleted_at)
      // undefined místo null, jaké by vrátil opravdový Postgres —
      // a klientský kód spoléhající na `=== null` (ChatView.tsx: je
      // zpráva smazaná?) by se v testu choval jinak než v produkci.
      const znameSloupce = new Set(radky.flatMap((r) => Object.keys(r)))

      const vysledek = zaznamy.map((r, i) => {
        if (onConflict) {
          const existujici = radky.find((row) => String(row[onConflict]) === String(r[onConflict]))
          if (existujici) {
            Object.assign(existujici, r)
            return existujici
          }
        }
        const zaklad: Record<string, unknown> = {
          id: `${tabulka}-${Date.now()}-${i}`,
          created_at: new Date().toISOString(),
        }
        for (const sloupec of znameSloupce) if (!(sloupec in r)) zaklad[sloupec] = null
        const novy = { ...zaklad, ...r }
        radky.push(novy)
        return novy
      })

      const jednoP = (req.headers()['accept'] || '').includes('vnd.pgrst.object')
      return json(jednoP ? vysledek[0] : vysledek, 201)
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
