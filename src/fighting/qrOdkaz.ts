// ==========================================
// Vylepšení — QR párování. Kód místnosti appka kóduje jako obyčejný
// URL query parametr na aktuální adrese appky (stejný `?kod=`/
// `?zalozka=` vzor, jaký SocialModule.tsx/AppModule.tsx už používají
// jinde) — naskenovaný telefon tak otevře appku (nebo prohlížeč) rovnou
// na téhle stránce, FightingModule.tsx parametr přečte JEDNOU při
// startu a rovnou přeskočí ruční zadávání kódu (viz Ovladac.tsx's
// predvyplnenyKod).
// ==========================================

export const PARAMETR_PRIPOJIT = 'pripojit'

/** Sestaví celou URL pro QR kód — appka záměrně bere `window.location`
 *  (ne napevno nějakou doménu), ať funguje stejně na produkci i
 *  lokálním vývoji/preview. */
export const pripojovaciOdkaz = (kod: string): string => {
  const url = new URL(window.location.href)
  url.search = `?${PARAMETR_PRIPOJIT}=${kod.toUpperCase()}`
  return url.toString()
}

/** Přečte `?pripojit=` z aktuální adresy — vrátí null, pokud chybí
 *  nebo je zjevně moc krátký na to, aby to byl skutečný kód místnosti
 *  (appka nechce appku hodit rovnou do "Připojuji…" na základě
 *  náhodou podobného parametru). */
export const precistKodZOdkazu = (search: string): string | null => {
  const kod = new URLSearchParams(search).get(PARAMETR_PRIPOJIT)
  if (!kod || kod.trim().length < 4) return null
  return kod.trim().toUpperCase()
}
