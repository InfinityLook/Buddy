import { Bod, FazePohybu, LM, StavOpakovani, Strana } from './types'

// ==========================================
// Čistá geometrie nad body kostry — bez videa, bez Reactu, bez MediaPipe.
// Díky tomu se dá vyzkoušet na vymyšlených souřadnicích bez kamery a bez
// prohlížeče (viz scénářové testy spuštěné mimo appku).
// ==========================================

/** Úhel ve vrcholu `b`, sevřený úsečkami b–a a b–c, ve stupních.
 *  180° = body a, b, c leží v přímce (noha propnutá), menší úhel = ohnutí
 *  v bodě b (koleno v dřepu). Počítá se jen z x/y — hloubka (z) je
 *  u jednoho pevně postaveného telefonu nespolehlivá, navíc pro úhel
 *  v rovině obrazu není potřeba. */
export const uhelVeVrcholu = (a: Bod, b: Bod, c: Bod): number => {
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }
  const velikost = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y)
  if (velikost === 0) return 180

  const kosinus = (ab.x * cb.x + ab.y * cb.y) / velikost
  // Zaokrouhlovací chyby umí kosinus vystrčit nepatrně mimo [-1, 1],
  // což by Math.acos vrátilo jako NaN.
  const omezeny = Math.min(1, Math.max(-1, kosinus))
  return (Math.acos(omezeny) * 180) / Math.PI
}

/** Odklon trupu od svislice ve stupních. 0° = rameno přesně nad bokem
 *  (vzpřímený trup), víc = předklon. Nejde o skutečný 3D náklon zad,
 *  jen o hrubý odhad z jedné kamery — proto "narovnej záda", ne přesná
 *  diagnóza techniky. */
export const odklonTrupu = (rameno: Bod, bok: Bod): number => {
  const dx = Math.abs(rameno.x - bok.x)
  const dy = Math.abs(rameno.y - bok.y)
  if (dx === 0 && dy === 0) return 0
  return (Math.atan2(dx, dy) * 180) / Math.PI
}

const soucetViditelnosti = (b: Bod[], indexy: number[]): number =>
  indexy.reduce((s, i) => s + (b[i]?.visibility ?? 0), 0)

/** Řekne, která strana těla je kamerou vidět líp — u bočního pohledu na
 *  dřep (obvyklé postavení telefonu) je vždycky jedna strana zakrytá tělem
 *  a její body model jen odhaduje. Použití té viditelnější zmenší chvění
 *  úhlu, ze kterého se počítají opakování. */
export const vyberViditelnejsiStranu = (b: Bod[]): Strana => {
  const leva = soucetViditelnosti(b, [LM.LEVY_BOK, LM.LEVE_KOLENO, LM.LEVY_KOTNIK])
  const prava = soucetViditelnosti(b, [LM.PRAVY_BOK, LM.PRAVE_KOLENO, LM.PRAVY_KOTNIK])
  return leva >= prava ? 'levá' : 'pravá'
}

export const bodyStrany = (strana: Strana) =>
  strana === 'levá'
    ? { rameno: LM.LEVE_RAMENO, bok: LM.LEVY_BOK, koleno: LM.LEVE_KOLENO, kotnik: LM.LEVY_KOTNIK }
    : { rameno: LM.PRAVE_RAMENO, bok: LM.PRAVY_BOK, koleno: LM.PRAVE_KOLENO, kotnik: LM.PRAVY_KOTNIK }

export const POCATECNI_STAV: StavOpakovani = { faze: 'nahore', pocet: 0 }

// Mezera mezi prahy je záměrná (hystereze): bez ní by chvění úhlu kolem
// jedné jediné hranice napočítalo desítky opakování za vteřinu místo
// jednoho. Aby se opakování započítalo, musí úhel kolena projít celým
// cyklem nahoře → dole → nahoře.
const PRAH_DOLE = 110 // úhel kolena pod touhle hranicí = dole (v dřepu)
const PRAH_NAHORE = 160 // nad touhle hranicí = zpátky nahoře (noha skoro propnutá)

/** Jeden krok stavového automatu dřepu. Opakování se připočítá v okamžiku
 *  návratu nahoru, ne při sednutí dolů — jinak by se počítalo, i kdyby
 *  cvičící sed nikdy nedokončil. */
export const krokOpakovani = (stav: StavOpakovani, uhelKolena: number): StavOpakovani => {
  if (stav.faze === 'nahore' && uhelKolena < PRAH_DOLE) {
    return { faze: 'dole', pocet: stav.pocet }
  }
  if (stav.faze === 'dole' && uhelKolena > PRAH_NAHORE) {
    return { faze: 'nahore', pocet: stav.pocet + 1 }
  }
  return stav
}

export const JE_DOLE = (faze: FazePohybu): boolean => faze === 'dole'

const PRAH_NAROVNANI = 45 // stupňů od svislice; nad tím = "narovnej záda"

/** Jednoduchá heuristika držení zad — funguje jen jako hrubé varování,
 *  ne jako rozbor techniky. Zpětná vazba se dává jen ve fázi "dole":
 *  na začátku dřepu se každý přirozeně předklání víc a hlásit to jako
 *  chybu by uživatele akorát mátlo. */
export const jeZadaNarovnana = (odklon: number): boolean => odklon <= PRAH_NAROVNANI
