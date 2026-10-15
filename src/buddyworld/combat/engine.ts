import { FazeNepritele, NepritelDef, NepritelRuntimeStav, Pozice2D } from '../types'

// ==========================================
// Buddy World — čistý bojový/AI engine, bez Threejs a bez Reactu
// (stejná zásada jako Souboj's combat/engine.ts nebo Survival
// Nightovo engine/engine.ts): appka ho dá jednotkově testovat bez
// prohlížeče, scéna (scene/useBuddyWorldScene.ts) ho volá každý
// snímek a jen vykresluje, co funkce vrátí — žádná herní logika
// neleží uvnitř appčina Threejs kódu.
//
// Appka je pro appčin první prototyp vědomě jednodušší než appčin
// Survival Night (jeden nepřítel, žádné vlny/levelup karty) — zadání
// samo varuje přesně před přehnaným rozfázováním: appka nepotřebuje
// sdílený engine-hook navíc, dokud appka nemá víc než jeden nepřítel
// najednou.
// ==========================================

export const DOSAH_UTOKU_HRACE = 1.8
export const COOLDOWN_UTOKU_HRACE_MS = 650
export const POSKOZENI_HRACE_MIN = 8
export const POSKOZENI_HRACE_MAX = 14
export const RESPAWN_PO_MS = 6000

// Appčina obrana — jedno zmáčknutí ji spustí na pevně dlouhou dobu
// (appka ji nedrží podrženým tlačítkem), a mezi dvěma aktivacemi musí
// uplynout cooldown. Appka tím vylučuje "nepřetržitou bezplatnou
// obranu" ze zadání — bez cooldownu by šlo obranu drtivě přetáčet
// bez skutečného omezení. Redukce poškození je úmyslně jen částečná
// (55 % skrz, ne plná neprůstřelnost), ať obrana zůstane skutečnou
// taktickou volbou, ne vypnutím poškození úplně.
export const OBRANA_TRVANI_MS = 1600
export const OBRANA_COOLDOWN_MS = 3500
export const OBRANA_PODIL_POSKOZENI = 0.55

export const vzdalenost2D = (a: Pozice2D, b: Pozice2D): number => Math.hypot(a.x - b.x, a.z - b.z)

/** Omezí appčinu pozici na kruhovou herní oblast daného poloměru —
 *  appčin "limit oblasti pohybu". Čistá funkce, appka ji volá stejně
 *  ze scény i z testů. */
export const omezNaOblast = (pozice: Pozice2D, polomer: number): Pozice2D => {
  const vzd = Math.hypot(pozice.x, pozice.z)
  if (vzd <= polomer || vzd === 0) return pozice
  const meritko = polomer / vzd
  return { x: pozice.x * meritko, z: pozice.z * meritko }
}

export const vytvorNepritelRuntime = (defId: string, maxHp: number, pozice: Pozice2D): NepritelRuntimeStav => ({
  defId,
  hp: maxHp,
  pozice,
  faze: 'klid',
  posledniUtokMs: -Infinity,
  respawnOdMs: -Infinity,
})

/** Jeden appčin snímek AI nepřítele — klid/honí/útočí podle
 *  vzdálenosti k hráči, appka ho hýbe jen ve fázi "honí". Mrtvý
 *  nepřítel se appkou vůbec nepřepočítává. */
export const krokAI = (
  nepritel: NepritelRuntimeStav,
  def: NepritelDef,
  hracPozice: Pozice2D,
  dtSekund: number
): NepritelRuntimeStav => {
  if (nepritel.faze === 'mrtvy') return nepritel

  const vzd = vzdalenost2D(nepritel.pozice, hracPozice)

  if (vzd <= def.dosahUtoku) {
    return nepritel.faze === 'utoci' ? nepritel : { ...nepritel, faze: 'utoci' as FazeNepritele }
  }

  if (vzd <= def.dosahDetekce) {
    const smerX = (hracPozice.x - nepritel.pozice.x) / vzd
    const smerZ = (hracPozice.z - nepritel.pozice.z) / vzd
    const posun = def.rychlost * dtSekund
    return {
      ...nepritel,
      faze: 'honi',
      pozice: { x: nepritel.pozice.x + smerX * posun, z: nepritel.pozice.z + smerZ * posun },
    }
  }

  return nepritel.faze === 'klid' ? nepritel : { ...nepritel, faze: 'klid' as FazeNepritele }
}

export interface VysledekUtokuNepritele {
  provedeno: boolean
  poskozeni: number
  nepritel: NepritelRuntimeStav
}

/** appka zkouší útok nepřítele na hráče — jen ve fázi "útočí" a jen
 *  po uplynutí cooldownu. Appčina ochrana proti nekonečnému nebo
 *  neúmyslně opakovanému poškození platí stejně pro nepřítele jako
 *  pro hráče níž. */
export const pokusUtokNepritele = (
  nepritel: NepritelRuntimeStav,
  def: NepritelDef,
  casMs: number
): VysledekUtokuNepritele => {
  if (nepritel.faze !== 'utoci') return { provedeno: false, poskozeni: 0, nepritel }
  if (casMs - nepritel.posledniUtokMs < def.cooldownUtokuMs) return { provedeno: false, poskozeni: 0, nepritel }
  return {
    provedeno: true,
    poskozeni: def.poskozeni,
    nepritel: { ...nepritel, posledniUtokMs: casMs },
  }
}

