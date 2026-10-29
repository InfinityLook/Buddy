// ==========================================
// Kalendář — jedna z šesti dlaždic School Roomu (viz CLAUDE.md), jediná
// z nich, co appka do teď vůbec neměla (Pomodoro/Poznámky/Úkoly/Soubory
// jen přesunuté existující miniaplikace, Statistiky odkaz na /odmeny).
//
// Datum se ukládá jako čistý řetězec 'YYYY-MM-DD', ne jako Date objekt
// nebo timestamp — stejná "zone-less string literal" opatrnost, kterou
// CLAUDE.md zmiňuje u testů (TZ pinning): řetězec se neposouvá podle
// časového pásma zařízení, kde appka zrovna běží, takže "15. května"
// zůstane "15. května" i po obnově zálohy na jiném telefonu.
//
// Fáze 2 School Roomova "dokončený systém pro studium": appka rozšiřuje
// jednoduchou jednodatumovou/jednoduše-opakující se událost o skutečný
// začátek+konec (čas i vícedenní rozpětí), výjimky z opakování, vlastní
// připomínky a export/import .ics — appka ale drží "spočítej při čtení,
// neukládej odvozený stav" duch beze změny: appka dál ukládá jen první
// výskyt (Udalost.datum) + vzor opakování (+ teď i výjimky), kdy přesně
// se událost objeví dál se spočítá za běhu (viz udalostSeVyskytujeVDen).
// ==========================================

// Opakování — appka nikdy neukládá jednotlivé budoucí výskyty zvlášť,
// jen první datum (Udalost.datum) a typ opakování; kdy přesně se
// událost objeví dál, se spočítá za běhu (viz udalostSeVyskytujeVDen),
// stejný "spočítej při čtení, neukládej odvozený stav" duch jako
// appčina Rozvrhova týdenní šablona.
export const MOZNOSTI_OPAKOVANI = ['zadne', 'tydne', 'mesicne'] as const
export type Opakovani = (typeof MOZNOSTI_OPAKOVANI)[number]

export const NAZEV_OPAKOVANI: Record<Opakovani, string> = {
  zadne: 'Jednorázově',
  tydne: 'Každý týden',
  mesicne: 'Každý měsíc',
}

export interface Udalost {
  id: string
  /** 'YYYY-MM-DD', vždy místní datum, nikdy ne UTC posunuté. První (u
   *  jednorázové jediný) výskyt události. */
  datum: string
  nazev: string
  popis: string
  createdAt: number
  opakovani: Opakovani
  // --- Profesionální rozšíření (Fáze 2 School Roomu) ---
  /** Celodenní — výchozí true, zpětně kompatibilní se starší uloženou
   *  událostí, co čas vůbec neznala (appka ji bere jako celodenní,
   *  přesně to, co dřív jediné existovalo). false znamená, že má smysl
   *  číst casOd/casDo. */
  celodenni: boolean
  /** 'HH:MM', jen má-li smysl (!celodenni). Událost s casOd, ale bez
   *  casDo appka chápe jako "v určitý okamžik", ne jako úsek. */
  casOd?: string
  casDo?: string
  /** 'YYYY-MM-DD' poslední den vícedenní události (včetně) — chybí
   *  u jednodenní události, appka ho pak čte jako rovné datum samo
   *  (viz jeVicedenni/spanDni níž). */
  datumDo?: string
  /** Data ('YYYY-MM-DD'), kdy se TENHLE konkrétní výskyt opakující se
   *  události NEMÁ objevit, i kdyby jinak odpovídal vzoru opakování —
   *  appka datum výjimky ukládá jako START výskytu (udalost.datum pro
   *  první, posunuté datum pro další), ne jako každý jednotlivý den
   *  rozpětí. Appka tím pořád nic neukládá o BUDOUCÍCH výskytech
   *  samých — jen o kterých appka má řekne "tenhle jeden přeskoč". */
  vyjimky: string[]
  /** Kolik minut appka upozorní předem — null znamená žádná vlastní
   *  připomínka appky u téhle události (appka si teda u ní nic
   *  nehlídá, viz kalendarReminders.ts). */
  pripominkaMinut: number | null
  // --- Cloudová synchronizace (skolaSync.ts) ---
  // Stejný pár jako Kniha/Scenar/Komiks/Goal/Predmet/HodinaRozvrhu —
  // updatedAt rozhoduje "kdo vyhrává" při sloučení mezi zařízeními,
  // deletedAt je tombstone měkkého smazání (viz smazatUdalost).
  updatedAt: number
  deletedAt: number | null
}

