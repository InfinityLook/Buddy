import { VlnaKonfigurace } from '../types'
import { dostupnaMonstra } from './monsters'

// ==========================================
// Parametrický wave systém (bod 7 zadání) — appka nemá 100 ručně
// napsaných vln, jen vzorec. Obtížnost roste NEJEN počtem monster, ale
// i statMultiplikatorem (HP/damage nepřátel v engine/combat.ts) a
// klesajícím intervalem spawnu (rychlejší přísun).
// ==========================================

/** Násobek 10 = boss vlna. */
export const jeBossVlna = (cislo: number): boolean => cislo % 10 === 0

/** Milník, ke kterému boss vlna patří (10, 20, 30, ...). */
export const bossMilnik = (cislo: number): number => cislo

/** Bod 18 zadání ("continue or extract") — appka nabídne "extrahovat,
 *  nebo pokračovat" po každé páté vlně, VČETNĚ boss milníků (10, 20,
 *  30, ... jsou taky násobky 5) — poražení bosse je přirozený bod, kde
 *  se dá bezpečně "vystoupit", ne jen zvláštní případ k ošetření. */
export const EXTRAKCE_INTERVAL = 5
export const jeExtrakcniVlna = (cislo: number): boolean => cislo % EXTRAKCE_INTERVAL === 0

export const vypocitejVlnu = (cislo: number): VlnaKonfigurace => {
  if (jeBossVlna(cislo)) {
    return {
      cislo,
      jeBoss: true,
      pocetNepratel: 0,
      intervalSpawnuMs: 0,
      // Boss na vyšších milnících (20/30/...) je silnější, i když jde
      // pořád o stejného Shadow Wolfa (viz bosses.ts) — appka ho škáluje
      // stejným vzorcem jako běžné nepřátele o kus níž.
      statMultiplikator: 1 + (cislo / 10 - 1) * 0.6,
      dostupneTypy: [],
    }
  }

  // Počet nepřátel — pomalu rostoucí křivka, řádově odpovídá příkladu
  // ze zadání (10, 15, 20, ...), ale je to vzorec, ne tabulka.
  const pocetNepratel = Math.round(10 + Math.pow(cislo - 1, 1.35) * 3.2)

  // Interval spawnu (ms) klesá s vlnou — monstra chodí čím dál rychleji
  // za sebou, dokud nenarazí na spodní hranici (appka nechce spawn
  // rychlejší než jednou za 220 ms, jinak by to přestalo být čitelné).
  const intervalSpawnuMs = Math.max(220, 1400 - cislo * 22)

  // Statový násobič — 8 % těžší za každou vlnu, průběžně, ne jen
  // skokem na miléncích.
  const statMultiplikator = 1 + (cislo - 1) * 0.08

  return {
    cislo,
    jeBoss: false,
    pocetNepratel,
    intervalSpawnuMs,
    statMultiplikator,
    dostupneTypy: dostupnaMonstra(cislo).map((m) => m.id),
  }
}
