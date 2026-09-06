import { describe, expect, it } from 'vitest'
import {
  aktualizujStatistikyZapasu,
  detekujAkci,
  hpProcenta,
  jeZatmeniAktivni,
  manaProcenta,
  maNaSpecial,
  poziceProcenta,
  prazdneStatistikyZapasu,
  sestavVstup,
  stavBalvanuAreny,
  vizualniStavBojovnika,
  vztekProcenta,
  zbyvaSekund,
} from '@/fighting/combat/loop'
import {
  AKCE_DATA,
  ARENA_SIRKA,
  CAS_LIMIT_MS,
  UDALOST_PERIODA_MS,
  UDALOST_VAROVANI_MS,
  UDALOST_ZATMENI_PERIODA_MS,
  UDALOST_ZATMENI_TRVANI_MS,
  VZTEK_MAX,
  krokSouboje,
  vytvorBojovnika,
  vytvorSoubojStav,
} from '@/fighting/combat/engine'
import type { HracVstup } from '@/fighting/combat/types'
import type { Tlacitko } from '@/fighting/types'

const PRAZDNA: Record<Tlacitko, boolean> = { udar: false, kop: false, blok: false, specialni: false }

describe('detekujAkci', () => {
  it('vrátí null, když nic nepřešlo z nedrženo na drženo', () => {
    expect(detekujAkci(PRAZDNA, PRAZDNA)).toBeNull()
  })

  it('vrátí null, když bylo tlačítko drženo už předchozí tik (ne čerstvý stisk)', () => {
    const drzeno = { ...PRAZDNA, udar: true }
    expect(detekujAkci(drzeno, drzeno)).toBeNull()
  })

  it('detekuje čerstvý stisk úderu', () => {
    expect(detekujAkci(PRAZDNA, { ...PRAZDNA, udar: true })).toBe('udar')
  })

  it('při simultánním stisku více tlačítek vrátí podle pevného pořadí (udar > kop > specialni)', () => {
    const aktualni = { ...PRAZDNA, kop: true, specialni: true }
    expect(detekujAkci(PRAZDNA, aktualni)).toBe('kop')
  })

  it('puštění tlačítka (drženo -> nedrženo) není akce', () => {
    const drzeno = { ...PRAZDNA, kop: true }
    expect(detekujAkci(drzeno, PRAZDNA)).toBeNull()
  })

  // Desáté kolo vylepšení — chyt (grab). Žádné nové tlačítko, jen
  // kombinace úderu s drženým blokem.
  it('čerstvý úder SPOLU s drženým blokem je chyt, ne obyčejný úder', () => {
    const aktualni = { ...PRAZDNA, udar: true, blok: true }
    expect(detekujAkci(PRAZDNA, aktualni)).toBe('chyt')
  })

  it('obyčejný úder bez bloku zůstává obyčejný úder', () => {
    expect(detekujAkci(PRAZDNA, { ...PRAZDNA, udar: true })).toBe('udar')
  })

  it('blok držený už z minula (ne čerstvě) se čerstvým úderem pořád dá chyt', () => {
    const predchozi = { ...PRAZDNA, blok: true }
    const aktualni = { ...PRAZDNA, blok: true, udar: true }
    expect(detekujAkci(predchozi, aktualni)).toBe('chyt')
  })

  it('kop se blokem chytem nestává — kombinace platí jen pro úder', () => {
    const aktualni = { ...PRAZDNA, kop: true, blok: true }
    expect(detekujAkci(PRAZDNA, aktualni)).toBe('kop')
  })
})

describe('sestavVstup', () => {
  it('poskládá HracVstup se směrem, blokem a hranově detekovanou akcí', () => {
    const vstup = sestavVstup('vpravo', PRAZDNA, { ...PRAZDNA, blok: true, specialni: true })
    expect(vstup.smer).toBe('vpravo')
    expect(vstup.blok).toBe(true)
    expect(vstup.akce).toBe('specialni')
  })

  it('null směr a žádná čerstvá akce dá čistý "nic se neděje" vstup', () => {
    const drzeno = { ...PRAZDNA, blok: true }
    const vstup = sestavVstup(null, drzeno, drzeno)
    expect(vstup).toEqual({ smer: null, blok: true, akce: null })
  })
})