/** Nový event appka vytváří z tohohle "data bagu" — loose merge shape,
 *  stejný styl jako updateKapitola/updatePanel jinde v appce: appka tu
 *  schválně nerozepisuje všechny jednotlivé argumenty pridatUdalost
 *  pozičně (bylo by jich po téhle Fázi 2 už devět), jen jedna věc, co
 *  volající pošle naráz. */
export interface UdajeUdalosti {
  nazev: string
  popis: string
  opakovani: Opakovani
  celodenni: boolean
  casOd?: string
  casDo?: string
  datumDo?: string
  pripominkaMinut: number | null
}

/** Rozpětí jedné události ve dnech (1 = jednodenní) — appka datumDo
 *  nikdy nebere jako platné, pokud by vyšlo PŘED datum (appka v tom
 *  případě raději bezpečně předpokládá jednodenní). */
const spanDni = (udalost: Udalost): number => {
  if (!udalost.datumDo || udalost.datumDo <= udalost.datum) return 1
  const [rok1, mesic1, den1] = udalost.datum.split('-').map(Number)
  const [rok2, mesic2, den2] = udalost.datumDo.split('-').map(Number)
  const zacatek = new Date(rok1, mesic1 - 1, den1)
  const konec = new Date(rok2, mesic2 - 1, den2)
  return Math.round((konec.getTime() - zacatek.getTime()) / 86_400_000) + 1
}

/** Je událost rozprostřená přes víc než jeden den? */
export const jeVicedenni = (udalost: Udalost): boolean => spanDni(udalost) > 1

/** 'YYYY-MM-DD' z místního Date objektu (ne UTC — Date.toISOString()
 *  by po půlnoci ve špatném časovém pásmu posunulo den o jeden zpátky).
 *  Appka si tenhle malý kus schválně nepůjčuje z useKalendar.ts (jeho
 *  vlastní naFormatDatumu je ekvivalentní, jen s jinou podpisovou
 *  formou) — stejná přijatá drobná duplikace jako appčiny BARVY_UZLU. */
const naIsoDatum = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Posune 'YYYY-MM-DD' o daný počet dní (kladný i záporný). */
export const posunDatumStr = (datumStr: string, pocetDni: number): string => {
  const [rok, mesic, den] = datumStr.split('-').map(Number)
  const d = new Date(rok, mesic - 1, den)
  d.setDate(d.getDate() + pocetDni)
  return naIsoDatum(d)
}

/** Je `datumC` platným (neodvolaným) ZAČÁTKEM jednoho výskytu událostí
 *  — appka tenhle test dělá vždycky na začátku rozpětí, nikdy na
 *  kterémkoli z jeho vnitřních dní (ty řeší udalostSeVyskytujeVDen
 *  níž, přes spanDni). Výjimka (vyjimky) appku zastaví i na úplně
 *  prvním výskytu (datumC === udalost.datum) — appka ji kontroluje
 *  dřív, než vrátí true pro přesnou shodu. */
