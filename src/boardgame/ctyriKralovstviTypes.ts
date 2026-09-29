// ==========================================
// Čtyři království — "Souboj o trůn". Pravidla, data a celý herní
// engine jako čisté funkce, žádné React — stejné rozdělení jako
// combat/engine.ts u Souboje nebo boardgame/engine.ts u Buddyho Trhu
// (sourozenecká, pořád skrytá hra ve stejné složce): appka jednu
// logiku dřív navrhne a otestuje bez prohlížeče, a až pak na ní
// postaví obrazovku.
//
// PŘÍBĚH: čtyři rivalské rody — Ohnivé, Vodní, Lesní a Pouštní
// království — závodí po společné cestě ke společnému trůnu
// uprostřed mapy. Kdo trůnu dosáhne jako první, získá jednorázový
// bonus ("Nárok na trůn"), ale o vítězi rozhoduje až celkový zisk
// (zlato + drahokamy + případný bonus) v okamžiku konce hry — appka
// tak dělá z "hlubší strategie" (viz AskUserQuestion) skutečnou věc:
// dojet první nestačí, pokud jsi cestou nic nesebral.
// ==========================================

export type KralovstviId = 'ohnive' | 'vodni' | 'lesni' | 'pousti'

export interface Kralovstvi {
  id: KralovstviId
  nazev: string
  barva: string
  emoji: string
}

/** Pevná sada čtyř království — appka nenabízí vlastní barvu/jméno
 *  království, jen hráčovo jméno (viz NastaveniHryCK) — stejná
 *  "pevná sada, ne libovolný vstup" zdrženlivost jako appčiny barevné
 *  palety jinde (Kalendář, Mind Map). */
export const KRALOVSTVI: Kralovstvi[] = [
  { id: 'ohnive', nazev: 'Ohnivé království', barva: '#ef4444', emoji: '🔥' },
  { id: 'vodni', nazev: 'Vodní království', barva: '#3b82f6', emoji: '🌊' },
  { id: 'lesni', nazev: 'Lesní království', barva: '#22c55e', emoji: '🌲' },
  { id: 'pousti', nazev: 'Pouštní království', barva: '#f59e0b', emoji: '🏜️' },
]

export const MIN_HRACU = 2
export const MAX_HRACU = 4

export interface Hrac {
  id: string
  jmeno: string
  kralovstviId: KralovstviId
  jeBot: boolean
  /** 0 = start (mimo desku), 1..POCET_POLI = pole na cestě,
   *  POZICE_TRUNU = trůn. */
  pozice: number
  zlato: number
  drahokamy: number
  dosahlTrunu: boolean
  /** true jen u PRVNÍHO hráče, co dosáhl trůnu — jediný, kdo dostane
   *  KORUNA_BONUS do skóre. Pozdější příchozí na trůn už bonus
   *  nedostanou, jen se přestanou posouvat dál. */
  jeUchazecOTrun: boolean
  /** Nastaví karta "Zrádce v táboře" — příští hod appka rovnou
   *  přeskočí a přiznak zase shodí, ať se tah nevynechává navždy. */
  vynechatTah: boolean
}

export const vytvorHrace = (id: string, jmeno: string, kralovstviId: KralovstviId, jeBot: boolean): Hrac => ({
  id,
  jmeno,
  kralovstviId,
  jeBot,
  pozice: 0,
  zlato: 0,
  drahokamy: 0,
  dosahlTrunu: false,
  jeUchazecOTrun: false,
  vynechatTah: false,
})

export type TypPole = 'prazdne' | 'zlato' | 'drahokam' | 'osud'

export const POCET_POLI = 24
/** Pole POCET_POLI + 1 = trůn, samostatná sentinelová hodnota mimo
 *  TYPY_POLI (to pole nemá žádný "typ" v běžném slova smyslu). */
export const POZICE_TRUNU = POCET_POLI + 1

/** Ručně navržená, pevná podoba cesty (24 polí) — appka ji negeneruje
 *  náhodně při každé hře, ať appka i hráči časem poznají její rytmus,
 *  stejně jako appčiny ostatní pevně navržené herní tabulky jinde. */
