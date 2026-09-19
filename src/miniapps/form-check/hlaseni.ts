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

// ==========================================
// Konec odpočinku mezi sériemi — dřív jediný signál byl hlasové
// hlášení (ohlasZacniSerii výš), takže s vypnutým hlasem nebo
// telefonem potichu v kapse uživatel neměl jak poznat, že odpočítávání
// doběhlo. Vibrace + krátké pípnutí jsou schválně NEZÁVISLÉ na
// hlasoveHlaseni přepínači — je to jiný signál (skončil časovač), ne
// mluvené slovo, appka ho volá vždycky.
//
// AudioContext se musí vytvořit/odemknout uvnitř skutečného gesta
// uživatele (klepnutí na "Dokončit sérii"), ne až o desítky vteřin
// později, kdy odpočítávání doběhne — prohlížeč by jinak kontext
// vytvořený mimo gesto nechal ve stavu 'suspended' a start() by
// tiše nic nepřehrál. odemkniOdpocinekZvuk() se proto volá hned při
// zahájení odpočinku (FormCheck.tsx's handleDokoncitSerii), ne uvnitř
// samotného ohlasKonecOdpocinku.
// ==========================================
let odpocinekAudioCtx: AudioContext | null = null

export const odemkniOdpocinekZvuk = (): void => {
  if (odpocinekAudioCtx) {
    void odpocinekAudioCtx.resume()
    return
  }
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctor) odpocinekAudioCtx = new Ctor()
  } catch {
    odpocinekAudioCtx = null
  }
}

export const ohlasKonecOdpocinku = (): void => {
  // Vibrace na telefonu — když prohlížeč neumí, prostě se nic nestane,
  // stejný vzorec jako Pomodorovo navigator.vibrate?.(...).
  navigator.vibrate?.([150, 80, 150])

  const master = masterHlasitost()
  if (master <= 0 || !odpocinekAudioCtx) return
  try {
    const ctx = odpocinekAudioCtx
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.3 * master, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, now)
    osc.frequency.setValueAtTime(880, now + 0.15)
    osc.connect(gain)
    osc.start(now)
    osc.stop(now + 0.55)
  } catch {
    // Zvuk je bonus, ne podmínka — vibrace výš proběhla tak jako tak.
  }
}

// Rozcvička/strečink časovač (RozcvickaCasovac.tsx) je bez kamery, ale
// hlas dává smysl stejně — ohlásí název dalšího kroku, ať se uživatel
// nemusí koukat do telefonu mezi jednotlivými cviky.
export const ohlasKrokRozcvicky = (nazevKroku: string): void => rekni(nazevKroku)
export const ohlasHotovoRozcvicka = (): void => rekni('Hotovo! Skvělá práce.')
