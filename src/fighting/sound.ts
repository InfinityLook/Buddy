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