export const TYPY_POLI: TypPole[] = [
  'prazdne', 'zlato', 'prazdne', 'osud', 'zlato', 'drahokam',
  'prazdne', 'zlato', 'osud', 'prazdne', 'zlato', 'drahokam',
  'prazdne', 'osud', 'zlato', 'prazdne', 'drahokam', 'zlato',
  'osud', 'prazdne', 'zlato', 'drahokam', 'osud', 'zlato',
]

export interface OsudovaKarta {
  id: string
  text: string
  ucinek: (hraci: Hrac[], hracId: string, nahodne: () => number) => Hrac[]
}

const zmenZlato = (hraci: Hrac[], hracId: string, castka: number): Hrac[] =>
  hraci.map((h) => (h.id === hracId ? { ...h, zlato: Math.max(0, h.zlato + castka) } : h))

/** Deset osudových karet — appka je losuje rovnoměrně, žádná není
 *  pravděpodobnější než jiná. Sedm se vyřeší hned samo, "Zrádce v
 *  táboře" nastaví přeskočení příštího tahu — appka záměrně nemá
 *  žádnou kartu vyžadující volbu hráče (dvě tlačítka místo jednoho
 *  "Hodit kostkou"), ať zůstane jeden tah = jedno zavolání enginu,
 *  bez čekajícího rozhodnutí jako Buddyho Trh má u koupě obchodu. */
export const OSUDOVE_KARTY: OsudovaKarta[] = [
  {
    id: 'posel',
    text: 'Posel s dobrými zprávami přináší 3 zlaťáky.',
    ucinek: (hraci, hracId) => zmenZlato(hraci, hracId, 3),
  },
  {
    id: 'loupez',
    text: 'Loupežníci na cestě ti ukradli 2 zlaťáky.',
    ucinek: (hraci, hracId) => zmenZlato(hraci, hracId, -2),
  },
  {
    id: 'spojenec',
    text: 'Tajný spojenec ukradl 2 zlaťáky náhodnému soupeři.',
    ucinek: (hraci, hracId, nahodne) => {
      const souperi = hraci.filter((h) => h.id !== hracId)
      if (souperi.length === 0) return hraci
      const cil = souperi[Math.floor(nahodne() * souperi.length)]
      const kolik = Math.min(2, cil.zlato)
      return hraci.map((h) => {
        if (h.id === cil.id) return { ...h, zlato: h.zlato - kolik }
        if (h.id === hracId) return { ...h, zlato: h.zlato + kolik }
        return h
      })
    },
  },
  {
    id: 'zradce',
    text: 'Zrádce v táboře — příští tah musíš vynechat.',
    ucinek: (hraci, hracId) => hraci.map((h) => (h.id === hracId ? { ...h, vynechatTah: true } : h)),
  },
  {
    id: 'rychly-posel',
    text: 'Rychlý posel tě posunul o 2 pole vpřed.',
    ucinek: (hraci, hracId) =>
      hraci.map((h) => (h.id === hracId ? { ...h, pozice: Math.min(h.pozice + 2, POZICE_TRUNU) } : h)),
  },
  {
    id: 'nalez',
    text: 'Vzácný nález — získáváš drahokam.',
    ucinek: (hraci, hracId) => hraci.map((h) => (h.id === hracId ? { ...h, drahokamy: h.drahokamy + 1 } : h)),
  },
  {
    id: 'bourka',
    text: 'Bouře ničí sklady — všichni ostatní ztrácí 1 zlaťák.',
    ucinek: (hraci, hracId) =>
      hraci.map((h) => (h.id !== hracId ? { ...h, zlato: Math.max(0, h.zlato - 1) } : h)),
  },
  {
    id: 'past',
    text: 'Past tě vrátila o 2 pole zpět.',
    ucinek: (hraci, hracId) =>
      hraci.map((h) => (h.id === hracId ? { ...h, pozice: Math.max(0, h.pozice - 2) } : h)),
  },
  {
    id: 'dar',
    text: 'Královský dar — zlaťák i drahokam.',
    ucinek: (hraci, hracId) =>
      hraci.map((h) => (h.id === hracId ? { ...h, zlato: h.zlato + 1, drahokamy: h.drahokamy + 1 } : h)),
  },
  {
    id: 'clo',
    text: 'Celníci vybrali mýto — 1 zlaťák pryč.',
    ucinek: (hraci, hracId) => zmenZlato(hraci, hracId, -1),
  },
]

