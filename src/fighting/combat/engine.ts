import type { AkceData, BojovnikStav, HracVstup, SoubojStav, UtocnaAkce } from './types'
import { POSTAVY, VYCHOZI_POSTAVA, type PostavaId, type TypSpecialu } from './postavy'

// ==========================================
// Fáze 1 — čistý soubojový engine, žádné vedlejší efekty, žádné
// Math.random() (poškození je pevné číslo, ne rozsah, viz AKCE_DATA)
// — deterministický vstup vždy dá deterministický výstup, což je
// jediné, co Fáze 1 potřebuje dokázat testy bez browseru (stejná
// disciplína jako game/leveling.ts).
// ==========================================

export const ARENA_SIRKA = 800
export const RYCHLOST_POHYBU = 220 // jednotek za sekundu
export const MAX_HP = 100
export const MAX_MANA = 100
/** Kolik ms po neblokovaném zásahu obránce nemůže jednat. */
export const HITSTUN_MS = 200
/** O kolik blok sníží poškození (0.75 = zbyde 25 %). */
export const BLOK_REDUKCE = 0.75
/** Kolik many útočník získá za každý zásah, co skutečně trefí. */
export const MANA_ZA_ZASAH = 15
/** Pasivní regenerace many, ať se děje cokoliv. */
export const MANA_REGEN_ZA_S = 4
/** Vylepšení — časový limit kola (ms). Bez tohohle mohlo kolo trvat
 *  věčně, když oba jen uhýbají/blokují a nikdo neriskuje útok — po
 *  vypršení rozhodne víc HP, shoda je remíza, stejně čestně jako
 *  simultánní KO výš. */
export const CAS_LIMIT_MS = 60000

export const AKCE_DATA: Record<UtocnaAkce, AkceData> = {
  udar: { poskozeni: 6, dosah: 90, trvaniMs: 250, cenaMany: 0 },
  kop: { poskozeni: 10, dosah: 110, trvaniMs: 400, cenaMany: 0 },
  specialni: { poskozeni: 22, dosah: 140, trvaniMs: 600, cenaMany: 40 },
}

export const vytvorBojovnika = (pozice: number, postavaId: PostavaId = VYCHOZI_POSTAVA): BojovnikStav => {
  const postava = POSTAVY[postavaId]
  return {
    hp: MAX_HP * postava.maxHpNasobic,
    maxHp: MAX_HP * postava.maxHpNasobic,
    // Mana se začíná od nuly — speciální schopnost se musí nejdřív
    // vybojovat, ne že by šla hned na první tah.
    mana: 0,
    maxMana: MAX_MANA,
    pozice,
    postavaId,
    blokuje: false,
    zranitelnostKonci: 0,
    utokKonci: 0,
    posledniAkce: null,
    stitAktivni: false,
  }
}

/** Fáze 2 — základní čísla akce (AKCE_DATA výše) upravená podle
 *  násobičů konkrétní postavy. Jediné místo, kde se obecný vzorec
 *  akce ("kop dá 10 a stojí 400ms") spojuje s osobním stylem postavy
 *  ("Volt je o 30 % rychlejší") v jedno konkrétní číslo — tikBojovnika
 *  i vyhodnotZasahPokudZahajen volají výhradně tohle, nikdy AKCE_DATA
 *  přímo. Vylepšení přidalo jediný další řádek: postava s efektem
 *  speciálu 'poskozeni' (viz postavy.ts's TypSpecialu) dostává navíc
 *  specialniSila násobič, ale JEN na specialni akci — udar/kop se
 *  tím nemění, na rozdíl od poskozeniNasobic, který platí na všechno. */
export const efektivniAkceData = (postavaId: PostavaId, akce: UtocnaAkce): AkceData => {
  const zaklad = AKCE_DATA[akce]
  const postava = POSTAVY[postavaId]
  const bonusSpecialu = akce === 'specialni' && postava.specialEfekt === 'poskozeni' ? postava.specialniSila : 1
  return {
    poskozeni: zaklad.poskozeni * postava.poskozeniNasobic * bonusSpecialu,
    dosah: zaklad.dosah * postava.dosahNasobic,
    trvaniMs: zaklad.trvaniMs / postava.rychlostNasobic,
    cenaMany: zaklad.cenaMany * postava.cenaManyNasobic,
  }
}