const jeZacatekVyskytu = (udalost: Udalost, datumC: string): boolean => {
  if (datumC < udalost.datum) return false
  if (udalost.vyjimky.includes(datumC)) return false
  if (datumC === udalost.datum) return true
  if (udalost.opakovani === 'zadne') return false

  const [rokU, mesicU, denU] = udalost.datum.split('-').map(Number)
  const [rokC, mesicC, denC] = datumC.split('-').map(Number)

  // Měsíční opakování na den, co daný měsíc vůbec nemá (např. 31. v
  // dubnu), ten měsíc prostě přeskočí — appka nevymýšlí náhradní den,
  // stejná opatrnost jako appčiny recurring platby v Economy Roomu.
  if (udalost.opakovani === 'mesicne') return denC === denU

  // 'tydne' — stejný den v týdnu A rozdíl je celý násobek 7 dní.
  const prvni = new Date(rokU, mesicU - 1, denU)
  const kontrolovany = new Date(rokC, mesicC - 1, denC)
  if (kontrolovany.getDay() !== prvni.getDay()) return false
  const rozdilDni = Math.round((kontrolovany.getTime() - prvni.getTime()) / 86_400_000)
  return rozdilDni % 7 === 0
}

/** Najde START toho konkrétního výskytu, co pokrývá daný den — appka
 *  ho potřebuje pro "vynechat tenhle výskyt" (viz vynechatVyskyt v
 *  useKalendar.ts): u vícedenní události totiž vybraný den nemusí být
 *  jejím prvním dnem, ale výjimka se ukládá vždycky jako START výskytu,
 *  ne jako kterýkoli jeho vnitřní den. null, když daný den událost
 *  vůbec nepokrývá. Appka prochází posledních (span - 1) dní zpátky od
 *  dotazovaného dne a ptá se, jestli některý z nich je platným
 *  začátkem výskytu, co by svým rozpětím zasahoval až do dotazovaného
 *  dne — pro appčinu nejčastější jednodenní událost (span 1) je tohle
 *  přesně ten jediný původní test (datumStr samo). */
export const zacatekVyskytuPokryvajiciDen = (udalost: Udalost, datumStr: string): string | null => {
  const span = spanDni(udalost)
  for (let i = 0; i < span; i++) {
    const kandidat = posunDatumStr(datumStr, -i)
    if (jeZacatekVyskytu(udalost, kandidat)) return kandidat
  }
  return null
}

/** Vyskytuje se událost v daný den? Počítáno vždy znovu z prvního data,
 *  typu opakování a výjimek, nikdy z uloženého seznamu budoucích
 *  výskytů — ten appka nikdy nedrží. */
export const udalostSeVyskytujeVDen = (udalost: Udalost, datumStr: string): boolean =>
  zacatekVyskytuPokryvajiciDen(udalost, datumStr) !== null

/** Kolik RŮZNÝCH událostí (ne jednotlivých výskytů) je ještě "před
 *  námi" — opakující se událost počítá vždycky, protože se objeví
 *  znovu bez ohledu na to, kolikrát už proběhla; jednorázová (i
 *  vícedenní) jen pokud její POSLEDNÍ den ještě nenastal. */
export const pocetNadchazejicichUdalosti = (udalosti: Udalost[], dnesniStr: string): number =>
  udalosti.filter((u) => u.opakovani !== 'zadne' || (u.datumDo ?? u.datum) >= dnesniStr).length

// Pevná paleta barev pro označení dne — appka má přesně šest hlavních
// akcentových barev (viz styles/global.css's --accent-*), stejná sada se
// tu jen znovupoužívá jako "pevná nabídka, ne libovolný vstup" (stejný
// duch jako Social's IKONY_SKUPIN/EMOJI_REAKCI). Barva dne je nezávislá
// na tom, jestli má den nějakou událost — jde označit i prázdný den
// (např. "den volna", "den zkoušky"), proto žije jako vlastní mapa
// datum -> barva, ne jako pole na Udalost.
export const BARVY_DNE = ['cyan', 'violet', 'magenta', 'green', 'orange', 'red'] as const
export type BarvaDne = (typeof BARVY_DNE)[number]