export const KORUNA_BONUS = 15
export const BODY_ZA_ZLATO = 1
export const BODY_ZA_DRAHOKAM = 3
/** Cena "Riskovat" — hoď 2 kostkami a vezmi vyšší číslo, na úkor
 *  zlaťáku. Jediné skutečné rozhodnutí hráče v appce mimo "kdy
 *  hodit" — appka ho nabízí jen před hodem, ne jako čekající stav. */
export const CENA_RIZIKA = 1

export const skoreHrace = (hrac: Hrac): number =>
  hrac.zlato * BODY_ZA_ZLATO + hrac.drahokamy * BODY_ZA_DRAHOKAM + (hrac.jeUchazecOTrun ? KORUNA_BONUS : 0)

export type FazeHry = 'hod' | 'konec'

export interface HraStav {
  hraci: Hrac[]
  aktivniIndex: number
  faze: FazeHry
  posledniHod: number | null
  posledniKarta: OsudovaKarta | null
  posledniUdalost: string | null
  /** Id hráče, co dosáhl trůnu jako první (dostává KORUNA_BONUS) —
   *  null, dokud nikdo nedorazil. */
  uchazecId: string | null
  /** Jakmile někdo dosáhne trůnu, appka nastaví na `hraci.length - 1`
   *  — každé další ukončení tahu o 1 ubere, ať má každé jiné
   *  království přesně jedno "poslední kolo" navíc, než hra doopravdy
   *  skončí. null = trůn zatím nikdo nedosáhl. */
  tahuDoKonce: number | null
}

export const vytvorHruStav = (hraci: Hrac[]): HraStav => ({
  hraci,
  aktivniIndex: 0,
  faze: 'hod',
  posledniHod: null,
  posledniKarta: null,
  posledniUdalost: null,
  uchazecId: null,
  tahuDoKonce: null,
})

const ukonciTah = (stav: HraStav): HraStav => {
  if (stav.tahuDoKonce !== null) {
    const zbyva = stav.tahuDoKonce - 1
    if (zbyva <= 0) return { ...stav, faze: 'konec', tahuDoKonce: 0 }
    return { ...stav, tahuDoKonce: zbyva, aktivniIndex: (stav.aktivniIndex + 1) % stav.hraci.length, faze: 'hod' }
  }
  return { ...stav, aktivniIndex: (stav.aktivniIndex + 1) % stav.hraci.length, faze: 'hod' }
}

/** Jeden tah = jedno zavolání — appka nemá žádný mezistav čekající na
 *  druhé rozhodnutí (na rozdíl od Buddyho Trhu). `riskovat` platí jen
 *  pro lidského hráče s dost zlata; appka to sama ignoruje jinak,
 *  místo aby to volajícímu vracelo chybu. */