export const vytvorSoubojStav = (
  pozice0: number,
  pozice1: number,
  postava0: PostavaId = VYCHOZI_POSTAVA,
  postava1: PostavaId = VYCHOZI_POSTAVA
): SoubojStav => ({
  hraci: [vytvorBojovnika(pozice0, postava0), vytvorBojovnika(pozice1, postava1)],
  cas: 0,
  vitez: null,
  stavKola: 'probiha',
})

interface VysledekTiku {
  dalsi: BojovnikStav
  /** Akce, kterou bojovník tenhle tik skutečně zahájil (ne jen
   *  zmáčkl tlačítko) — null, pokud nic nezačal (busy, blokoval,
   *  nebo na speciální neměl manu). */
  zahajenaAkce: UtocnaAkce | null
}

/** Posune jednoho bojovníka o jeden krok — pohyb, blok, případné
 *  zahájení útoku. Samotné vyhodnocení zásahu (dosah, poškození) dělá
 *  krokSouboje až poté, co jsou pohnutí obou hráčů hotová, aby se
 *  dosah počítal z pozic na konci tiku, ne na jeho začátku. */
const tikBojovnika = (b: BojovnikStav, vstup: HracVstup, deltaMs: number): VysledekTiku => {
  const zranitelnostKonci = Math.max(0, b.zranitelnostKonci - deltaMs)
  const utokKonci = Math.max(0, b.utokKonci - deltaMs)
  const mana = Math.min(b.maxMana, b.mana + (MANA_REGEN_ZA_S * deltaMs) / 1000)

  // Uprostřed hitstunu nebo vlastního útoku (i z minulého tiku) bojovník
  // ignoruje veškerý nový vstup — mana ale běží dál, regenerace není
  // vázaná na to, jestli zrovna může jednat.
  const busy = zranitelnostKonci > 0 || utokKonci > 0
  if (busy) {
    return {
      dalsi: { ...b, zranitelnostKonci, utokKonci, mana, blokuje: false },
      zahajenaAkce: null,
    }
  }

  const rychlostPostavy = POSTAVY[b.postavaId].rychlostNasobic
  let pozice = b.pozice
  if (vstup.smer === 'vlevo') pozice = Math.max(0, pozice - (RYCHLOST_POHYBU * rychlostPostavy * deltaMs) / 1000)
  if (vstup.smer === 'vpravo') pozice = Math.min(ARENA_SIRKA, pozice + (RYCHLOST_POHYBU * rychlostPostavy * deltaMs) / 1000)

  // Zmáčknutá akce přebije blok — jednodušší pravidlo než "blok
  // pohltí útočné tlačítko", a nezavádí to stav, kdy vstup nic neudělá.
  const blokuje = vstup.blok && !vstup.akce

  let novyUtokKonci = 0
  let zahajenaAkce: UtocnaAkce | null = null
  let manaPoUtoku = mana
  let stitAktivni = b.stitAktivni
  if (!blokuje && vstup.akce) {
    const data = efektivniAkceData(b.postavaId, vstup.akce)
    const maNaTo = vstup.akce !== 'specialni' || mana >= data.cenaMany
    if (maNaTo) {
      novyUtokKonci = data.trvaniMs
      zahajenaAkce = vstup.akce
      if (vstup.akce === 'specialni') {
        manaPoUtoku = mana - data.cenaMany
        // Vylepšení — 'stit' efekt (Bulwark) se aktivuje ZAHÁJENÍM
        // speciálu, ne jeho zásahem — štít chrání i když soupeř
        // zrovna není v dosahu.
        if (POSTAVY[b.postavaId].specialEfekt === 'stit') stitAktivni = true
      }
    }
    // Bez many speciální prostě nevyjde — žádný cooldown, žádný trest,
    // jen promarněný stisk (stejná "no-op, ne chyba" shovívavost jako
    // dvojklik na už dané lajk jinde v appce).
  }

  return {
    dalsi: {
      ...b,
      pozice,
      blokuje,
      zranitelnostKonci: 0,
      utokKonci: novyUtokKonci,
      mana: manaPoUtoku,
      posledniAkce: zahajenaAkce ?? b.posledniAkce,
      stitAktivni,
    },
    zahajenaAkce,
  }
}

