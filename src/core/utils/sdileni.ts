// ==========================================
// Sdílení prostého textu — Web Share API, feature-detect a tiché odbytí,
// stejná disciplína jako appka jinde používá pro MediaRecorder/
// BarcodeDetector/Vibration API. Bez podpory appka zkusí aspoň
// zkopírovat text do schránky, a když ani to nejde, prostě nic (žádný
// pád, žádné rušivé chybové hlášení pro něco čistě kosmetického).
//
// Vzniklo jako Soubojova vlastní věc (src/fighting/sdileni.ts), sem se
// přesunulo ve chvíli, kdy druhá appka (Form Check) potřebovala přesně
// tu samou logiku — stejný "promote do core/utils, jakmile druhá appka
// potřebuje totéž" vzorec jako core/utils/notify.ts (Pomodoro → Planer)
// jinde v týhle appce. Soubojův vlastní soubor teď jen tence obaluje
// tuhle funkci s pevným titulkem "Souboj", ať se žádnému z jeho pěti
// volajících nemusí nic měnit.
// ==========================================

export const PODPORUJE_SDILENI = typeof navigator !== 'undefined' && 'share' in navigator

/** Sdílí čistý text (appka zatím žádný screenshot negeneruje — sdílet
 *  jde jen to, co appka sama textově ví). Vrátí, jestli se sdílení/
 *  kopírování doopravdy povedlo, ať volající může případně ukázat
 *  vlastní potvrzení. `titulek` je jméno appky/funkce, co sdílení
 *  spustila (zobrazí ho sdílecí dialog OS) — výchozí "Buddy" pro
 *  volající, kterým na konkrétním titulku nezáleží. */
export const sdilejText = async (text: string, titulek = 'Buddy'): Promise<boolean> => {
  if (PODPORUJE_SDILENI) {
    try {
      await navigator.share({ text, title: titulek })
      return true
    } catch {
      // Uživatel sdílení sám zrušil (AbortError) nebo API selhalo z
      // jiného důvodu — appka to bere stejně, zkusí schránku jako
      // zálohu níž.
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }
  return false
}
