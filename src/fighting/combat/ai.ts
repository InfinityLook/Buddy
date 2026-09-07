import { efektivniAkceData } from './engine'
import { maNaSpecial } from './loop'
import { VSECHNY_POSTAVY, type PostavaId } from './postavy'
import type { BojovnikStav, HracVstup } from './types'

// ==========================================
// Fáze 5 — sólo režim proti počítači: jednoduchý reaktivní bot, ne
// učení ani prohledávání stavového prostoru. Stejná disciplína jako
// zbytek enginu — čistá funkce, žádný React, žádná síť — s jedním
// rozdílem oproti Fázi 1: enginu samotnému šlo o determinismus kvůli
// budoucí synchronizaci mezi dvěma zařízeními (viz engine.ts), ale
// tenhle bot běží výhradně lokálně na TV, nikdy se s ničím
// nesynchronizuje, takže Math.random() tu žádný problém nedělá —
// `nahodne` je injektovatelné jen kvůli testovatelnosti (deterministické
// testy), ne kvůli replay/sync požadavku enginu.
//
// Bot nemá žádnou paměť mezi tiky (žádný "co jsem dělal minule" stav) —
// každé rozhodnutí se dělá znovu z aktuálního BojovnikStav obou stran.
// To je to, co dělá "reaktivní": reaguje na to, co vidí právě teď, ne
// na plán. Právě proto útok navrhuje jen s určitou pravděpodobností za
// tik (AI_SANCE_UTOKU), ne pokaždé, když je v dosahu — bez toho by bot
// zaútočil znovu ve stejném tiku, kdy mu doběhne cooldown z předchozího
// útoku, a efektivně by "držel tlačítko" bez mezer, což skutečný hráč
// (jehož vstup prochází hranovou detekcí v loop.ts) udělat nemůže.
// ==========================================

/** Šance za tik, že bot zaútočí, když je soupeř v dosahu — pro
 *  'normalni' obtížnost, výchozí i pro starší volání bez třetího
 *  argumentu. Jedenácté kolo vylepšení přidalo OBTIZNOSTI (níž) jako
 *  násobek/úpravu téhle a dalších dvou konstant, ne tři úplně
 *  oddělené sady čísel — o kolik je "Těžká" horší soupeř, je tak jedno
 *  centrální číslo na obtížnost, ne tři different-per-tier konstanty
 *  co by šly rozejít. */
export const AI_SANCE_UTOKU = 0.12
/** Z útoků, které se bot rozhodne zahájit, jak velká část zkusí
 *  speciál místo kopu (jen pokud na něj má manu). */
export const AI_SANCE_SPECIALU = 0.4
/** Šance, že bot zablokuje, když soupeř zrovna útočí a je v jeho
 *  dosahu — schválně ne 100 %, ať to není neporazitelná zeď. */
export const AI_SANCE_BLOKU = 0.5

/** Jedenácté kolo vylepšení — tři obtížnosti bota, vybírané na čekací
 *  obrazovce (TvHost.tsx) předtím, než "Hrát proti počítači" doplní
 *  slot 2. Appka je NEřeší jako tři sady čísel napsaných zvlášť —
 *  `NASOBICE_OBTIZNOSTI` jen škáluje ty tři AI_SANCE_* konstanty výš,
 *  ať je jasné, že se všechny tři obtížnosti liší jen v TOM, JAK
 *  ČASTO/PŘESNĚ bot dělá přesně tu samou sadu reaktivních rozhodnutí,
 *  ne v tom, že by "Těžká" znala něco, co "Lehká" neumí. */
export type Obtiznost = 'lehka' | 'normalni' | 'tezka'

const NASOBICE_OBTIZNOSTI: Record<Obtiznost, { utok: number; specialu: number; bloku: number }> = {
  lehka: { utok: 0.6, specialu: 0.5, bloku: 0.4 },
  normalni: { utok: 1, specialu: 1, bloku: 1 },
  tezka: { utok: 1.6, specialu: 1.3, bloku: 1.7 },
}

export const VYCHOZI_OBTIZNOST: Obtiznost = 'normalni'

export const pripravAkciAi = (
  ja: BojovnikStav,
  souper: BojovnikStav,
  obtiznost: Obtiznost = VYCHOZI_OBTIZNOST,
  nahodne: () => number = Math.random
): HracVstup => {
  const nasobice = NASOBICE_OBTIZNOSTI[obtiznost]
  const vzdalenost = souper.pozice - ja.pozice
  const absVzdalenost = Math.abs(vzdalenost)

  // Reaktivní blok — soupeř zrovna zahájil akci (utokKonci > 0) a je
  // v dosahu té konkrétní akce (ne dosahu bota samotného).
  if (souper.utokKonci > 0 && souper.posledniAkce) {
    const dataSoupere = efektivniAkceData(souper.postavaId, souper.posledniAkce)
    if (absVzdalenost <= dataSoupere.dosah && nahodne() < Math.min(1, AI_SANCE_BLOKU * nasobice.bloku)) {
      return { smer: null, blok: true, akce: null }
    }
  }

  const dataKopu = efektivniAkceData(ja.postavaId, 'kop')
  const naDosahu = absVzdalenost <= dataKopu.dosah

  if (!naDosahu) {
    return { smer: vzdalenost > 0 ? 'vpravo' : 'vlevo', blok: false, akce: null }
  }

  if (nahodne() < Math.min(1, AI_SANCE_UTOKU * nasobice.utok)) {
    const dataSpecialu = efektivniAkceData(ja.postavaId, 'specialni')
    const zkusitSpecial =
      maNaSpecial(ja, dataSpecialu) && nahodne() < Math.min(1, AI_SANCE_SPECIALU * nasobice.specialu)
    return { smer: null, blok: false, akce: zkusitSpecial ? 'specialni' : 'kop' }
  }

  return { smer: null, blok: false, akce: null }
}

/** Náhodná postava pro počítačového soupeře — stejný roster, žádné
 *  zvýhodnění. Injektovatelné `nahodne` ze stejného důvodu jako výše. */
export const nahodnaPostava = (nahodne: () => number = Math.random): PostavaId =>
  VSECHNY_POSTAVY[Math.min(VSECHNY_POSTAVY.length - 1, Math.floor(nahodne() * VSECHNY_POSTAVY.length))].id
