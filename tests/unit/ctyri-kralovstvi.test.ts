import { describe, expect, it } from 'vitest'
import {
  BODY_ZA_DRAHOKAM,
  BODY_ZA_ZLATO,
  CENA_RIZIKA,
  KORUNA_BONUS,
  OSUDOVE_KARTY,
  POZICE_TRUNU,
  TYPY_POLI,
  hodKostkou,
  konecneProadi,
  skoreHrace,
  vytvorHrace,
  vytvorHruStav,
} from '@/boardgame/ctyriKralovstviTypes'

/** Vrátí hodnotu, díky které `Math.floor(nahodne() * 6) + 1` spolehlivě
 *  vydá přesně `hod` (1–6), bez ohledu na zaokrouhlení na hranici
 *  koše. */
const proHodKostkou = (hod: number) => (hod - 0.5) / 6

/** Vrátí hodnotu, díky které appčin výběr z pole délky `delka`
 *  (`Math.floor(nahodne() * delka)`) spolehlivě vybere index `index`. */
const proIndex = (index: number, delka: number) => (index + 0.5) / delka

/** Injektovatelná fronta hodnot — appka je bere v přesně tomhle
 *  pořadí, stejný vzor jako appčiny ostatní hry (Souboj, Survival
 *  Night) používají pro deterministické testy náhody. */
const zeSeznamu = (hodnoty: number[]) => {
  let i = 0
  return () => {
    if (i >= hodnoty.length) throw new Error('nahodne() zavoláno víckrát, než test čekal')
    return hodnoty[i++]
  }
}

const dvaHraci = () => [vytvorHrace('a', 'Alena', 'ohnive', false), vytvorHrace('b', 'Bedřich', 'vodni', false)]

describe('vytvorHrace / vytvorHruStav', () => {
  it('založí hráče na startu bez zdrojů', () => {
    const h = vytvorHrace('a', 'Alena', 'ohnive', false)
    expect(h.pozice).toBe(0)
    expect(h.zlato).toBe(0)
    expect(h.drahokamy).toBe(0)
    expect(h.dosahlTrunu).toBe(false)
    expect(h.jeUchazecOTrun).toBe(false)
  })

  it('založí hru s prvním hráčem na tahu a fází hod', () => {
    const stav = vytvorHruStav(dvaHraci())
    expect(stav.aktivniIndex).toBe(0)
    expect(stav.faze).toBe('hod')
    expect(stav.uchazecId).toBeNull()
    expect(stav.tahuDoKonce).toBeNull()
  })
})

describe('skoreHrace', () => {
  it('sečte zlato a drahokamy podle sazby', () => {
    const h = { ...vytvorHrace('a', 'A', 'ohnive', false), zlato: 5, drahokamy: 2 }
    expect(skoreHrace(h)).toBe(5 * BODY_ZA_ZLATO + 2 * BODY_ZA_DRAHOKAM)
  })

  it('přičte korunní bonus jen uchazeči o trůn', () => {
    const h = { ...vytvorHrace('a', 'A', 'ohnive', false), zlato: 0, drahokamy: 0, jeUchazecOTrun: true }
    expect(skoreHrace(h)).toBe(KORUNA_BONUS)
  })
})