export interface VysledekUtokuHrace {
  provedeno: boolean
  poskozeni: number
  nepritel: NepritelRuntimeStav
  porazen: boolean
}

/** appka zkouší útok hráče na nepřítele — jedno zmáčknutí appčina
 *  útočného tlačítka vede k přesně jednomu vyhodnocení (appka tuhle
 *  funkci volá jen z onClick, nikdy z herní smyčky), appka tím sama
 *  ze svojí podstaty vylučuje "animaci tlačítka bez skutečného
 *  efektu" i opakované poškození z jednoho zmáčknutí. appka i tady
 *  ověřuje dosah + cooldown znovu — appka se nespoléhá na to, co UI
 *  už ověřilo, appčina stejná zásada jako jinde v appce. */
export const pokusUtokHrace = (
  nepritel: NepritelRuntimeStav,
  vzdalenostKNepriteli: number,
  posledniUtokHraceMs: number,
  casMs: number,
  nahodne: () => number = Math.random
): VysledekUtokuHrace => {
  if (nepritel.faze === 'mrtvy') return { provedeno: false, poskozeni: 0, nepritel, porazen: false }
  if (vzdalenostKNepriteli > DOSAH_UTOKU_HRACE) return { provedeno: false, poskozeni: 0, nepritel, porazen: false }
  if (casMs - posledniUtokHraceMs < COOLDOWN_UTOKU_HRACE_MS) {
    return { provedeno: false, poskozeni: 0, nepritel, porazen: false }
  }

  const poskozeni = Math.round(POSKOZENI_HRACE_MIN + nahodne() * (POSKOZENI_HRACE_MAX - POSKOZENI_HRACE_MIN))
  const novyHp = Math.max(0, nepritel.hp - poskozeni)
  const porazen = novyHp <= 0

  return {
    provedeno: true,
    poskozeni,
    porazen,
    nepritel: porazen
      ? { ...nepritel, hp: 0, faze: 'mrtvy' as FazeNepritele, respawnOdMs: casMs + RESPAWN_PO_MS }
      : { ...nepritel, hp: novyHp },
  }
}

/** appka ví, jestli je bezpečné nepřítele znovu vytvořit — nikdy dřív,
 *  než respawnOdMs uplyne. */
export const melByRespawnovat = (nepritel: NepritelRuntimeStav, casMs: number): boolean =>
  nepritel.faze === 'mrtvy' && casMs >= nepritel.respawnOdMs

/** appka pro appčin HUD zjistí, jestli je útočné tlačítko doopravdy
 *  "připravené" — appka tím zabraňuje tlačítku vypadat klikatelně, i
 *  když by útok stejně tiše nic neudělal. */
export const jePripravenUtok = (
  nepritel: NepritelRuntimeStav,
  vzdalenostKNepriteli: number,
  posledniUtokHraceMs: number,
  casMs: number
): boolean =>
  nepritel.faze !== 'mrtvy' &&
  vzdalenostKNepriteli <= DOSAH_UTOKU_HRACE &&
  casMs - posledniUtokHraceMs >= COOLDOWN_UTOKU_HRACE_MS

/** Je obrana v tomhle snímku doopravdy aktivní — appka to počítá
 *  vždycky znovu z reálného časového okna, ne z nějaké zvlášť
 *  uložené "aktivní" vlajky. */
export const jeObranaAktivni = (obranaAktivniDoMs: number, casMs: number): boolean => casMs < obranaAktivniDoMs

/** Smí hráč obranu znovu aktivovat — appka pro appčin HUD, stejná
 *  zásada jako jePripravenUtok výš (tlačítko nikdy nevypadá klikatelně,
 *  i kdyby stejně nic neudělalo). */
export const jeObranaPripravena = (obranaCooldownDoMs: number, casMs: number): boolean => casMs >= obranaCooldownDoMs

export interface VysledekAktivaceObrany {
  obranaAktivniDoMs: number
  obranaCooldownDoMs: number
}

/** Appka zkusí obranu aktivovat — appka appku sama ověří appčin
 *  cooldown (appka se nespoléhá na to, co už ověřilo UI, stejná
 *  zásada jako appka pokusUtokHrace výš) a vrátí `null`, pokud ještě
 *  neuplynul. */
export const aktivujObranu = (obranaCooldownDoMs: number, casMs: number): VysledekAktivaceObrany | null => {
  if (!jeObranaPripravena(obranaCooldownDoMs, casMs)) return null
  return {
    obranaAktivniDoMs: casMs + OBRANA_TRVANI_MS,
    obranaCooldownDoMs: casMs + OBRANA_COOLDOWN_MS,
  }
}

/** Sníží poškození podle obrany, pokud je doopravdy aktivní — scéna
 *  ji volá vždy, bez ohledu na zdroj poškození (běžný nepřítel i
 *  boss stejně). */
export const redukujPoskozeniObranou = (poskozeni: number, obranaAktivni: boolean): number =>
  obranaAktivni ? Math.round(poskozeni * OBRANA_PODIL_POSKOZENI) : poskozeni