interface VysledekJednohoZasahu {
  hraci: [BojovnikStav, BojovnikStav]
  /** Kolik poškození SKUTEČNĚ prošlo (po štítu i bloku) — 'vysati'
   *  léčí útočníka podle tohohle čísla, ne podle zamýšleného základu. */
  poskozeniDorucene: number
}

/** Jeden zásah proti jednomu cíli — vytažené z vyhodnotZasahPokudZahajen,
 *  aby ho 'dvojity-zasah' (Volt) mohl zavolat dvakrát po sobě ve
 *  stejném tiku, s výsledkem prvního volání jako vstupem druhého
 *  (spotřebovaný štít z prvního zásahu se tak správně projeví i na
 *  druhém). Obrana (postavova, ne štít/blok) je vlastnost CÍLE, počítá
 *  se z `poskozeniZaklad`, které si volající už spočítal jednou předem
 *  — netřeba počítat dvakrát pro dva zásahy stejné akce. */
const aplikujJedenZasah = (
  hraci: [BojovnikStav, BojovnikStav],
  utocnikIdx: 0 | 1,
  cilIdx: 0 | 1,
  poskozeniZaklad: number
): VysledekJednohoZasahu => {
  const utocnik = hraci[utocnikIdx]
  const cil = hraci[cilIdx]

  // 'stit' efekt (Bulwark) — pohltí tenhle zásah úplně a spotřebuje
  // se, přednost před obyčejným blokem (souběh obou by byl vzácný a
  // engine ho stejně vyhodnotí jako "žádné poškození", tak jako tak).
  if (cil.stitAktivni) {
    const dalsi = [...hraci] as [BojovnikStav, BojovnikStav]
    dalsi[cilIdx] = { ...cil, stitAktivni: false }
    return { hraci: dalsi, poskozeniDorucene: 0 }
  }

  const zasahBlokovan = cil.blokuje
  const poskozeni = zasahBlokovan ? poskozeniZaklad * (1 - BLOK_REDUKCE) : poskozeniZaklad

  const novyCil: BojovnikStav = {
    ...cil,
    hp: Math.max(0, cil.hp - poskozeni),
    // Blokovaný zásah hitstun neuděluje — obránce může jednat hned dál.
    zranitelnostKonci: zasahBlokovan ? cil.zranitelnostKonci : HITSTUN_MS,
  }
  const novyUtocnik: BojovnikStav = {
    ...utocnik,
    mana: Math.min(utocnik.maxMana, utocnik.mana + MANA_ZA_ZASAH),
  }

  const dalsi = [...hraci] as [BojovnikStav, BojovnikStav]
  dalsi[utocnikIdx] = novyUtocnik
  dalsi[cilIdx] = novyCil
  return { hraci: dalsi, poskozeniDorucene: poskozeni }
}

/** Pokud útočník tenhle tik zahájil akci, vyhodnotí dosah a zásah —
 *  volá se zvlášť pro každého hráče v pevném pořadí (0 pak 1), aby
 *  výsledek byl deterministický i při simultánním zásahu obou stran.
 *  Vylepšení přidalo dva další efekty speciálu vedle 'poskozeni'
 *  (ten je celý už v efektivniAkceData — viz komentář tam): 'dvojity-
 *  zasah' (Volt) zavolá aplikujJedenZasah dvakrát, 'vysati' (Onyx)
 *  vyléčí útočníka podle skutečně způsobeného poškození. 'stit'
 *  (Bulwark) se řeší jinde — v tikBojovnika při zahájení akce a v
 *  aplikujJedenZasah při dopadu na cíl, tady se vůbec nezmiňuje. */
