import { patriDoObdobi, soucetPocatecnichZustatku, zustatekZTransakci } from '@/miniapps/finance/types'
import type { Transaction, Wallet } from '@/miniapps/finance/types'

// ==========================================
// Odvozené statistiky Economy Roomu ze skutečných transakcí Financí
// (src/miniapps/finance/useFinance.ts) — čisté funkce, žádný vlastní
// store, stejný důvod jako fitnessStats.ts hned vedle (School Roomu):
// testovatelné bez komponenty, jedno místo, které nemůže rozjet
// zobrazenou hodnotu od skutečných dat.
//
// useFinance() sám o sobě vrací jen "tento měsíc" a "vše" — pro srovnání
// s minulým měsícem (delta u Příjmů/Výdajů) je potřeba surové
// transakce, které hook exportuje přesně proto (viz komentář tam).
// ==========================================

export interface MesicniSrovnani {
  prijmyMinuly: number
  vydajeMinuly: number
}

/** Součty minulého měsíce, pro srovnání s `prijmyObdobi`/`vydajeObdobi`
 *  (ty jsou vždy za aktuálně zvolené období — v Economy Roomu vždy
 *  "tento měsíc", protože se `useFinance()` volá s výchozím filtrem). */
export const spocitatMesicniSrovnani = (transactions: Transaction[]): MesicniSrovnani => {
  // Přesuny mezi vlastními peněženkami (Transaction.presunId) nejsou
  // skutečný příjem ani výdaj — bez tohohle filtru by přeložení peněz
  // ze spoření na běžný účet minulý měsíc vypadalo jako další tisíce
  // příjmů i výdajů zároveň, stejný důvod jako useFinance.ts's
  // obdobiTransactionsBezPresunu.
  const minuly = transactions.filter((t) => patriDoObdobi(t, 'minuly-mesic') && !t.presunId)
  return {
    prijmyMinuly: minuly.filter((t) => t.type === 'prijem').reduce((s, t) => s + t.amount, 0),
    vydajeMinuly: minuly.filter((t) => t.type === 'vydaj').reduce((s, t) => s + t.amount, 0),
  }
}

/** Formátovaný rozdíl "+N Kč vs min. měsíc" / "−N Kč vs min. měsíc" —
 *  stejná "absolutní rozdíl, ne procenta" zásada jako
 *  fitnessStats.ts's formatujRozdil, z identického důvodu: u menších
 *  částek (typické kapesné) by procento u nuly v minulém měsíci bylo
 *  nesmyslné nebo přehnaně dramatické, kde absolutní Kč zůstává čitelné
 *  vždy. Vlastní funkce, ne reused formatujRozdil — jiná jednotka (Kč)
 *  a jiné srovnávané období (měsíc, ne včerejšek) by ve sdílené funkci
 *  znamenaly parametr navíc jen pro popisek, což by ji zbytečně
 *  zkomplikovalo pro obě volající appky. */
export const formatujRozdilMesic = (tentoMesic: number, minulyMesicCastka: number): string => {
  const rozdil = tentoMesic - minulyMesicCastka
  if (rozdil === 0) return 'stejně jako minulý měsíc'
  const znamenko = rozdil > 0 ? '+' : '−'
  return `${znamenko}${Math.abs(rozdil).toLocaleString('cs-CZ')} Kč vs min. měsíc`
}

// ==========================================
// Graf čistého jmění v čase — appka dřív ukazovala jen jednotlivé
// měsíce zvlášť (spocitatMesicniSrovnani/spocitejMesicniTrend výš),
// nikde neměla souhrnnou odpověď na "roste, nebo klesá moje jmění v
// čase". Čistá funkce nad daty, co useFinance() už vrací (transactions/
// wallets — obě už bez měkce smazaných záznamů, viz useFinance.ts's
// vlastní komentář), testovatelná bez store/komponenty stejně jako
// spocitejMesicniTrend v Financích.
// ==========================================

const MESICE_ZKRATKY = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro']

export const VYCHOZI_MESICU_JMENI = 6

export interface CisteJmeniBod {
  /** YYYY-MM, pro řazení a jako React key. */
  mesic: string
  /** Zkrácený název měsíce pro popisek pod sloupcem. */
  label: string
  /** Skutečné čisté jmění (peněženky + pohyb transakcí) ke konci
   *  daného měsíce. */
  hodnota: number
  /** Výška sloupce v procentech, 10–90 % — jmění žije v tisících a může
   *  být i záporné, takže sloupec škálovaný od nuly by u menších změn
   *  byl skoro neviditelný nebo by se u záporných hodnot rozbil. Stejné
   *  "škáluj podle rozsahu okna, ne od nuly" řešení jako Fitness
   *  Roomovo spocitejGrafVahy pro váhu (taky v tisících/desítkách, ne
   *  od nuly). */
  vyskaProcent: number
}

/** Graf čistého jmění za posledních `pocetMesicu` měsíců (včetně
 *  aktuálního), počítaný KE KONCI každého měsíce. Peněženka založená až
 *  během okna se do dřívějších měsíců nepočítá — appka bere v úvahu jen
 *  peněženky, co k danému datu už doopravdy existovaly. */
export const spocitejGrafCistehoJmeni = (
  transactions: Transaction[],
  wallets: Wallet[],
  pocetMesicu: number = VYCHOZI_MESICU_JMENI,
  ted: Date = new Date()
): CisteJmeniBod[] => {
  const d = new Date(ted)
  d.setDate(1)

  const surove: { mesic: string; label: string; hodnota: number }[] = []
  for (let i = pocetMesicu - 1; i >= 0; i--) {
    const bod = new Date(d)
    bod.setMonth(bod.getMonth() - i)
    // Poslední den měsíce jako mezní datum — appka počítá jmění KE
    // KONCI měsíce, ne k jeho začátku.
    const konecMesice = new Date(bod.getFullYear(), bod.getMonth() + 1, 0)
    const konecMesiceIso = konecMesice.toISOString().slice(0, 10)

    const pocatecni = soucetPocatecnichZustatku(
      wallets.filter((w) => w.createdAt.slice(0, 10) <= konecMesiceIso)
    )
    const transakceDoKonce = transactions.filter((t) => t.date <= konecMesiceIso)
    const hodnota = zustatekZTransakci(transakceDoKonce, pocatecni)

    surove.push({
      mesic: `${bod.getFullYear()}-${String(bod.getMonth() + 1).padStart(2, '0')}`,
      label: MESICE_ZKRATKY[bod.getMonth()],
      hodnota,
    })
  }

  const min = Math.min(...surove.map((b) => b.hodnota))
  const max = Math.max(...surove.map((b) => b.hodnota))
  const rozsah = max - min

  return surove.map((b) => ({
    ...b,
    vyskaProcent: rozsah === 0 ? 50 : Math.round(((b.hodnota - min) / rozsah) * 80) + 10,
  }))
}
