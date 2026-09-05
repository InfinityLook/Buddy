import type { AkceData, BojovnikStav, HracVstup, SoubojMoznosti, SoubojStav, UtocnaAkce } from './types'
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
/** Vylepšení — kombo. Jak dlouho od posledního neblokovaného zásahu
 *  ještě appka bere sérii jako "rozjetou" — dost na jeden rychlý úder
 *  navíc, ne tak dlouho, aby kombo přežilo skutečnou pauzu v akci. */
export const KOMBO_OKNO_MS = 1200
/** O kolik procent navíc dá KAŽDÝ další úder v sérii, oproti tomu
 *  prvnímu (0 % bonus) — lineární škálování, ne exponenciální, ať
 *  dlouhé kombo nezačne dávat absurdní čísla. */
export const KOMBO_BONUS_ZA_UDER = 0.08
/** Strop, po kterém se bonus za další údery v sérii dál nezvyšuje —
 *  bez tohohle by nekonečná série teoreticky mohla dát nekonečné
 *  poškození za jeden zásah. */
export const KOMBO_MAX_STUPNU = 5
/** Vylepšení — parry. Zásah, co dopadne, dokud bojovník drží blok
 *  KRATŠÍ dobu než tohle číslo, je "perfektní blok" — odměna za
 *  reakci na konkrétní úder, ne za to, že hráč blok drží od začátku
 *  kola pořád. Dost krátké, aby to chtělo skutečné načasování, dost
 *  dlouhé, aby to na telefonu vůbec šlo trefit. */
export const PARRY_OKNO_MS = 150
/** Vylepšení — parry. Útočník potrestaný perfektním blokem je omráčen
 *  DÉLE než obyčejný neblokovaný zásah (HITSTUN_MS výš) — perfektní
 *  blok má být citelně horší trest než jen "soupeř se ubránil". */
export const PARRY_TREST_MS = 500
/** Vylepšení — parry. Jak dlouho appka ukazuje vizuální záblesk
 *  "právě jsem perfektně zablokoval" (Bojiste.tsx) — čistě kosmetické
 *  okno, engine sám ho nikde jinde nepoužívá. */
export const PARRY_ZABLESK_MS = 350
/** Vylepšení — comeback. Pod jakým podílem max. HP útočník bojuje
 *  "od zdi" a dostává bonus poškození (COMEBACK_NASOBIC níž) — dost
 *  nízko, aby to nebyl stav, ve kterém je bojovník půl zápasu, ale
 *  skutečná poslední šance na obrat. */
export const COMEBACK_PRAH = 0.3
/** Vylepšení — comeback. O kolik víc poškození dá útočník bojující
 *  pod COMEBACK_PRAH — platí na blokovaný i neblokovaný zásah stejně
 *  (na rozdíl od komba, které se blokovanému zásahu vůbec nepočítá),
 *  protože comeback je o snaze útočníka samotného, ne o konkrétní
 *  výměně. */
export const COMEBACK_NASOBIC = 1.2
/** Osmé kolo vylepšení — náhlá smrt. Násobič poškození HNED na
 *  začátku náhlé smrti (silnější než obyčejný zásah, ale ne ještě
 *  extrémní), NARUST_ZA_S ho dál zvyšuje za každou vteřinu, co náhlá
 *  smrt běží (skutečné "eskalující" poškození, ne jen jednorázový
 *  skok), a STROP ho shora omezuje — bez stropu by teoreticky
 *  nekonečně dlouhá náhlá smrt mohla dát nekonečné poškození za jeden
 *  zásah, stejná obava jako KOMBO_MAX_STUPNU výš. */
