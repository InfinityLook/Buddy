import { CAS_LIMIT_MS } from './engine'
import type { AkceData, BojovnikStav, HracVstup, SoubojStav, UtocnaAkce } from './types'
import type { Smer, Tlacitko } from '../types'

// ==========================================
// Fáze 3 — čisté funkce, které stojí mezi "co ovladač zrovna drží" a
// "co jeden tik enginu potřebuje" (krokSouboje z engine.ts) — a mezi
// "jaký je aktuální BojovnikStav" a "jak dlouhý má být health bar na
// TV". Žádná z nich se nedotýká requestAnimationFrame, Supabase ani
// DOM, takže je (na rozdíl od skutečné vykreslovací smyčky v
// TvHost.tsx) jde otestovat stejně jako Fáze 1/2 enginu samotného.
// ==========================================

/** Pořadí, ve kterém se řeší současně zmáčknutá tlačítka v jednom
 *  tiku — na telefonu prakticky nikdy nenastane, ale funkce musí být
 *  deterministická i tak. */
const PORADI_AKCI: UtocnaAkce[] = ['udar', 'kop', 'specialni']

/** Najde tlačítko, které přešlo z "nedrženo" na "drženo" právě mezi
 *  dvěma po sobě jdoucími stavy tlačítek z ovladače — edge detekce,
 *  ne "je drženo". Engine (Fáze 1) chce vědět jen o čerstvém stisku,
 *  ne o tom, že tlačítko zůstává zmáčknuté z minulého tiku. */
export const detekujAkci = (
  predchozi: Record<Tlacitko, boolean>,
  aktualni: Record<Tlacitko, boolean>
): UtocnaAkce | null => {
  for (const akce of PORADI_AKCI) {
    if (aktualni[akce] && !predchozi[akce]) return akce
  }
  return null
}

/** Poskládá HracVstup pro jeden tik enginu ze surového, drženého
 *  stavu ovladače (co appka dostala přes broadcast) plus toho, co
 *  bylo drženo tik předtím — engine sám edge detekci neřeší, jen ji
 *  spotřebovává (viz HracVstup.akce v types.ts). */
export const sestavVstup = (
  smer: Smer | null,
  tlacitkaPredchozi: Record<Tlacitko, boolean>,
  tlacitkaAktualni: Record<Tlacitko, boolean>
): HracVstup => ({
  smer,
  blok: tlacitkaAktualni.blok,
  akce: detekujAkci(tlacitkaPredchozi, tlacitkaAktualni),
})

/** Kolik procent má mít health bar — 0 při hp<=0, ne záporné číslo. */
export const hpProcenta = (b: BojovnikStav): number => Math.max(0, Math.min(100, (b.hp / b.maxHp) * 100))

/** Kolik procent má mít mana bar. */
export const manaProcenta = (b: BojovnikStav): number => Math.max(0, Math.min(100, (b.mana / b.maxMana) * 100))

/** Pozice bojovníka na ose arény jako procento šířky — pro CSS
 *  `left: N%` bez enginu samotného vědět nic o pixelech na obrazovce. */
export const poziceProcenta = (b: BojovnikStav, arenaSirka: number): number =>
  Math.max(0, Math.min(100, (b.pozice / arenaSirka) * 100))

/** Jaký vizuální stav bojovníka právě teď platí — pro CSS třídu na
 *  TV straně. Pořadí kontrol je schválně důležité: KO má přednost
 *  před vším, hitstun před blokem (nemůže blokovat, když je omráčen). */
export type VizualniStavBojovnika = 'ko' | 'hitstun' | 'blok' | 'utok' | 'idle'

export const vizualniStavBojovnika = (b: BojovnikStav): VizualniStavBojovnika => {
  if (b.hp <= 0) return 'ko'
  if (b.zranitelnostKonci > 0) return 'hitstun'
  if (b.blokuje) return 'blok'
  if (b.utokKonci > 0) return 'utok'
  return 'idle'
}

/** Cena many na zobrazení tlačítka speciálu — appka na ovladači/TV
 *  ukazuje, jestli má hráč zrovna na speciál, aniž by musela znát
 *  postavu enginu naslepo (viz FightingModule pro použití). */
export const maNaSpecial = (b: BojovnikStav, dataSpecialu: AkceData): boolean => b.mana >= dataSpecialu.cenaMany

/** Vylepšení — kolik celých sekund do konce časového limitu kola
 *  zbývá (viz engine.ts's CAS_LIMIT_MS), pro TV countdown v
 *  Bojiste.tsx. Nikdy záporně, ani chvíli po vypršení, kdy `stav.cas`
 *  mezitím ještě o kousek přeteče limit než krokSouboje kolo ukončí. */
export const zbyvaSekund = (stav: SoubojStav): number => Math.max(0, Math.ceil((CAS_LIMIT_MS - stav.cas) / 1000))

/** Druhé kolo vylepšení — kolik zásahů má bojovníkovo aktuálně
 *  ROZJETÉ kombo (0, pokud žádné neběží — promlčené komboKonci se
 *  bere jako "nic", ne jako stará hodnota komboPocet, stejná
 *  "engine.ts's aplikujJedenZasah čte to samé" logika, jen na
 *  vykreslovací straně). Pro Bojiste.tsx's odznak "×N", zobrazí se
 *  jen od druhého zásahu v sérii (jeden zásah ještě není "kombo"). */
export const komboAktivni = (b: BojovnikStav): number => (b.komboKonci > 0 ? b.komboPocet : 0)