// Uložený tvar (v úložišti i v cloudu) je pole záznamů, ne Record<string,
// BarvaDne> — appka potřebuje na jednu barvu dne vlastní id/updatedAt/
// deletedAt kvůli synchronizaci (stejná "záznam po záznamu" architektura
// jako Kniha/Goal/Rozvrhova docházka), a měkké smazání ("✕ bez barvy")
// potřebuje tombstone, ne fyzické odstranění klíče. Číst/psát barvu dne
// zůstává pro zbytek appky (Kalendar.tsx) stejně jednoduché jako dřív —
// useKalendar() z tohohle pole počítá přesně ten samý Record<string,
// BarvaDne> pohled, co appka měla odjakživa (viz barvyDniJakoRecord níž).
export interface BarvaDneZaznam {
  /** Stejný klíč jako samotné datum ('YYYY-MM-DD') — appka může mít
   *  vždycky nejvýš jednu barvu na den. */
  id: string
  datum: string
  barva: BarvaDne
  updatedAt: number
  deletedAt: number | null
}

/** Nesmazané barvy dní jako Record<datum, barva> — přesně ten tvar, co
 *  appka odjakživa četla/zapisovala přímo (Kalendar.tsx's barvyDni[den]). */
export const barvyDniJakoRecord = (zaznamy: BarvaDneZaznam[]): Record<string, BarvaDne> => {
  const barvyDni: Record<string, BarvaDne> = {}
  for (const z of zaznamy) {
    if (!z.deletedAt) barvyDni[z.datum] = z.barva
  }
  return barvyDni
}

// --- Vlastní připomínky ---

/** Pevná nabídka předstihů připomínky — appka tu schválně nedovoluje
 *  libovolné číslo minut, stejná "pevná sada, ne libovolný vstup"
 *  zásada jako appčiny barvy/ikony jinde. null = appka u tyhle události
 *  nehlídá nic. */
export interface VolbaPripominky {
  hodnota: number | null
  nazev: string
}
export const VOLBY_PRIPOMINKY: VolbaPripominky[] = [
  { hodnota: null, nazev: 'Bez připomínky' },
  { hodnota: 10, nazev: '10 minut předem' },
  { hodnota: 30, nazev: '30 minut předem' },
  { hodnota: 60, nazev: '1 hodinu předem' },
  { hodnota: 24 * 60, nazev: '1 den předem' },
  { hodnota: 2 * 24 * 60, nazev: '2 dny předem' },
]

const casNaDatumCas = (datumStr: string, casStr: string): Date => {
  const [rok, mesic, den] = datumStr.split('-').map(Number)
  const [hod, min] = casStr.split(':').map(Number)
  return new Date(rok, mesic - 1, den, hod || 0, min || 0)
}

// Appka připomínku hledá nejdál tolikrát dopředu — dost na pokrytí i
// roční "mesicne" i "tydne" opakování, ale ne nekonečně (appka vždycky
// hledá nejbližší skutečně budoucí připomínku, ne všechny napořád).
const MAX_DNI_DOPREDU_PRIPOMINKA = 400

/** Za kolik milisekund (od `ted`) má appka příští připomínku TÉHLE
 *  jedné události — null, když appka žádnou budoucí nenajde (bez
 *  pripominkaMinut, smazaná, nebo jednorázová, co svoje jediné okno
 *  připomínky už propásla). Appka hledá den po dni od dneška dopředu a
 *  pro každý den, co je platným začátkem výskytu, zkontroluje, jestli
 *  jeho připomínkové okno (začátek minus pripominkaMinut) ještě leží
 *  v budoucnosti — díky tomu appka pro opakující se událost, co dnešní
 *  okno propásla, sama najde tu PŘÍŠTÍ, ne že by o připomínce už
 *  nikdy neřekla. */