export const SUDDEN_DEATH_NASOBIC_ZACATEK = 1.5
export const SUDDEN_DEATH_NASOBIC_NARUST_ZA_S = 0.15
export const SUDDEN_DEATH_NASOBIC_STROP = 3
/** Osmé kolo vylepšení — environmentální hazard. Jak blízko kraji
 *  arény (logické jednotky, stejná škála jako ARENA_SIRKA/pozice) musí
 *  odražení cíl doopravdy dostat, aby se počítalo jako "u okraje" —
 *  a kolik PEVNÉHO poškození navíc to dá, jen v arénách, co hazard
 *  mají zapnutý (viz arena/areny.ts's Arena.nebezpeciOkraje). */
export const HAZARD_OKRAJE_PRAH = 24
export const HAZARD_OKRAJE_POSKOZENI = 8
/** Deváté kolo vylepšení — bonusový předmět v aréně. Objeví se až po
 *  PICKUP_DOSTUPNY_OD_MS (ať round nezačíná automatickou odměnou dřív,
 *  než se vůbec něco odehraje) a sebere ho, kdo se k němu dostane
 *  první — PICKUP_DOSAH je stejná škála jako HAZARD_OKRAJE_PRAH výš
 *  (logické jednotky arény, ne procenta). */
export const PICKUP_DOSTUPNY_OD_MS = 10000
export const PICKUP_DOSAH = 30

/** Osmé kolo vylepšení — výchozí volby zápasu, pro `vytvorSoubojStav`
 *  volané bez pátého argumentu (testy Fáze 1–7 na to spoléhají) a pro
 *  starý stav bez `moznosti` po hydrataci — žádný handicap, žádný
 *  trénink, žádný hazard, přesně chování před touhle fází. */
export const VYCHOZI_MOZNOSTI: SoubojMoznosti = {
  treninkovyRezim: false,
  handicapManaRegen: [1, 1],
  hazardOkraju: false,
}