describe('hodKostkou — pohyb a políčka', () => {
  it('posune hráče o hozené číslo a předá tah dalšímu', () => {
    const stav = vytvorHruStav(dvaHraci())
    const po = hodKostkou(stav, zeSeznamu([proHodKostkou(3)]))
    expect(po.hraci[0].pozice).toBe(3)
    expect(po.posledniHod).toBe(3)
    expect(po.aktivniIndex).toBe(1)
    expect(po.faze).toBe('hod')
  })

  it('na "zlato" políčku přičte zlato podle druhého hodu', () => {
    const indexZlato = TYPY_POLI.findIndex((t) => t === 'zlato')
    const hraci = dvaHraci()
    hraci[0].pozice = indexZlato // o krok 1 dál = přesně na políčko "zlato"
    const stav = vytvorHruStav(hraci)
    const po = hodKostkou(stav, zeSeznamu([proHodKostkou(1), proIndex(1, 3)])) // zisk = floor(x*3)+2 = 1+2 = 3
    expect(po.hraci[0].zlato).toBe(3)
    expect(po.posledniUdalost).toContain('Získal 3 zlata')
  })

  it('na "drahokam" políčku přičte přesně jeden drahokam', () => {
    const indexDrahokam = TYPY_POLI.findIndex((t) => t === 'drahokam')
    const hraci = dvaHraci()
    hraci[0].pozice = indexDrahokam
    const stav = vytvorHruStav(hraci)
    const po = hodKostkou(stav, zeSeznamu([proHodKostkou(1)]))
    expect(po.hraci[0].drahokamy).toBe(1)
  })

  it('na "osud" políčku vylosuje kartu a použije její efekt', () => {
    const indexOsud = TYPY_POLI.findIndex((t) => t === 'osud')
    const indexKartyDar = OSUDOVE_KARTY.findIndex((k) => k.id === 'dar')
    const hraci = dvaHraci()
    hraci[0].pozice = indexOsud
    const stav = vytvorHruStav(hraci)
    const po = hodKostkou(
      stav,
      zeSeznamu([proHodKostkou(1), proIndex(indexKartyDar, OSUDOVE_KARTY.length)])
    )
    expect(po.posledniKarta?.id).toBe('dar')
    expect(po.hraci[0].zlato).toBe(1)
    expect(po.hraci[0].drahokamy).toBe(1)
  })

  it('je no-op, když hra už skončila', () => {
    const stav = { ...vytvorHruStav(dvaHraci()), faze: 'konec' as const }
    const po = hodKostkou(stav, zeSeznamu([proHodKostkou(4)]))
    expect(po).toBe(stav)
  })
})

describe('hodKostkou — trůn a poslední kolo', () => {
  it('první hráč u trůnu se stane uchazečem a dostane bonus do skóre', () => {
    const hraci = dvaHraci()
    hraci[0].pozice = POZICE_TRUNU - 1
    const stav = vytvorHruStav(hraci)
    const po = hodKostkou(stav, zeSeznamu([proHodKostkou(6)]))
    expect(po.hraci[0].pozice).toBe(POZICE_TRUNU)
    expect(po.hraci[0].dosahlTrunu).toBe(true)
    expect(po.hraci[0].jeUchazecOTrun).toBe(true)
    expect(po.uchazecId).toBe('a')
    expect(skoreHrace(po.hraci[0])).toBeGreaterThanOrEqual(KORUNA_BONUS)
  })

  it('dá každému dalšímu království přesně jedno poslední kolo, pak hru ukončí', () => {
    // 3 hráči — jakmile jeden dosáhne trůnu, zbylí dva mají mít
    // každý ještě jeden tah, než appka nastaví faze 'konec'.
    const hraci = [
      vytvorHrace('a', 'A', 'ohnive', false),
      vytvorHrace('b', 'B', 'vodni', false),
      vytvorHrace('c', 'C', 'lesni', false),
    ]
    hraci[0].pozice = POZICE_TRUNU - 1
    let stav = vytvorHruStav(hraci)
    stav = hodKostkou(stav, zeSeznamu([proHodKostkou(6)])) // A dojde k trůnu
    expect(stav.faze).toBe('hod')
    expect(stav.aktivniIndex).toBe(1) // B na tahu
    expect(stav.tahuDoKonce).toBe(2)

    // Pole 3 je "prazdne" — B a C hrají svá poslední kola na
    // políčko bez vedlejšího efektu, ať test ověřuje jen odpočet.
    expect(TYPY_POLI[2]).toBe('prazdne')
    stav = hodKostkou(stav, zeSeznamu([proHodKostkou(3)])) // B hraje své poslední kolo
    expect(stav.faze).toBe('hod')
    expect(stav.aktivniIndex).toBe(2) // C na tahu
    expect(stav.tahuDoKonce).toBe(1)

    stav = hodKostkou(stav, zeSeznamu([proHodKostkou(3)])) // C hraje své poslední kolo
    expect(stav.faze).toBe('konec')
    expect(stav.tahuDoKonce).toBe(0)
  })

  it('pozdější příchozí na trůn nedostane další korunní bonus', () => {
    const hraci = [vytvorHrace('a', 'A', 'ohnive', false), vytvorHrace('b', 'B', 'vodni', false)]
    hraci[0].pozice = POZICE_TRUNU - 1
    hraci[1].pozice = POZICE_TRUNU - 1
    let stav = vytvorHruStav(hraci)
    stav = hodKostkou(stav, zeSeznamu([proHodKostkou(6)])) // A jako první
    stav = hodKostkou(stav, zeSeznamu([proHodKostkou(6)])) // B taky dorazí, ve svém posledním kole
    expect(stav.hraci[1].dosahlTrunu).toBe(true)
    expect(stav.hraci[1].jeUchazecOTrun).toBe(false)
    expect(stav.uchazecId).toBe('a')
    expect(stav.faze).toBe('konec')
  })
})

