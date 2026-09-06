// ==========================================
// Souboj — zvukové efekty pro TV stranu (tam jsou reproduktory, ne na
// telefonu — ovladač dostává místo toho vibrace, viz haptika.ts).
// Stejný vzor jako Pomodoro's playChime (usePomodoro.ts) — Web Audio,
// krátké syntetizované tóny, žádný zvukový soubor: nic nepřibude do
// PWA precache, nic se nemusí stahovat offline.
//
// AudioContext se smí vytvořit/odemknout jen uvnitř skutečného gesta
// uživatele (prohlížeč jinak přehrávání odmítne) — `odemkniZvuk` se
// proto volá z FightingModule.tsx's kliknutí na "Hostovat na TV", ne
// odsud automaticky. Jakmile je kontext jednou odemčený, další zvuky
// spuštěné odkudkoli (i z requestAnimationFrame smyčky bez vlastního
// gesta, jako TvHost.tsx's herní tik) už normálně hrají — prohlížeč
// vyžaduje gesto jen na první odemčení kontextu, ne na každé přehrání.
// ==========================================

let audioCtx: AudioContext | null = null

export const odemkniZvuk = () => {
  if (audioCtx) return
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctor) audioCtx = new Ctor()
  } catch {
    audioCtx = null
  }
  void audioCtx?.resume?.()
}

const ton = (frekvence: number, delkaS: number, hlasitost = 0.2, typ: OscillatorType = 'sine', zpozdeniS = 0) => {
  if (!audioCtx) return
  try {
    const zacatek = audioCtx.currentTime + zpozdeniS
    const gain = audioCtx.createGain()
    gain.connect(audioCtx.destination)
    gain.gain.setValueAtTime(0.0001, zacatek)
    gain.gain.exponentialRampToValueAtTime(hlasitost, zacatek + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, zacatek + delkaS)

    const osc = audioCtx.createOscillator()
    osc.type = typ
    osc.frequency.setValueAtTime(frekvence, zacatek)
    osc.connect(gain)
    osc.start(zacatek)
    osc.stop(zacatek + delkaS)
  } catch {
    // Zvuk je bonus, ne podmínka hratelnosti — když ho prohlížeč
    // nepustí (kontext se nikdy neodemkl, apod.), appka to tiše přejde.
  }
}

/** Krátký úder — hraje se na každý zásah, co doopravdy ubral HP (viz
 *  Bojiste.tsx's `zasazen`, stejná derivace jako pro jiskry/záblesk). */
export const zahrajZasah = () => ton(180, 0.1, 0.28, 'square')

/** Delší, hlubší "whoosh" — speciální schopnost byla právě zahájena
 *  (Bojiste.tsx detekuje přechod `posledniAkce` na 'specialni'), ne
 *  jestli skutečně trefila — Bulwarkův štít se seslává, i když nic
 *  netrefí (viz engine.ts's TypSpecialu). */
export const zahrajSpecial = () => ton(520, 0.35, 0.22, 'sawtooth')

/** Krátká vzestupná fanfára — kolo/zápas má vítěze. Bojiste.tsx je
 *  sdílená TV obrazovka, ne ničí "vlastní" — appka tu proto nemá
 *  samostatný "prohra" tón (to řeší až telefon vibracemi, viz
 *  haptika.ts's zavibrujProhru), jen "byl tu vítěz" vs. "remíza"
 *  (zahrajRemizu níž). */
export const zahrajVyhra = () => {
  ton(523.25, 0.16, 0.22)
  ton(659.25, 0.16, 0.22, 'sine', 0.14)
  ton(783.99, 0.42, 0.24, 'sine', 0.28)
}

/** Neutrální dvojtón — remíza, ani výhra, ani prohra. */
export const zahrajRemizu = () => {
  ton(349.23, 0.16, 0.18)
  ton(349.23, 0.16, 0.18, 'sine', 0.2)
}