export const najdiDalsiPripominkuProUdalost = (udalost: Udalost, ted: Date): number | null => {
  if (udalost.deletedAt || udalost.pripominkaMinut == null) return null
  const casOd = udalost.celodenni ? '00:00' : udalost.casOd ?? '00:00'
  const dnesniStr = naIsoDatum(ted)

  for (let i = 0; i < MAX_DNI_DOPREDU_PRIPOMINKA; i++) {
    const kandidat = posunDatumStr(dnesniStr, i)
    if (!jeZacatekVyskytu(udalost, kandidat)) continue
    const start = casNaDatumCas(kandidat, casOd)
    const pripominka = start.getTime() - udalost.pripominkaMinut * 60_000
    const zaKolikMs = pripominka - ted.getTime()
    if (zaKolikMs >= 0) return zaKolikMs
  }
  return null
}

/** Nejbližší připomínka napříč VŠEMI událostmi — appka z tohohle
 *  jednoho výsledku naplánuje jeden absolutní setTimeout (stejný
 *  "jeden přesný časovač, ne denní zámek" idiom jako appčino
 *  Rozvrhovo najdiDalsiPripominku), ne že by kontrolovala každou
 *  událost zvlášť svým vlastním časovačem. */
export const najdiDalsiPripominkuKalendare = (
  udalosti: Udalost[],
  ted: Date
): { udalost: Udalost; zaKolikMs: number } | null => {
  let nejblizsi: { udalost: Udalost; zaKolikMs: number } | null = null
  for (const u of udalosti) {
    const zaKolikMs = najdiDalsiPripominkuProUdalost(u, ted)
    if (zaKolikMs == null) continue
    if (!nejblizsi || zaKolikMs < nejblizsi.zaKolikMs) nejblizsi = { udalost: u, zaKolikMs }
  }
  return nejblizsi
}

// --- Export do .ics ---

const paddedTwo = (n: number) => String(n).padStart(2, '0')

const naIcsDatumSamotne = (datumStr: string): string => datumStr.replace(/-/g, '')

const naIcsDatumCas = (datumStr: string, casStr: string): string => {
  const [rok, mesic, den] = datumStr.split('-').map(Number)
  const [hod, min] = casStr.split(':').map(Number)
  return `${rok}${paddedTwo(mesic)}${paddedTwo(den)}T${paddedTwo(hod || 0)}${paddedTwo(min || 0)}00`
}

/** RFC 5545 escapování TEXT hodnot (SUMMARY/DESCRIPTION) — appka má
 *  vlastní kopii, ne import z rozvrh/types.ts (appka si schválně
 *  nepůjčuje mezi miniaplikacemi, stejná přijatá drobná duplikace jako
 *  appčiny BARVY_UZLU jinde). Backslash musí jít první, jinak by se
 *  escapovala i ta backslash, co teprve escapuje čárku. */
const icsEscape = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')

const icsUnescape = (text: string): string =>
  text.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')

/** Sestaví .ics kalendář ze všech (nesmazaných) událostí — floating
 *  místní čas, žádná časová zóna, stejná jednoduchost jako appčiny
 *  holé 'YYYY-MM-DD' řetězce. Celodenní vícedenní událost appka
 *  exportuje s VYLOUČENÝM (den PO posledním) DTEND — stejná konvence,
 *  co používá Google/Apple kalendář, appka ji dodržuje, ať export
 *  doopravdy otevřený v cizím kalendáři ukáže správné rozpětí. */