describe('hpProcenta / manaProcenta', () => {
  it('plné HP a plná mana dají 100 %', () => {
    const b = vytvorBojovnika(0)
    expect(hpProcenta(b)).toBe(100)
    expect(manaProcenta(b)).toBe(0) // mana startuje na nule (viz engine.ts)
  })

  it('poloviční HP dá 50 %', () => {
    const b = { ...vytvorBojovnika(0), hp: 50 }
    expect(hpProcenta(b)).toBe(50)
  })

  it('nikdy nevrátí záporné procento ani přes 100 %', () => {
    const zaporne = { ...vytvorBojovnika(0), hp: -20 }
    expect(hpProcenta(zaporne)).toBe(0)
    const pres = { ...vytvorBojovnika(0), mana: 999 }
    expect(manaProcenta(pres)).toBe(100)
  })
})

describe('poziceProcenta', () => {
  it('pozice na začátku arény je 0 %, uprostřed 50 %, na konci 100 %', () => {
    expect(poziceProcenta(vytvorBojovnika(0), ARENA_SIRKA)).toBe(0)
    expect(poziceProcenta(vytvorBojovnika(ARENA_SIRKA / 2), ARENA_SIRKA)).toBe(50)
    expect(poziceProcenta(vytvorBojovnika(ARENA_SIRKA), ARENA_SIRKA)).toBe(100)
  })
})

describe('vizualniStavBojovnika', () => {
  it('hp<=0 má přednost před vším ostatním (ko)', () => {
    const b = { ...vytvorBojovnika(0), hp: 0, zranitelnostKonci: 100, blokuje: true, utokKonci: 100 }
    expect(vizualniStavBojovnika(b)).toBe('ko')
  })

  it('hitstun má přednost před blokem', () => {
    const b = { ...vytvorBojovnika(0), zranitelnostKonci: 100, blokuje: true }
    expect(vizualniStavBojovnika(b)).toBe('hitstun')
  })

  it('blok má přednost před útokem', () => {
    const b = { ...vytvorBojovnika(0), blokuje: true, utokKonci: 100 }
    expect(vizualniStavBojovnika(b)).toBe('blok')
  })

  it('bez ničeho z výše je idle', () => {
    expect(vizualniStavBojovnika(vytvorBojovnika(0))).toBe('idle')
  })
})

describe('maNaSpecial', () => {
  it('false, když mana nestačí na cenu speciálu', () => {
    const b = { ...vytvorBojovnika(0), mana: 10 }
    expect(maNaSpecial(b, AKCE_DATA.specialni)).toBe(false)
  })

  it('true, když mana stačí přesně na cenu', () => {
    const b = { ...vytvorBojovnika(0), mana: AKCE_DATA.specialni.cenaMany }
    expect(maNaSpecial(b, AKCE_DATA.specialni)).toBe(true)
  })
})

describe('vylepšení — zbyvaSekund', () => {
  it('na začátku kola vrátí celý limit v sekundách', () => {
    const stav = vytvorSoubojStav(0, 80)
    expect(zbyvaSekund(stav)).toBe(CAS_LIMIT_MS / 1000)
  })

  it('klesá s uplynulým časem', () => {
    const stav = { ...vytvorSoubojStav(0, 80), cas: CAS_LIMIT_MS - 5000 }
    expect(zbyvaSekund(stav)).toBe(5)
  })

  it('nikdy nejde do záporu, i po vypršení limitu', () => {
    const stav = { ...vytvorSoubojStav(0, 80), cas: CAS_LIMIT_MS + 9000 }
    expect(zbyvaSekund(stav)).toBe(0)
  })
})