/** Vylepšení — parry. Ostrý kovový "cink", zjevně odlišný od
 *  obyčejného zahrajZasah (tupý čtvercový tón) — perfektní blok má
 *  znít jako úspěch obránce, ne jako další rána. */
export const zahrajParry = () => ton(1046.5, 0.14, 0.24, 'triangle')

// ==========================================
// Desáté kolo vylepšení — ambientní hudba na pozadí zápasu. Žádný
// zvukový soubor, stejná "syntetizuj to sám" disciplína jako
// zahrajZasah výš — jednoduchý setInterval-driven arpeggiator na
// tichou hlasitost (0.05, výrazně tišší než jakýkoli efekt výš, ať
// hudba nikdy nepřekřičí zvuk zásahu/speciálu), ne skutečný look-ahead
// scheduler jako Music Studio's useBeatSequencer — appka tu netrefuje
// rytmus na milisekundu, jen drží atmosféru, takže jednoduchý interval
// stačí. Napjatost (nastavNapjatostHudby) mění tempo i notovou řadu na
// nižší/disonantnější — appka o ni volá z herní smyčky (TvHost.tsx/
// LocalniZapas.tsx) podle toho, jestli právě běží náhlá smrt.
// ==========================================

let hudbaIntervalId: number | null = null
let hudbaNapjata = false
let hudbaKrok = 0

/** Klidné, konsonantní akordové noty (A3–G4) pro obyčejný průběh
 *  zápasu — délka not (0.9 s) je schválně blízko tempu přehrávání
 *  (900 ms), ať noty plynule navazují, ne přeskakují ticho mezi sebou. */
const NOTY_KLID = [220, 261.63, 329.63, 392]
/** Nižší, disonantnější noty pro náhlou smrt — appka je nepřehrává
 *  jako "jiná píseň", jen posune stejný vzorec na temnější/rychlejší
 *  variantu, ať je zřejmé, že jde pořád o tu samou hudbu, jen napjatější. */
const NOTY_NAPJATO = [196, 233.08, 277.18, 311.13]

const zahrajHudebniKrok = () => {
  const noty = hudbaNapjata ? NOTY_NAPJATO : NOTY_KLID
  ton(noty[hudbaKrok % noty.length], hudbaNapjata ? 0.5 : 0.9, 0.05, 'sine')
  hudbaKrok += 1
}

/** Spustí smyčku ambientní hudby — no-op, pokud už jednou běží (appka
 *  ji volá z herní smyčky na start zápasu, ne z gesta uživatele, takže
 *  nemá smysl znovu vytvářet druhý interval navrch). */
export const spustitHudbu = () => {
  if (!audioCtx || hudbaIntervalId !== null) return
  hudbaKrok = 0
  zahrajHudebniKrok()
  hudbaIntervalId = window.setInterval(zahrajHudebniKrok, hudbaNapjata ? 550 : 900)
}

export const zastavitHudbu = () => {
  if (hudbaIntervalId !== null) {
    window.clearInterval(hudbaIntervalId)
    hudbaIntervalId = null
  }
}

/** Přepne mezi klidnou a napjatou variantou — no-op, pokud appka už v
 *  požadovaném stavu je (appka na tohle volá z herní smyčky na KAŽDÝ
 *  tik, viz TvHost.tsx/LocalniZapas.tsx, takže tenhle časný návrat je
 *  to, co drží náklad na nulu, dokud se stav doopravdy nezmění). Když
 *  hudba právě hraje, appka ji restartuje s novým tempem — jednodušší
 *  než měnit běžící interval, cena je jen krátký skok zpátky na první
 *  notu vzorce, nic, co by u ambientní hudby vadilo. */
export const nastavNapjatostHudby = (napjata: boolean) => {
  if (hudbaNapjata === napjata) return
  hudbaNapjata = napjata
  if (hudbaIntervalId !== null) {
    zastavitHudbu()
    spustitHudbu()
  }
}
