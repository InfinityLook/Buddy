import { APP_BUILD_ID, APP_VERSION } from '@/core/utils/registerSW'

// ==========================================
// Živé parametry aplikace — zdroj "Aplikace" v Přehledu.
//
// Tohle NENÍ totéž jako zátěž Supabase nebo Vercelu. Ty spravují cizí
// API s vlastními přístupovými tokeny a token, který smí číst účty
// projektu, nesmí nikdy ležet v kódu, který si stáhne kdokoli — celý
// JS balíček je veřejně čitelný, role uživatele v prohlížeči to nijak
// nezakryje (viz varování v core/role/types.ts). Live graf Supabase/
// Vercelu proto vyžaduje vlastní zabezpečený server (Vercel/Supabase
// funkce, která token drží u sebe) a čeká na rozhodnutí, jestli se má
// tahle část stavět.
//
// Co se ale bezpečně změřit dá, je běžící prohlížeč samotný — a přesně
// to tenhle soubor dělá.
// ==========================================

export interface AplikaceMetriky {
  verze: string
  buildId: string
  bezimOd: number
  pametMB: { pouzito: number; limit: number } | null
  ulozisteMB: { pouzito: number; kvota: number } | null
  pocetCacheStorage: number
  online: boolean
}

/** `performance.memory` je jen v Chromiu, jinde je `undefined`. */
const nactiPamet = (): AplikaceMetriky['pametMB'] => {
  const p = performance as Performance & {
    memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number }
  }
  if (!p.memory) return null
  return {
    pouzito: Math.round(p.memory.usedJSHeapSize / 1024 / 1024),
    limit: Math.round(p.memory.jsHeapSizeLimit / 1024 / 1024),
  }
}

export const nactiAplikaceMetriky = async (): Promise<AplikaceMetriky> => {
  let ulozisteMB: AplikaceMetriky['ulozisteMB'] = null
  if (navigator.storage?.estimate) {
    const odhad = await navigator.storage.estimate()
    ulozisteMB = {
      pouzito: Math.round((odhad.usage ?? 0) / 1024 / 1024),
      kvota: Math.round((odhad.quota ?? 0) / 1024 / 1024),
    }
  }

  const pocetCacheStorage = 'caches' in window ? (await caches.keys()).length : 0

  return {
    verze: APP_VERSION,
    buildId: APP_BUILD_ID,
    bezimOd: performance.timeOrigin,
    pametMB: nactiPamet(),
    ulozisteMB,
    pocetCacheStorage,
    online: navigator.onLine,
  }
}
