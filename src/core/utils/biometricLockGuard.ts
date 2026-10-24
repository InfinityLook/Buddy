// ==========================================
// Audit #9 — čistá podmínka pro App.tsx's visibilitychange posluchače.
//
// Appka BiometricLock dřív jednou odemčená (`odemceno = true`) zůstávala
// odemčená po celou dobu běhu JS procesu — žádný visibilitychange/
// pagehide/pageshow/freeze/resume posluchač nikde neexistoval. Appka tím
// pádem po uzamčení telefonu a návratu naskočila rovnou dovnitř appky,
// bez jediného dalšího otisku/Face ID — to je appčino vlastní "obejití
// biometrického zámku", co appka touhle opravou zavírá.
//
// Funkce žije v samostatném souboru bez jediného riskantního importu
// (žádný React, žádný core/supabase, žádný core/utils/registerSW),
// protože App.tsx samotný appka ve Vitestu importovat nemůže —
// App.tsx tahá core/utils/registerSW.ts's setupPWAUpdates, co dál
// tahá virtual:pwa-register, modul co existuje jen uvnitř appčina
// vlastního Vite instance, ne uvnitř Vitestova. Appčina vlastní "appka
// je testovatelná podle celého importního grafu, ne jen podle funkce
// samotné" zásada, co appka dřív takhle potkala u Financí/Rozvrhu/
// Goal Trackeru.
// ==========================================

export interface ZabezpeceniKeKontrole {
  biometrics: boolean
  biometricCredentialId?: string
}

/**
 * Má appka při skrytí stránky zamknout zámek znovu (appčino vlastní
 * `setOdemceno(false)`)?
 *
 * Appka tu podmínku kontroluje proti AKTUÁLNÍMU nastavení biometrie,
 * ne proti appčinu jednorázovému `vyzadovaloZamekPriStartu` zachycenému
 * při startu (App.tsx's useRef) — jinak by appka zámek vrátila zpátky i
 * poté, co si ho uživatel v Nastavení mezitím schválně vypnul
 * (ZabezpeceniSekce.tsx's "vypnutí nevyžaduje nové ověření" by tím
 * ztratilo smysl).
 */
export const melByZamekniPriSkryti = (
  viditelnost: DocumentVisibilityState,
  zabezpeceni: ZabezpeceniKeKontrole
): boolean => viditelnost === 'hidden' && zabezpeceni.biometrics && !!zabezpeceni.biometricCredentialId