export const AKCE_DATA: Record<UtocnaAkce, AkceData> = {
  udar: { poskozeni: 6, dosah: 90, trvaniMs: 250, cenaMany: 0, knockback: 18 },
  kop: { poskozeni: 10, dosah: 110, trvaniMs: 400, cenaMany: 0, knockback: 32 },
  specialni: { poskozeni: 22, dosah: 140, trvaniMs: 600, cenaMany: 40, knockback: 55 },
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
    komboPocet: 0,
    komboKonci: 0,
    blokDrzenMs: 0,
    parryZablesk: 0,
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
 *  tím nemění, na rozdíl od poskozeniNasobic, který platí na všechno.
 *  Vylepšení — knockback se schválně žádným charakterovým násobičem
 *  neškáluje (na rozdíl od poskození/dosahu/trvání/many) — kolik kdo
 *  odstrčí je vlastnost AKCE, ne postavy, appka nechtěla přidávat
 *  další rozměr vyvažování, co nikdo nežádal. */
export const efektivniAkceData = (postavaId: PostavaId, akce: UtocnaAkce): AkceData => {
  const zaklad = AKCE_DATA[akce]
  const postava = POSTAVY[postavaId]
  const bonusSpecialu = akce === 'specialni' && postava.specialEfekt === 'poskozeni' ? postava.specialniSila : 1
  return {
    poskozeni: zaklad.poskozeni * postava.poskozeniNasobic * bonusSpecialu,
    dosah: zaklad.dosah * postava.dosahNasobic,
    trvaniMs: zaklad.trvaniMs / postava.rychlostNasobic,
    cenaMany: zaklad.cenaMany * postava.cenaManyNasobic,
    knockback: zaklad.knockback,
  }
}

/** Deváté kolo vylepšení — `nahodne` injektovatelné jen kvůli
 *  testovatelnosti (stejný důvod jako combat/ai.ts's nahodnaPostava),
 *  ne kvůli replay/sync požadavku — pickup se losuje jednou tady, na
 *  TV, která je jediná strana, co engine doopravdy simuluje. */
export const vytvorSoubojStav = (
  pozice0: number,
  pozice1: number,
  postava0: PostavaId = VYCHOZI_POSTAVA,
  postava1: PostavaId = VYCHOZI_POSTAVA,
  moznosti: SoubojMoznosti = VYCHOZI_MOZNOSTI,
  nahodne: () => number = Math.random
): SoubojStav => ({
  hraci: [vytvorBojovnika(pozice0, postava0), vytvorBojovnika(pozice1, postava1)],
  cas: 0,
  vitez: null,
  stavKola: 'probiha',
  moznosti,
  suddenDeath: false,
  suddenDeathOd: null,
  // Pickup se schválně losuje jen do prostřední poloviny arény, ne
  // až ke krajům — ať je vždycky doopravdy dosažitelný pro obě strany
  // z jejich startovní pozice.
  pickupPozice: ARENA_SIRKA * 0.25 + nahodne() * ARENA_SIRKA * 0.5,
  pickupTyp: nahodne() < 0.5 ? 'mana' : 'stit',
  pickupSebran: false,
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
const tikBojovnika = (b: BojovnikStav, vstup: HracVstup, deltaMs: number, regenNasobic: number = 1): VysledekTiku => {
  const zranitelnostKonci = Math.max(0, b.zranitelnostKonci - deltaMs)
  const utokKonci = Math.max(0, b.utokKonci - deltaMs)
  // Osmé kolo vylepšení — handicap (SoubojMoznosti.handicapManaRegen)
  // násobí jen tohle číslo, ne poškození/rychlost/cokoli jiného —
  // slabší hráč tak dobíjí speciál rychleji, ale pořád hraje se
  // stejnými čísly akcí jako soupeř, žádná druhá osa vyvažování navíc.
  const mana = Math.min(b.maxMana, b.mana + (MANA_REGEN_ZA_S * regenNasobic * deltaMs) / 1000)
  // Vylepšení — kombo okno běží dolů úplně nezávisle na busy/hitstunu
  // (na rozdíl od blokKonci by nemělo smysl kombo "pozastavit" — čas
  // se počítá reálně, ne jen v tazích, kdy bojovník zrovna může jednat).
  const komboKonci = Math.max(0, b.komboKonci - deltaMs)
  // Vylepšení — parry. Vizuální záblesk doznívá stejně nezávisle na
  // busy stavu jako kombo okno výš — je to jen kosmetika, ne herní
  // pravidlo, které by muselo čekat na to, až bojovník zase může jednat.
  const parryZablesk = Math.max(0, b.parryZablesk - deltaMs)

  // Uprostřed hitstunu nebo vlastního útoku (i z minulého tiku) bojovník
  // ignoruje veškerý nový vstup — mana ale běží dál, regenerace není
  // vázaná na to, jestli zrovna může jednat.
  const busy = zranitelnostKonci > 0 || utokKonci > 0
  if (busy) {
    return {
      // Vylepšení — parry. Bojovník uprostřed hitstunu/vlastního útoku
      // logicky NEblokuje (blokuje se vynucuje na false o pár řádků
      // níž stejně), takže blokDrzenMs se resetuje na 0 spolu s tím —
      // jinak by "držené" číslo z předchozího bloku přežilo přes
      // omráčení a zkreslilo by první parry po probuzení.
      dalsi: { ...b, zranitelnostKonci, utokKonci, mana, komboKonci, parryZablesk, blokuje: false, blokDrzenMs: 0 },
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
  // Vylepšení — parry. Roste, dokud bojovník blok drží NEPŘETRŽITĚ
  // (z předchozího tiku, proto čte b.blokuje, ne čerstvé `blokuje`),
  // jinak padá zpátky na 0 — je to "jak dlouho JE tenhle konkrétní
  // blok už držený", ne kolikrát celkem hráč za kolo bloknul.
  const blokDrzenMs = blokuje ? (b.blokuje ? b.blokDrzenMs + deltaMs : 0) : 0

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
      komboKonci,
      blokDrzenMs,
      parryZablesk,
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
 *  druhém, a druhý zásah dvojitého úderu už vidí kombo navýšené prvním).
 *  Obrana (postavova, ne štít/blok) je vlastnost CÍLE, počítá se z
 *  `poskozeniZaklad`, které si volající už spočítal jednou předem —
 *  netřeba počítat dvakrát pro dva zásahy stejné akce.
 *
 *  Vylepšení přidalo dvě věci sem, ne do vyhodnotZasahPokudZahajen —
 *  obě se totiž musí přepočítat mezi voláními 'dvojity-zasah', ne jen
 *  jednou předem: kombo bonus (čte ÚTOČNÍKŮV aktuální komboKonci/
 *  komboPocet, PŘED tímhle zásahem, takže druhý úder Voltova
 *  dvojitého úderu dostane bonus z prvního) a odražení (čte AKTUÁLNÍ
 *  pozici cíle, ne tu ze začátku tiku, takže druhý úder odstrčí cíl
 *  dál od místa, kam ho už odstrčil první). Blokovaný zásah kombo
 *  NEROZJÍždí ani neprodlužuje — počítá se jen doopravdy neblokovaný
 *  spoj, stejná restrikce jako u odražení, jen bez zeslabení, žádné.
 *
 *  Osmé kolo vylepšení přidalo dva další parametry, oba se počítají
 *  stejně jednou předem ve vyhodnotZasahPokudZahajen a platí na oba
 *  případné zásahy Voltova dvojitého úderu stejně: `bonusSuddenDeath`
 *  (násobič poškození, 1 mimo náhlou smrt) a `hazardOkraju` (jestli
 *  zvolená aréna trestá odražení až ke kraji). Hazard se na rozdíl od
 *  komba/comebacku/sudden death NEnásobí do `poskozeni` — je to pevné
 *  číslo navrch (HAZARD_OKRAJE_POSKOZENI), počítané z toho, kam
 *  odražení cíl doopravdy dostalo, ne z toho, kolik dal útočník. */
const aplikujJedenZasah = (
  hraci: [BojovnikStav, BojovnikStav],
  utocnikIdx: 0 | 1,
  cilIdx: 0 | 1,
  poskozeniZaklad: number,
  knockback: number,
  bonusSuddenDeath: number,
  hazardOkraju: boolean
): VysledekJednohoZasahu => {
  const utocnik = hraci[utocnikIdx]
  const cil = hraci[cilIdx]

  // 'stit' efekt (Bulwark) — pohltí tenhle zásah úplně a spotřebuje
  // se, přednost před obyčejným blokem (souběh obou by byl vzácný a
  // engine ho stejně vyhodnotí jako "žádné poškození", tak jako tak).
  // Ani odražení, ani kombo se na plně pohlcený zásah nepočítá —
  // stejná logika jako 0 skutečně doručeného poškození.
  if (cil.stitAktivni) {
    const dalsi = [...hraci] as [BojovnikStav, BojovnikStav]
    dalsi[cilIdx] = { ...cil, stitAktivni: false }
    return { hraci: dalsi, poskozeniDorucene: 0 }
  }

  const zasahBlokovan = cil.blokuje

  // Vylepšení — parry. Blok držený jen krátce (PARRY_OKNO_MS) v
  // okamžiku zásahu je "perfektní" — cíl nedostane VŮBEC nic (ani
  // zbylé poškození po BLOK_REDUKCE, ani odražení, ani hitstun) a
  // útočník je navíc potrestán delším omráčením (PARRY_TREST_MS,
  // přísnějším než obyčejný HITSTUN_MS) — skutečná odměna za reakci na
  // konkrétní úder, ne za to, že hráč blok drží od začátku kola.
  // Kombo/comeback bonusy se na perfektní blok vůbec nepočítají —
  // dopadlo nulové poškození, není co násobit.
  const jePerfektniBlok = zasahBlokovan && cil.blokDrzenMs <= PARRY_OKNO_MS
  if (jePerfektniBlok) {
    const dalsi = [...hraci] as [BojovnikStav, BojovnikStav]
    dalsi[cilIdx] = { ...cil, parryZablesk: PARRY_ZABLESK_MS }
    dalsi[utocnikIdx] = { ...utocnik, zranitelnostKonci: PARRY_TREST_MS }
    return { hraci: dalsi, poskozeniDorucene: 0 }
  }

  const stupenKomba = utocnik.komboKonci > 0 ? Math.min(utocnik.komboPocet, KOMBO_MAX_STUPNU) : 0
  const bonusKomba = zasahBlokovan ? 1 : 1 + stupenKomba * KOMBO_BONUS_ZA_UDER
  // Vylepšení — comeback. Útočník bojující od nízkého HP dá víc
  // poškození, blokovaně i naplno stejně (na rozdíl od komba, které se
  // blokovanému zásahu vůbec nepočítá) — comeback je o snaze útočníka
  // samotného obrátit zápas, ne o téhle konkrétní výměně.
  const bonusComeback = utocnik.hp > 0 && utocnik.hp / utocnik.maxHp <= COMEBACK_PRAH ? COMEBACK_NASOBIC : 1
  const poskozeni =
    (zasahBlokovan ? poskozeniZaklad * (1 - BLOK_REDUKCE) : poskozeniZaklad) *
    bonusKomba *
    bonusComeback *
    bonusSuddenDeath

  const smerOdrazeni = utocnik.pozice <= cil.pozice ? 1 : -1
  const silaOdrazeni = zasahBlokovan ? knockback * (1 - BLOK_REDUKCE) : knockback
  const novaPozice = Math.max(0, Math.min(ARENA_SIRKA, cil.pozice + smerOdrazeni * silaOdrazeni))

  // Osmé kolo vylepšení — hazard okraje arény. Pevné číslo navrch,
  // NErostoucí s žádným násobičem výš — je to o TOM, KAM odražení cíl
  // dostalo, ne o síle samotného zásahu.
  const dostalOdrazenKOkraji =
    hazardOkraju && (novaPozice <= HAZARD_OKRAJE_PRAH || novaPozice >= ARENA_SIRKA - HAZARD_OKRAJE_PRAH)
  const poskozeniCelkove = poskozeni + (dostalOdrazenKOkraji ? HAZARD_OKRAJE_POSKOZENI : 0)

  const novyCil: BojovnikStav = {
    ...cil,
    hp: Math.max(0, cil.hp - poskozeniCelkove),
    pozice: novaPozice,
    // Blokovaný zásah hitstun neuděluje — obránce může jednat hned dál.
    zranitelnostKonci: zasahBlokovan ? cil.zranitelnostKonci : HITSTUN_MS,
  }
  const novyUtocnik: BojovnikStav = {
    ...utocnik,
    mana: Math.min(utocnik.maxMana, utocnik.mana + MANA_ZA_ZASAH),
    komboPocet: zasahBlokovan ? utocnik.komboPocet : stupenKomba + 1,
    komboKonci: zasahBlokovan ? utocnik.komboKonci : KOMBO_OKNO_MS,
  }

  const dalsi = [...hraci] as [BojovnikStav, BojovnikStav]
  dalsi[utocnikIdx] = novyUtocnik
  dalsi[cilIdx] = novyCil
  return { hraci: dalsi, poskozeniDorucene: poskozeniCelkove }
}

/** Pokud útočník tenhle tik zahájil akci, vyhodnotí dosah a zásah —
 *  volá se zvlášť pro každého hráče v pevném pořadí (0 pak 1), aby
 *  výsledek byl deterministický i při simultánním zásahu obou stran.
 *  Vylepšení přidalo dva další efekty speciálu vedle 'poskozeni'
 *  (ten je celý už v efektivniAkceData — viz komentář tam): 'dvojity-
 *  zasah' (Volt) zavolá aplikujJedenZasah dvakrát, 'vysati' (Onyx)
 *  vyléčí útočníka podle skutečně způsobeného poškození. 'stit'
 *  (Bulwark) se řeší jinde — v tikBojovnika při zahájení akce a v
 *  aplikujJedenZasah při dopadu na cíl, tady se vůbec nezmiňuje.
 *  Druhé kolo vylepšení přidalo kombo bonus a odražení, oboje uvnitř
 *  aplikujJedenZasah samotné (viz její vlastní komentář, proč tam a
 *  ne tady) — tahle funkce jen předává data.knockback, nic dalšího
 *  o žádném z obou mechanismů vědět nemusí. Osmé kolo vylepšení
 *  přidalo `bonusSuddenDeath`/`hazardOkraju` — oba se jen přeposílají
 *  do aplikujJedenZasah (viz její vlastní komentář), tahle funkce
 *  sama žádnou logiku náhlé smrti ani hazardu nepočítá. */
const vyhodnotZasahPokudZahajen = (
  hraci: [BojovnikStav, BojovnikStav],
  utocnikIdx: 0 | 1,
  cilIdx: 0 | 1,
  akce: UtocnaAkce | null,
  bonusSuddenDeath: number,
  hazardOkraju: boolean
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

  let vysledek = aplikujJedenZasah(hraci, utocnikIdx, cilIdx, poskozeniZaklad, data.knockback, bonusSuddenDeath, hazardOkraju)
  let poskozeniCelkem = vysledek.poskozeniDorucene

  if (jeSpecialSTemhleTypem('dvojity-zasah')) {
    vysledek = aplikujJedenZasah(
      vysledek.hraci,
      utocnikIdx,
      cilIdx,
      poskozeniZaklad,
      data.knockback,
      bonusSuddenDeath,
      hazardOkraju
    )
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
 *  věcí volajícího (nová vytvorSoubojStav()), ne enginu samotného.
 *
 *  Osmé kolo vylepšení přidalo tři věci sem: `moznosti.handicapManaRegen`
 *  se předává do tikBojovnika, `moznosti.hazardOkraju`/náhlá smrt se
 *  předávají do vyhodnotZasahPokudZahajen, a `moznosti.treninkovyRezim`
 *  úplně obchází zbytek funkce (žádné KO, žádný časový limit, žádná
 *  náhlá smrt) — kolo v tréninku prostě nikdy nekončí. */
export const krokSouboje = (stav: SoubojStav, vstupy: [HracVstup, HracVstup], deltaMs: number): SoubojStav => {
  if (stav.stavKola === 'konec') return stav
  const moznosti = stav.moznosti ?? VYCHOZI_MOZNOSTI

  const t0 = tikBojovnika(stav.hraci[0], vstupy[0], deltaMs, moznosti.handicapManaRegen[0])
  const t1 = tikBojovnika(stav.hraci[1], vstupy[1], deltaMs, moznosti.handicapManaRegen[1])

  // Násobič se počítá z PŘEDCHOZÍHO stavu (stejný "čti hodnoty spočtené
  // před tímhle tikem" princip jako komboKonci/comeback výš) — roste
  // podle toho, jak dlouho už `stav.suddenDeath` platí, capnuté na
  // SUDDEN_DEATH_NASOBIC_STROP.
  const bonusSuddenDeath = stav.suddenDeath
    ? Math.min(
        SUDDEN_DEATH_NASOBIC_STROP,
        SUDDEN_DEATH_NASOBIC_ZACATEK +
          (SUDDEN_DEATH_NASOBIC_NARUST_ZA_S * (stav.cas - (stav.suddenDeathOd ?? stav.cas))) / 1000
      )
    : 1

  let hraci: [BojovnikStav, BojovnikStav] = [t0.dalsi, t1.dalsi]
  hraci = vyhodnotZasahPokudZahajen(hraci, 0, 1, t0.zahajenaAkce, bonusSuddenDeath, moznosti.hazardOkraju)
  hraci = vyhodnotZasahPokudZahajen(hraci, 1, 0, t1.zahajenaAkce, bonusSuddenDeath, moznosti.hazardOkraju)

  const novyCas = stav.cas + deltaMs

  // Deváté kolo vylepšení — sebrání pickupu, počítané PŘED tréninkovou
  // větví níž (tréninkové kolo taky pickup umí sebrat, jen se pak
  // nikdy neresetuje, protože v tréninku žádné nové kolo nezačíná).
  // Pevné pořadí 0 pak 1, stejný "kdo se stihne dřív" determinismus
  // jako zbytek enginu.
  let pickupSebran = stav.pickupSebran
  if (!pickupSebran && novyCas >= PICKUP_DOSTUPNY_OD_MS) {
    for (const idx of [0, 1] as const) {
      if (pickupSebran) break
      if (Math.abs(hraci[idx].pozice - stav.pickupPozice) > PICKUP_DOSAH) continue
      const b = hraci[idx]
      const posilneny: BojovnikStav =
        stav.pickupTyp === 'mana' ? { ...b, mana: b.maxMana } : { ...b, stitAktivni: true }
      hraci = idx === 0 ? [posilneny, hraci[1]] : [hraci[0], posilneny]
      pickupSebran = true
    }
  }

  if (moznosti.treninkovyRezim) {
    // Trénink — HP se nesmí propadnout na 0 (drženo aspoň na 1, ať
    // pruh pořád ukazuje skutečné poškození) a časový limit/náhlá smrt
    // se vůbec nepočítají. Kolo tak nikdy nedojde do stavKola 'konec',
    // opustit ho jde jen tlačítkem Zpět na obrazovce nad enginem.
    hraci = [
      { ...hraci[0], hp: Math.max(1, hraci[0].hp) },
      { ...hraci[1], hp: Math.max(1, hraci[1].hp) },
    ]
    return { ...stav, hraci, cas: novyCas, vitez: null, stavKola: 'probiha', pickupSebran }
  }

  let vitez: 0 | 1 | null = null
  let stavKola: 'probiha' | 'konec' = 'probiha'
  let suddenDeath = stav.suddenDeath
  let suddenDeathOd = stav.suddenDeathOd
  const konec0 = hraci[0].hp <= 0
  const konec1 = hraci[1].hp <= 0

  if (konec0 || konec1) {
    stavKola = 'konec'
    // Současné KO obou stran je vzácné (jen při stejném tiku), ale
    // engine ho musí umět vrátit jako remízu, ne si vybrat vítěze —
    // platí i uprostřed náhlé smrti, KO má vždycky přednost.
    vitez = konec0 && konec1 ? null : konec0 ? 1 : 0
  } else if (suddenDeath) {
    // Náhlá smrt už běží — jakmile se HP jakkoli rozejdou (i jen
    // blokovaným zásahem, ten pořád část poškození propustí), rozhodne
    // se hned, žádný další časový práh se nečeká.
    if (hraci[0].hp !== hraci[1].hp) {
      stavKola = 'konec'
      vitez = hraci[0].hp > hraci[1].hp ? 0 : 1
    }
  } else if (novyCas >= CAS_LIMIT_MS) {
    if (hraci[0].hp === hraci[1].hp) {
      // Vylepšení — přesná shoda při vypršení limitu už neznamená
      // remízu, ale náhlou smrt: zápas pokračuje, ale od teď dá každý
      // další zásah násobně víc poškození (viz SUDDEN_DEATH_* výš) —
      // dřív nebo později se tak stejně rozhodne.
      suddenDeath = true
      suddenDeathOd = novyCas
    } else {
      stavKola = 'konec'
      vitez = hraci[0].hp > hraci[1].hp ? 0 : 1
    }
  }

  return {
    hraci,
    cas: novyCas,
    vitez,
    stavKola,
    moznosti,
    suddenDeath,
    suddenDeathOd,
    pickupPozice: stav.pickupPozice,
    pickupTyp: stav.pickupTyp,
    pickupSebran,
  }
}
