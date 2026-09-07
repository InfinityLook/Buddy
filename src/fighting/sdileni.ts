// ==========================================
// Vylepšení — sdílení výsledku zápasu. Web Share API, feature-detect
// a tiché odbytí, stejná disciplína jako appka jinde používá pro
// MediaRecorder/BarcodeDetector/Vibration API — na desktopu nebo
// prohlížeči bez podpory appka zkusí aspoň zkopírovat text do
// schránky, a když ani to nejde, prostě nic (žádný pád, žádné
// rušivé chybové hlášení pro něco čistě kosmetického).
// ==========================================

export const PODPORUJE_SDILENI = typeof navigator !== 'undefined' && 'share' in navigator

/** Sdílí čistý text (appka zatím žádný screenshot negeneruje — sdílet
 *  jde jen to, co appka sama textově ví: kdo/jak vyhrál). Vrátí, jestli
 *  se sdílení/kopírování doopravdy povedlo, ať volající může případně
 *  ukázat vlastní potvrzení. */
export const sdilejText = async (text: string): Promise<boolean> => {
  if (PODPORUJE_SDILENI) {
    try {
      await navigator.share({ text, title: 'Souboj' })
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
