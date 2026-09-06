// ==========================================
// Deváté kolo vylepšení — hlasový komentátor pro TV stranu (Web
// Speech Synthesis API, `window.speechSynthesis`) — stejné "feature-
// detekuj, tiše nic nedělej, když to prohlížeč neumí" chování jako
// haptika.ts's Vibrace API nebo BarcodeDetector/MediaRecorder jinde
// v appce. Na rozdíl od sound.ts (Web Audio, vlastní syntetizované
// tóny) appka tady nevymýšlí žádný "hlas" sama — použije, cokoli má
// prohlížeč/OS nainstalováno pro češtinu, a když nemá nic, komentátor
// je prostě potichu (stejná odolnost jako sound.ts's zahrajZasah,
// když se AudioContext nikdy neodemkl).
//
// Ověřeno jen čtením kódu a feature-detekcí, ne živým poslechem —
// tenhle sandbox (viz CLAUDE.md's poznámka u src/buddy/useBuddyVoice.ts)
// nemá nainstalovaný žádný hlas pro speechSynthesis, takže skutečné
// přehrání komentáře nejde v týhle izolaci ověřit naživo, stejná
// poctivá mez jako appka přiznává u Buddyho hlasového asistenta.
// ==========================================

export const PODPORUJE_KOMENTATORA = typeof window !== 'undefined' && 'speechSynthesis' in window

const rekni = (text: string) => {
  if (!PODPORUJE_KOMENTATORA) return
  try {
    // Zruší cokoli, co ještě dozníva z předchozí hlášky, ať se
    // komentář nefrontuje a nezpožďuje za tím, co se na obrazovce
    // právě děje o pár vteřin dřív.
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'cs-CZ'
    u.rate = 1.05
    u.pitch = 1.0
    u.volume = 0.9
    window.speechSynthesis.speak(u)
  } catch {
    // Komentátor je bonus, ne podmínka hratelnosti.
  }
}

/** Nové kolo právě začíná (viz Bojiste.tsx's přechod 'konec' →
 *  'probiha', shodná disciplína jako zahrajVyhra/zahrajRemizu). */
export const oznamZacatekKola = () => rekni('Boj!')

/** Kolo skončilo skutečným knokautem (poražený má hp <= 0), ne
 *  rozhodnutím na časový limit/náhlou smrt — ty dostávají
 *  oznamVitezstvi níž, ne tenhle výkřik. */
export const oznamKnokaut = () => rekni('Knokaut!')

/** Kolo/zápas skončilo vítězem, ale bez skutečného KO (rozhodnutí na
 *  vyšší HP při vypršení limitu). */
export const oznamVitezstvi = (jmeno: string) => rekni(`${jmeno} vyhrává!`)

export const oznamRemizu = () => rekni('Remíza!')

/** Perfektní blok (parry, viz combat/engine.ts's PARRY_OKNO_MS) —
 *  stejný přechodový moment, na jaký sound.ts's zahrajParry už hraje
 *  tón, komentátor k tomu jen přidává slovo. */
export const oznamPerfektniBlok = () => rekni('Perfektní blok!')

/** Desáté kolo vylepšení — "3-2-1-BOJ!" odpočet (IntroPocitadlo.tsx).
 *  Poslední krok ('FIGHT') dostává schválně stejné slovo jako
 *  oznamZacatekKola výš — appka nevymýšlí druhou hlášku pro tu samou
 *  chvíli. */
export const oznamOdpocet = (hodnota: number | 'FIGHT') => rekni(hodnota === 'FIGHT' ? 'Boj!' : String(hodnota))
