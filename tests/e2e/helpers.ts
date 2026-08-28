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

/** 1×1 průhledné PNG — odpověď na cokoli, co appka použije jako
 *  <img>/<video> src (podepsané i veřejné Storage odkazy níž). Stačí
 *  na skutečný nenulový rozměr, který test může ověřit. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
)

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

    // Storage's podepsané odkazy (social/api.ts's ziskejUrlMedia) mají
    // úplně jiný response tvar než /rest/v1 — signedURL (velké URL),
    // relativní k this.url, ne signedUrl/absolutní. Bez týhle větve by
    // request spadl do obecného "neznámá cesta → []" fallbacku níž,
    // který storage-js interpretuje jako "žádná chyba, jen prázdná
    // odpověď" a klient by si sám poskládal nesmyslné src obsahující
    // doslova "undefined" — appka by na tom nespadla, ale ani nic
    // nezobrazila a nepřešla do chybového stavu, jen tiše selhala.
    if (cesta.startsWith('/storage/v1/object/sign/')) {
      return json({ signedURL: `/mock-signed/${cesta.replace('/storage/v1/object/sign/', '')}` })
    }

    // Odkaz z předchozí větve appka doopravdy použije jako <img src>/
    // <video src> — bez skutečné odpovědi na GET by prohlížeč dostal
    // JSON tam, kde čeká obrázek/video, a bublina by zůstala neviditelná
    // (0×0) i když appka nic nezkazila. 1×1 průhledné PNG stačí na to,
    // aby <img> mělo skutečný rozměr a test mohl ověřit, že se bublina
    // opravdu vykreslila, ne že appka jen tiše mlčí.
    //
    // Prefix je "/storage/v1/mock-signed/", ne jen "/mock-signed/" —
    // storage-js skládá výsledné URL jako `${this.url}${signedURL}`,
    // kde `this.url` u storage klienta už samo obsahuje "/storage/v1"
    // (viz createSignedUrl výš v knihovně). Kratší prefix tuhle větev
    // nikdy netrefil, požadavek spadl do obecného REST fallbacku níž,
    // který vrátil `[]` s `content-type: application/json` — <img> pak
    // dostal JSON tam, kde čekal obrázek, a vykreslil se jako neviditelný
    // (0×0), přesně ten bug, kterému měl tenhle blok předejít. Prošlo to
    // tehdy jen proto, že žádný test dřív neověřoval skutečnou viditelnost
    // a rozměr obrázku, jen že <img> element v DOMu vůbec existuje.
    if (cesta.startsWith('/storage/v1/mock-signed/')) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 })
    }

    // Veřejný bucket (core/supabase/avatarStorage.ts's avatáry/bannery,
    // social/api.ts's posts od Fáze profilu s příspěvky) žádný podpis
    // nepotřebuje — getPublicUrl() jen skládá řetězec lokálně, appka
    // ale výsledné URL rovnou použije jako <img>/<video> src, takže
    // musí doopravdy něco vrátit, stejný důvod jako u mock-signed výš.
    if (cesta.startsWith('/storage/v1/object/public/')) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 })
    }

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

    // Společné pro PATCH/DELETE: appka dřív vždycky filtrovala jen podle
    // `id` (zrusitVazbu, odblokovat, ...), takže to bylo jediné, co tenhle
    // mock uměl. ztlumitChat()/odebratReakci() ale mažou/aktualizují podle
    // dvou až tří jiných sloupců najednou (chat_id+user_id,
    // message_id+user_id+emoji) — bez obecného `eq.` filtru níž by PATCH
    // beze stopy `id` v URL potichu přepsal/DELETE smazal úplně všechny
    // řádky tabulky, ne jen ten jeden mířený.
    const shoduSFiltry = (r: Record<string, unknown>): boolean => {
      for (const [klic, hodnota] of url.searchParams) {
        if (klic === 'select') continue
        if (hodnota.startsWith('eq.') && String(r[klic]) !== hodnota.slice(3)) return false
      }
      return true
    }

    if (req.method() === 'PATCH') {
      const telo = JSON.parse(req.postData() || '{}')
      for (const r of radky) if (shoduSFiltry(r)) Object.assign(r, telo)
      return json([])
    }

    if (req.method() === 'DELETE') {
      data[tabulka] = radky.filter((r) => !shoduSFiltry(r))
      return json([])
    }

    return json([])
  })
}

/** Čeká, až appka doopravdy doběhne na Hub — společný bod po přihlášení
 *  pro všechny specy, které z něj dál pokračují jinam. */
export const cekejNaHub = (page: Page) => page.waitForURL('**/hub', { timeout: 15_000 })