const vyhodnotZasahPokudZahajen = (
  hraci: [BojovnikStav, BojovnikStav],
  utocnikIdx: 0 | 1,
  cilIdx: 0 | 1,
  akce: UtocnaAkce | null
): [BojovnikStav, BojovnikStav] => {
  if (!akce) return hraci

  const utocnik = hraci[utocnikIdx]
  const cil = hraci[cilIdx]
  const data = efektivniAkceData(utocnik.postavaId, akce)
  const vzdalenost = Math.abs(utocnik.pozice - cil.pozice)
  if (vzdalenost > data.dosah) return hraci // netrefil se, mimo dosah

  const postavaUtocnika = POSTAVY[utocnik.postavaId]
  const jeSpecialSTemhleTypem = (typ: TypSpecialu) => akce === 'specialni' && postavaUtocnika.specialEfekt === typ

  // Obrana je vlastnost CÍLE, ne útočníka — počítá se tady, jednou,
  // společně pro oba případné zásahy dvojitého úderu.
  const poskozeniZaklad = data.poskozeni * POSTAVY[cil.postavaId].obranaNasobic

  let vysledek = aplikujJedenZasah(hraci, utocnikIdx, cilIdx, poskozeniZaklad)
  let poskozeniCelkem = vysledek.poskozeniDorucene

  if (jeSpecialSTemhleTypem('dvojity-zasah')) {
    vysledek = aplikujJedenZasah(vysledek.hraci, utocnikIdx, cilIdx, poskozeniZaklad)
    poskozeniCelkem += vysledek.poskozeniDorucene
  }

  let dalsi = vysledek.hraci

  if (jeSpecialSTemhleTypem('vysati') && poskozeniCelkem > 0) {
    const u = dalsi[utocnikIdx]
    const sHojenim = [...dalsi] as [BojovnikStav, BojovnikStav]
    sHojenim[utocnikIdx] = { ...u, hp: Math.min(u.maxHp, u.hp + poskozeniCelkem * postavaUtocnika.specialniSila) }
    dalsi = sHojenim
  }

  return dalsi
}

/** Posune celý souboj o jeden krok. Jednou skončené kolo (stavKola
 *  === 'konec') vrací beze změny a se stejnou referencí — restart je
 *  věcí volajícího (nová vytvorSoubojStav()), ne enginu samotného. */
export const krokSouboje = (stav: SoubojStav, vstupy: [HracVstup, HracVstup], deltaMs: number): SoubojStav => {
  if (stav.stavKola === 'konec') return stav

  const t0 = tikBojovnika(stav.hraci[0], vstupy[0], deltaMs)
  const t1 = tikBojovnika(stav.hraci[1], vstupy[1], deltaMs)

  let hraci: [BojovnikStav, BojovnikStav] = [t0.dalsi, t1.dalsi]
  hraci = vyhodnotZasahPokudZahajen(hraci, 0, 1, t0.zahajenaAkce)
  hraci = vyhodnotZasahPokudZahajen(hraci, 1, 0, t1.zahajenaAkce)

  let vitez: 0 | 1 | null = null
  let stavKola: 'probiha' | 'konec' = 'probiha'
  const konec0 = hraci[0].hp <= 0
  const konec1 = hraci[1].hp <= 0
  const novyCas = stav.cas + deltaMs
  if (konec0 || konec1) {
    stavKola = 'konec'
    // Současné KO obou stran je vzácné (jen při stejném tiku), ale
    // engine ho musí umět vrátit jako remízu, ne si vybrat vítěze.
    vitez = konec0 && konec1 ? null : konec0 ? 1 : 0
  } else if (novyCas >= CAS_LIMIT_MS) {
    // Vylepšení — čas vypršel a nikdo nedostal KO. Rozhodne víc HP,
    // přesná shoda je remíza — stejná dvouhodnotová logika jako KO
    // výš, jen založená na HP místo na "kdo je na nule".
    stavKola = 'konec'
    if (hraci[0].hp > hraci[1].hp) vitez = 0
    else if (hraci[1].hp > hraci[0].hp) vitez = 1
    else vitez = null
  }

  return { hraci, cas: novyCas, vitez, stavKola }
}
