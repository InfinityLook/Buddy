// ==========================================
// Krok 14c (Hubova "Haptika na klíčové akce") — sdílená vrstva nad
// Vibration API, stejný "feature-detect, potichu se obejdi" vzor jako
// src/fighting/haptika.ts (appka se na vibrace nikde nespoléhá jako na
// jedinou zpětnou vazbu, jen jako na bonus navrch — Vibration API na
// iOS Safari vůbec neexistuje).
//
// Žije v core/utils/, ne jako další kopie uvnitř Hub.tsx — appka ji od
// začátku píše jako obecnou, aby ji mohla kdykoli znovupoužít i jiná
// obrazovka mimo Souboj/Form Check/Posilovnu, co si drží vlastní malé
// kopie pro svůj vlastní, úzký účel.
// ==========================================

const PODPORUJE_VIBRACE = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

const zavibruj = (vzor: number | number[]) => {
  if (!PODPORUJE_VIBRACE) return
  try {
    navigator.vibrate(vzor)
  } catch {
    // Bonus, ne podmínka — tichý no-op.
  }
}

/** Krátké cvaknutí — otevření/zavření kola, výběr paprsku. */
export const zavibrujKliknuti = () => zavibruj(12)

/** Delší, radostnější vzor — splnění Dnešního cíle (Krok 13/14c). */
export const zavibrujSplneniCile = () => zavibruj([30, 50, 30, 50, 70])
