import { useZvukStore } from '@/core/store/useZvukStore'

// ==========================================
// Hlasové hlášení opakování — Web Speech Synthesis, žádná knihovna,
// stejný "feature-detect, tiše nic nedělej" vzorec jako BarcodeDetector/
// MediaRecorder jinde v appce (viz core/utils/zvukValidation.ts's
// souhrn). Poslouchá jen appčinu globální Master hlasitost
// (core/store/useZvukStore.ts) — nemá vlastní kategorii (buddy/hra/
// music), stejná zásada jako u Pomodorova gongu, který taky žádnou
// vlastní kategorii nemá.
//
// Žije jako vlastní malý soubor, ne uvnitř usePoseEngine.ts — engine
// sám má počítat opakování, ne mluvit; FormCheck.tsx (komponenta) volá
// tyhle funkce reakcí na změnu engine.pocetOpakovani.
// ==========================================

export const PODPORUJE_HLASOVE_HLASENI = typeof window !== 'undefined' && 'speechSynthesis' in window

const masterHlasitost = (): number => useZvukStore.getState().master / 100

const rekni = (text: string): void => {
  if (!PODPORUJE_HLASOVE_HLASENI) return
  const hlasitost = masterHlasitost()
  if (hlasitost <= 0) return

  // Zrušit rozeběhnutou promluvu, ne frontu — při rychlém cvičení by se
  // jinak hlášky hromadily a zpožďovaly za skutečným tempem; radši
  // aktuální číslo hned než fronta dřívějších.
  window.speechSynthesis.cancel()

  const projev = new SpeechSynthesisUtterance(text)
  projev.lang = 'cs-CZ'
  projev.volume = hlasitost
  projev.rate = 1.15
  window.speechSynthesis.speak(projev)
}

export const ohlasOpakovani = (pocet: number): void => rekni(String(pocet))
export const ohlasNovyRekord = (): void => rekni('Nový rekord!')
export const ohlasCilSplnen = (): void => rekni('Cíl splněn!')
export const ohlasZacniSerii = (cisloSerie: number): void => rekni(`Začni sérii ${cisloSerie}!`)

// Rozcvička/strečink časovač (RozcvickaCasovac.tsx) je bez kamery, ale
// hlas dává smysl stejně — ohlásí název dalšího kroku, ať se uživatel
// nemusí koukat do telefonu mezi jednotlivými cviky.
export const ohlasKrokRozcvicky = (nazevKroku: string): void => rekni(nazevKroku)
export const ohlasHotovoRozcvicka = (): void => rekni('Hotovo! Skvělá práce.')
