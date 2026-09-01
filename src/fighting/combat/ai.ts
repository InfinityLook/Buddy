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

/** Šance za tik, že bot zaútočí, když je soupeř v dosahu. */
export const AI_SANCE_UTOKU = 0.12
/** Z útoků, které se bot rozhodne zahájit, jak velká část zkusí
 *  speciál místo kopu (jen pokud na něj má manu). */
export const AI_SANCE_SPECIALU = 0.4
/** Šance, že bot zablokuje, když soupeř zrovna útočí a je v jeho
 *  dosahu — schválně ne 100 %, ať to není neporazitelná zeď. */
export const AI_SANCE_BLOKU = 0.5

export const pripravAkciAi = (
  ja: BojovnikStav,
  souper: BojovnikStav,
  nahodne: () => number = Math.random
): HracVstup => {
  const vzdalenost = souper.pozice - ja.pozice
  const absVzdalenost = Math.abs(vzdalenost)

  // Reaktivní blok — soupeř zrovna zahájil akci (utokKonci > 0) a je
  // v dosahu té konkrétní akce (ne dosahu bota samotného).
  if (souper.utokKonci > 0 && souper.posledniAkce) {
    const dataSoupere = efektivniAkceData(souper.postavaId, souper.posledniAkce)
    if (absVzdalenost <= dataSoupere.dosah && nahodne() < AI_SANCE_BLOKU) {
      return { smer: null, blok: true, akce: null }
    }
  }

  const dataKopu = efektivniAkceData(ja.postavaId, 'kop')
  const naDosahu = absVzdalenost <= dataKopu.dosah

  if (!naDosahu) {
    return { smer: vzdalenost > 0 ? 'vpravo' : 'vlevo', blok: false, akce: null }
  }

  if (nahodne() < AI_SANCE_UTOKU) {
    const dataSpecialu = efektivniAkceData(ja.postavaId, 'specialni')
    const zkusitSpecial = maNaSpecial(ja, dataSpecialu) && nahodne() < AI_SANCE_SPECIALU
    return { smer: null, blok: false, akce: zkusitSpecial ? 'specialni' : 'kop' }
  }

  return { smer: null, blok: false, akce: null }
}

/** Náhodná postava pro počítačového soupeře — stejný roster, žádné
 *  zvýhodnění. Injektovatelné `nahodne` ze stejného důvodu jako výše. */
export const nahodnaPostava = (nahodne: () => number = Math.random): PostavaId =>
  VSECHNY_POSTAVY[Math.min(VSECHNY_POSTAVY.length - 1, Math.floor(nahodne() * VSECHNY_POSTAVY.length))].id