export const hodKostkou = (
  stav: HraStav,
  nahodne: () => number = Math.random,
  riskovat: boolean = false
): HraStav => {
  if (stav.faze !== 'hod') return stav
  const aktivni = stav.hraci[stav.aktivniIndex]
  if (!aktivni) return stav

  if (aktivni.vynechatTah) {
    const hraci = stav.hraci.map((h) => (h.id === aktivni.id ? { ...h, vynechatTah: false } : h))
    return ukonciTah({
      ...stav,
      hraci,
      posledniHod: null,
      posledniKarta: null,
      posledniUdalost: `${aktivni.jmeno} musí vynechat tah.`,
    })
  }

  const skutecneRiskovat = riskovat && aktivni.zlato >= CENA_RIZIKA
  const hod1 = Math.floor(nahodne() * 6) + 1
  const hod2 = skutecneRiskovat ? Math.floor(nahodne() * 6) + 1 : null
  const hod = hod2 !== null ? Math.max(hod1, hod2) : hod1

  let hraci = skutecneRiskovat
    ? stav.hraci.map((h) => (h.id === aktivni.id ? { ...h, zlato: h.zlato - CENA_RIZIKA } : h))
    : stav.hraci

  const hracNyni = hraci.find((h) => h.id === aktivni.id)!
  const novaPozice = Math.min(hracNyni.pozice + hod, POZICE_TRUNU)

  let udalost = `${aktivni.jmeno} hodil ${hod}${skutecneRiskovat ? ' (riziko: dvě kostky)' : ''}.`
  let uchazecId = stav.uchazecId
  let posledniKarta: OsudovaKarta | null = null
  /** true jen v tahu, kdy někdo dosáhne trůnu VŮBEC POPRVÉ — appka
   *  pak nastavuje tahuDoKonce rovnou na "kolik kol PO TOMHLE tahu
   *  ještě zbývá" a nesmí ho hned znovu odečíst přes `ukonciTah`
   *  (ten odečítá jen hodnotu PŘENESENOU z minulého tahu, ne
   *  čerstvě spočítanou v tomhle). */
  let prveDosazenoTrun = false

  if (novaPozice >= POZICE_TRUNU) {
    hraci = hraci.map((h) => (h.id === aktivni.id ? { ...h, pozice: POZICE_TRUNU, dosahlTrunu: true } : h))
    if (uchazecId === null) {
      uchazecId = aktivni.id
      prveDosazenoTrun = true
      hraci = hraci.map((h) => (h.id === aktivni.id ? { ...h, jeUchazecOTrun: true } : h))
      udalost += ` ${aktivni.jmeno} dosáhl trůnu jako první! Ostatní království mají poslední kolo.`
    } else {
      udalost += ` ${aktivni.jmeno} také dosáhl trůnu.`
    }
  } else {
    hraci = hraci.map((h) => (h.id === aktivni.id ? { ...h, pozice: novaPozice } : h))
    const typ = TYPY_POLI[novaPozice - 1]
    if (typ === 'zlato') {
      const zisk = Math.floor(nahodne() * 3) + 2
      hraci = zmenZlato(hraci, aktivni.id, zisk)
      udalost += ` Získal ${zisk} zlata.`
    } else if (typ === 'drahokam') {
      hraci = hraci.map((h) => (h.id === aktivni.id ? { ...h, drahokamy: h.drahokamy + 1 } : h))
      udalost += ' Nalezl drahokam.'
    } else if (typ === 'osud') {
      const karta = OSUDOVE_KARTY[Math.floor(nahodne() * OSUDOVE_KARTY.length)]
      hraci = karta.ucinek(hraci, aktivni.id, nahodne)
      posledniKarta = karta
      udalost += ` Osudová karta: ${karta.text}`
    }
  }

  const zakladStav: HraStav = {
    ...stav,
    hraci,
    posledniHod: hod,
    posledniKarta,
    posledniUdalost: udalost,
    uchazecId,
  }

  if (prveDosazenoTrun) {
    // Poprvé spočítaná hodnota už sama o sobě znamená "po tomhle
    // tahu" — žádné další odečítání navíc, jinak by appka první
    // "poslední kolo" ukrojila hned o jeden tah.
    const zbyva = stav.hraci.length - 1
    return zbyva <= 0
      ? { ...zakladStav, faze: 'konec', tahuDoKonce: 0 }
      : {
          ...zakladStav,
          faze: 'hod',
          tahuDoKonce: zbyva,
          aktivniIndex: (stav.aktivniIndex + 1) % stav.hraci.length,
        }
  }

  return ukonciTah(zakladStav)
}

/** Pořadí na konci hry, seřazené podle skóre sestupně — appka
 *  netvrdí, že remíza nemůže nastat, jen ji nechá při stejném skóre
 *  na pořadí v poli (stejná zdrženlivost jako appčino řešení remízy
 *  u Souboje). */
export const konecneProadi = (hraci: Hrac[]): Hrac[] => [...hraci].sort((a, b) => skoreHrace(b) - skoreHrace(a))