export const sestavIcsKalendare = (udalosti: Udalost[]): string => {
  const radky: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Buddy//Kalendar//CS']

  udalosti
    .filter((u) => !u.deletedAt)
    .forEach((u, i) => {
      radky.push('BEGIN:VEVENT', `UID:kalendar-${u.id}-${i}@buddy`)

      const posledniDen = jeVicedenni(u) && u.datumDo ? u.datumDo : u.datum

      if (u.celodenni) {
        const vyloucenyKonec = posunDatumStr(posledniDen, 1)
        radky.push(`DTSTART;VALUE=DATE:${naIcsDatumSamotne(u.datum)}`)
        radky.push(`DTEND;VALUE=DATE:${naIcsDatumSamotne(vyloucenyKonec)}`)
      } else {
        const casOd = u.casOd ?? '00:00'
        radky.push(`DTSTART:${naIcsDatumCas(u.datum, casOd)}`)
        if (u.casDo || jeVicedenni(u)) {
          radky.push(`DTEND:${naIcsDatumCas(posledniDen, u.casDo ?? casOd)}`)
        }
      }

      if (u.opakovani === 'tydne') radky.push('RRULE:FREQ=WEEKLY')
      if (u.opakovani === 'mesicne') radky.push('RRULE:FREQ=MONTHLY')

      for (const vyjimka of u.vyjimky) {
        radky.push(
          u.celodenni
            ? `EXDATE;VALUE=DATE:${naIcsDatumSamotne(vyjimka)}`
            : `EXDATE:${naIcsDatumCas(vyjimka, u.casOd ?? '00:00')}`
        )
      }

      radky.push(`SUMMARY:${icsEscape(u.nazev || 'Bez názvu')}`)
      if (u.popis) radky.push(`DESCRIPTION:${icsEscape(u.popis)}`)
      radky.push('END:VEVENT')
    })

  radky.push('END:VCALENDAR')
  return radky.join('\r\n')
}

// --- Import z .ics ---

export interface IcsNavrh {
  nazev: string
  popis: string
  datum: string
  datumDo?: string
  celodenni: boolean
  casOd?: string
  casDo?: string
  opakovani: Opakovani
  vyjimky: string[]
}

/** "Rozbalí" RFC 5545 zalomené řádky (pokračovací řádek začíná mezerou
 *  nebo tabulátorem) — bez tohohle by dlouhý SUMMARY/DESCRIPTION
 *  rozdělený přes víc řádků (běžné u reálných exportů z Google/Apple
 *  kalendáře) appka přečetla jako dvě různé hodnoty. */
const rozbalRadky = (text: string): string[] => {
  const syrove = text.split(/\r\n|\r|\n/)
  const vysledek: string[] = []
  for (const radek of syrove) {
    if ((radek.startsWith(' ') || radek.startsWith('\t')) && vysledek.length > 0) {
      vysledek[vysledek.length - 1] += radek.slice(1)
    } else {
      vysledek.push(radek)
    }
  }
  return vysledek
}

/** Jedna hodnota DTSTART/DTEND/EXDATE ('YYYYMMDD' celodenní, nebo
 *  'YYYYMMDDTHHMMSS[Z]' s časem) rozebraná na datum + volitelný čas —
 *  appka celodennost pozná jen z přítomnosti 'T' ve zbylé hodnotě, ne
 *  z parametru VALUE=DATE (appka parametry za ';' vůbec nečte, ať
 *  přežije i soubor, co ten parametr nenapsal, ale datum-only hodnotu
 *  stejně použil). */
const naparsujIcsDatum = (hodnota: string): { datum: string; cas: string | null } => {
  const cista = hodnota.trim().replace(/Z$/, '')
  const rok = cista.slice(0, 4)
  const mesic = cista.slice(4, 6)
  const den = cista.slice(6, 8)
  const datum = `${rok}-${mesic}-${den}`
  if (cista.length >= 15 && cista[8] === 'T') {
    const hod = cista.slice(9, 11)
    const min = cista.slice(11, 13)
    return { datum, cas: `${hod}:${min}` }
  }
  return { datum, cas: null }
}

/** Jeden řádek uvnitř VEVENT ("KLIC;PARAM=X:HODNOTA" nebo "KLIC:HODNOTA")
 *  rozdělený na holý klíč (appka parametry za ';' tiše ignoruje) a
 *  hodnotu (všechno za PRVNÍM ':'). */
const rozdelRadekVevent = (radek: string): { klic: string; hodnota: string } | null => {
  const dvojtecka = radek.indexOf(':')
  if (dvojtecka === -1) return null
  const klic = radek.slice(0, dvojtecka).split(';')[0].toUpperCase().trim()
  return { klic, hodnota: radek.slice(dvojtecka + 1) }
}