describe('osmé kolo vylepšení — přehled zápasu (aktualizujStatistikyZapasu)', () => {
  const stat: HracVstup = { smer: null, blok: false, akce: null }

  it('predchozi === null vrátí akumulátor beze změny (první tik po startu)', () => {
    const stav = vytvorSoubojStav(0, 80)
    const akumulator = prazdneStatistikyZapasu()
    expect(aktualizujStatistikyZapasu(null, stav, akumulator)).toBe(akumulator)
  })

  it('napočítá doručený zásah tomu, kdo zasáhl, ne tomu, kdo dostal', () => {
    const predchozi = vytvorSoubojStav(0, 80)
    const novy = krokSouboje(predchozi, [{ ...stat, akce: 'kop' }, stat], 50)
    const stat0 = aktualizujStatistikyZapasu(predchozi, novy, prazdneStatistikyZapasu())
    expect(stat0.zasahy).toEqual([1, 0])
  })

  it('sleduje nejvyšší dosažené kombo, ne jen to poslední', () => {
    let predchozi = vytvorSoubojStav(0, 80)
    let akumulator = prazdneStatistikyZapasu()
    let novy = krokSouboje(predchozi, [{ ...stat, akce: 'udar' }, stat], 50)
    akumulator = aktualizujStatistikyZapasu(predchozi, novy, akumulator)
    predchozi = novy
    // Dost dlouhý krok, aby útočník stihl doznít z prvního úderu
    // (AKCE_DATA.udar's trvaniMs), ale pořád uvnitř KOMBO_OKNO_MS.
    novy = krokSouboje(predchozi, [{ ...stat, akce: 'udar' }, stat], 260)
    akumulator = aktualizujStatistikyZapasu(predchozi, novy, akumulator)
    expect(akumulator.nejdelsiKombo[0]).toBeGreaterThanOrEqual(2)
  })

  it('napočítá perfektní blok tomu, kdo ho provedl', () => {
    const predchozi = vytvorSoubojStav(0, 80)
    // Hráč 1 zvedne blok přesně ve stejném tiku, kdy hráč 0 útočí —
    // perfektní blok (viz combat/engine.ts's PARRY_OKNO_MS).
    const novy = krokSouboje(predchozi, [{ ...stat, akce: 'kop' }, { ...stat, blok: true }], 50)
    const akumulator = aktualizujStatistikyZapasu(predchozi, novy, prazdneStatistikyZapasu())
    expect(akumulator.perfektniBloky).toEqual([0, 1])
  })

  it('nemutuje předaný akumulátor, vrací nový objekt', () => {
    const predchozi = vytvorSoubojStav(0, 80)
    const novy = krokSouboje(predchozi, [{ ...stat, akce: 'kop' }, stat], 50)
    const puvodni = prazdneStatistikyZapasu()
    const dalsi = aktualizujStatistikyZapasu(predchozi, novy, puvodni)
    expect(puvodni.zasahy).toEqual([0, 0])
    expect(dalsi).not.toBe(puvodni)
  })
})

describe('desáté kolo vylepšení — vztekProcenta', () => {
  it('0 vztek je 0 %, plný vztek je 100 %', () => {
    const b0 = vytvorBojovnika(0)
    expect(vztekProcenta(b0)).toBe(0)
    expect(vztekProcenta({ ...b0, vztek: VZTEK_MAX })).toBe(100)
  })

  it('nikdy nepřeteče přes 100 %, ani kdyby pole obsahovalo víc', () => {
    const b0 = vytvorBojovnika(0)
    expect(vztekProcenta({ ...b0, vztek: VZTEK_MAX * 2 })).toBe(100)
  })
})

describe('desáté kolo vylepšení — stavBalvanuAreny', () => {
  it('mimo varovné okno hlásí klid', () => {
    const stav = stavBalvanuAreny(0, ARENA_SIRKA)
    expect(stav.varovani).toBe(false)
  })

  it('uvnitř varovného okna PŘED hranicí cyklu hlásí varování', () => {
    const stav = stavBalvanuAreny(UDALOST_PERIODA_MS - UDALOST_VAROVANI_MS + 10, ARENA_SIRKA)
    expect(stav.varovani).toBe(true)
  })

  it('xProcenta je stejné pro stejný cyklus bez ohledu na přesný čas uvnitř něj', () => {
    const a = stavBalvanuAreny(100, ARENA_SIRKA)
    const b = stavBalvanuAreny(UDALOST_PERIODA_MS - 200, ARENA_SIRKA)
    expect(a.xProcenta).toBe(b.xProcenta)
  })
})

describe('desáté kolo vylepšení — jeZatmeniAktivni', () => {
  it('je aktivní na začátku periody', () => {
    expect(jeZatmeniAktivni(0)).toBe(true)
    expect(jeZatmeniAktivni(UDALOST_ZATMENI_TRVANI_MS - 10)).toBe(true)
  })

  it('mimo trvání periody není aktivní', () => {
    expect(jeZatmeniAktivni(UDALOST_ZATMENI_TRVANI_MS + 10)).toBe(false)
  })

  it('opakuje se v každé další periodě', () => {
    expect(jeZatmeniAktivni(UDALOST_ZATMENI_PERIODA_MS + 10)).toBe(true)
  })
})