describe('hodKostkou — vynechání tahu a riziko', () => {
  it('hráč se zapnutým vynechatTah tah přeskočí bez hodu', () => {
    const hraci = dvaHraci()
    hraci[0].vynechatTah = true
    const stav = vytvorHruStav(hraci)
    const po = hodKostkou(stav, zeSeznamu([]))
    expect(po.posledniHod).toBeNull()
    expect(po.hraci[0].pozice).toBe(0)
    expect(po.hraci[0].vynechatTah).toBe(false)
    expect(po.aktivniIndex).toBe(1)
  })

  it('riskovat hodí dvě kostky, vezme vyšší a strhne cenu rizika', () => {
    // Pole 3 je v appčině pevné cestě "prazdne" — test tak ověřuje jen
    // riziko samotné, bez vedlejšího tažení karty/zisku suroviny.
    expect(TYPY_POLI[2]).toBe('prazdne')
    const hraci = dvaHraci()
    hraci[0].zlato = 5
    const stav = vytvorHruStav(hraci)
    const po = hodKostkou(stav, zeSeznamu([proHodKostkou(2), proHodKostkou(3)]), true)
    expect(po.posledniHod).toBe(3)
    expect(po.hraci[0].zlato).toBe(5 - CENA_RIZIKA)
    expect(po.hraci[0].pozice).toBe(3)
  })

  it('riskovat appka potichu ignoruje, když hráč nemá dost zlata', () => {
    expect(TYPY_POLI[2]).toBe('prazdne')
    const hraci = dvaHraci()
    hraci[0].zlato = 0
    const stav = vytvorHruStav(hraci)
    const po = hodKostkou(stav, zeSeznamu([proHodKostkou(3)]), true)
    expect(po.posledniHod).toBe(3)
    expect(po.hraci[0].zlato).toBe(0)
    expect(po.posledniUdalost).not.toContain('riziko')
  })
})

describe('osudová karta "Tajný spojenec"', () => {
  it('ukradne až 2 zlaťáky náhodnému soupeři, ne víc než soupeř má', () => {
    const karta = OSUDOVE_KARTY.find((k) => k.id === 'spojenec')!
    const hraci = [
      { ...vytvorHrace('a', 'A', 'ohnive', false), zlato: 0 },
      { ...vytvorHrace('b', 'B', 'vodni', false), zlato: 1 },
    ]
    const po = karta.ucinek(hraci, 'a', zeSeznamu([proIndex(0, 1)]))
    expect(po.find((h) => h.id === 'a')!.zlato).toBe(1)
    expect(po.find((h) => h.id === 'b')!.zlato).toBe(0)
  })
})

describe('konecneProadi', () => {
  it('seřadí hráče sestupně podle skóre', () => {
    const hraci = [
      { ...vytvorHrace('a', 'A', 'ohnive', false), zlato: 1 },
      { ...vytvorHrace('b', 'B', 'vodni', false), zlato: 10 },
      { ...vytvorHrace('c', 'C', 'lesni', false), zlato: 5 },
    ]
    const proradi = konecneProadi(hraci)
    expect(proradi.map((h) => h.id)).toEqual(['b', 'c', 'a'])
  })
})