/** Rozebere syrový .ics text na pole návrhů událostí k importu — appka
 *  bere jen SUMMARY/DESCRIPTION/DTSTART/DTEND/RRULE/EXDATE, cokoli
 *  jiného (UID, PRODID, ...) tiše ignoruje. VEVENT blok bez DTSTART
 *  appka vynechá, ne aby shodila celý import. */
export const naparsujIcs = (text: string): IcsNavrh[] => {
  const radky = rozbalRadky(text)
  const navrhy: IcsNavrh[] = []

  let vBloku = false
  let nazev = ''
  let popis = ''
  let dtstart: string | null = null
  let dtend: string | null = null
  let rrule = ''
  let exdaty: string[] = []

  const dokonciBlok = () => {
    if (!dtstart) return
    const zacatek = naparsujIcsDatum(dtstart)
    const konecRaw = dtend ? naparsujIcsDatum(dtend) : null
    const celodenni = zacatek.cas === null

    let datumDo: string | undefined
    if (konecRaw) {
      if (celodenni) {
        // DTEND celodenní je v .ics konvenci VYLOUČENÝ den (den PO
        // posledním) — appka ho posune o den zpátky, ať jí uložený
        // datumDo zůstane poslední SKUTEČNÝ den události (viz appčin
        // vlastní export výš, co dělá přesně to samé obráceně).
        const posunuty = posunDatumStr(konecRaw.datum, -1)
        datumDo = posunuty > zacatek.datum ? posunuty : undefined
      } else {
        datumDo = konecRaw.datum > zacatek.datum ? konecRaw.datum : undefined
      }
    }

    const opakovani: Opakovani = rrule.includes('FREQ=WEEKLY')
      ? 'tydne'
      : rrule.includes('FREQ=MONTHLY')
        ? 'mesicne'
        : 'zadne'

    navrhy.push({
      nazev: nazev || 'Bez názvu',
      popis,
      datum: zacatek.datum,
      datumDo,
      celodenni,
      casOd: celodenni ? undefined : zacatek.cas ?? undefined,
      casDo: celodenni ? undefined : konecRaw?.cas ?? undefined,
      opakovani,
      vyjimky: exdaty,
    })
  }

  for (const radek of radky) {
    const trimmed = radek.trim()
    if (trimmed === 'BEGIN:VEVENT') {
      vBloku = true
      nazev = ''
      popis = ''
      dtstart = null
      dtend = null
      rrule = ''
      exdaty = []
      continue
    }
    if (trimmed === 'END:VEVENT') {
      if (vBloku) dokonciBlok()
      vBloku = false
      continue
    }
    if (!vBloku) continue

    const pole = rozdelRadekVevent(radek)
    if (!pole) continue
    if (pole.klic === 'SUMMARY') nazev = icsUnescape(pole.hodnota)
    else if (pole.klic === 'DESCRIPTION') popis = icsUnescape(pole.hodnota)
    else if (pole.klic === 'DTSTART') dtstart = pole.hodnota
    else if (pole.klic === 'DTEND') dtend = pole.hodnota
    else if (pole.klic === 'RRULE') rrule = pole.hodnota
    else if (pole.klic === 'EXDATE') {
      for (const h of pole.hodnota.split(',')) {
        const t = h.trim()
        if (t) exdaty.push(naparsujIcsDatum(t).datum)
      }
    }
  }

  return navrhy
}

/** Je návrh ze souboru .ics už v appce (shoda názvu a prvního data)?
 *  appka duplicitu pozná schválně jen podle téhle dvojice, ne podle
 *  UID — appka UID svých vlastních exportů nikde zpátky nečte, a dva
 *  nezávislé kalendáře stejně nikdy nepoužijí shodné UID. */
export const jeIcsDuplicitni = (navrh: IcsNavrh, existujici: Udalost[]): boolean =>
  existujici.some((u) => !u.deletedAt && u.nazev === navrh.nazev && u.datum === navrh.datum)
