// ==========================================
// Souboj — vibrace ovladače (telefonu). TV má reproduktory (sound.ts),
// telefon má vibrační motorek — proto jde zpětná vazba po dvou různých
// kanálech, ne jedním sdíleným.
//
// Vibration API (navigator.vibrate) na iOS Safari vůbec neexistuje —
// stejný "feature-detect a potichu se obejít" vzor jako
// BarcodeDetector (SkenovatKodDialog.tsx) nebo MediaRecorder
// (ChatView.tsx's hlasové zprávy): appka se na vibrace nikde nespoléhá
// jako na jedinou zpětnou vazbu, jen jako na bonus navrch.
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

/** Krátké cvaknutí — potvrzení, že appka doopravdy zaregistrovala
 *  stisk akčního tlačítka (posliTlacitko v Ovladac.tsx), ne jen vizuál. */
export const zavibrujTlacitko = () => zavibruj(15)

/** Delší, radostnější vzor — vlastní výhra zápasu. */
export const zavibrujVyhru = () => zavibruj([40, 60, 40, 60, 90])

/** Jeden delší, tupý buzz — vlastní prohra zápasu. */
export const zavibrujProhru = () => zavibruj(180)

/** Dva krátké — remíza, ani jedno ani druhé. */
export const zavibrujRemizu = () => zavibruj([40, 80, 40])
