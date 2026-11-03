// ==========================================
// Rozvrh — nová miniaplikace School Roomu (appka do teď žádný týdenní
// rozvrh hodin neměla vůbec), stejný "self-contained miniapp" tvar jako
// Kalendář vedle ní: vlastní types.ts/use*.ts/*.tsx/*.css, vlastní
// secureStorage store, registrace v MINI_APP_REGISTRY/BACKUP_STORES.
//
// Rozvrh je čistě týdenní ŠABLONA (den v týdnu 1–5, ne konkrétní
// datum) — appka nezná začátek/konec semestru, jen "v pondělí od 8 do
// 9:40 je Matematika". Docházka (níž) proti tomu potřebuje konkrétní
// datum, protože se ptá "byl jsi TAM dneska", ne "je v pondělí
// matematika" — obojí žije v jednom souboru, protože docházka dává
// smysl jen proti existujícímu rozvrhu.
// ==========================================

export type DenVTydnu = 1 | 2 | 3 | 4 | 5

export interface PolozkaDne {
  id: DenVTydnu
  nazev: string
  zkratka: string
}

// Jen všední dny — appka nikde v projektu nepočítá s víkendovou výukou,
// stejný Po-first pořádek jako Kalendář's rozlozeniMesice.
export const DNY_V_TYDNU: PolozkaDne[] = [
  { id: 1, nazev: 'Pondělí', zkratka: 'Po' },
  { id: 2, nazev: 'Úterý', zkratka: 'Út' },
  { id: 3, nazev: 'Středa', zkratka: 'St' },
  { id: 4, nazev: 'Čtvrtek', zkratka: 'Čt' },
  { id: 5, nazev: 'Pátek', zkratka: 'Pá' },
]

export const nazevDne = (den: DenVTydnu): string =>
  DNY_V_TYDNU.find((d) => d.id === den)?.nazev ?? ''

// --- Sudý/lichý týden (A/B cyklus) ---

export type TydenCyklus = 'kazdy' | 'sudy' | 'lichy'

export const NAZEV_CYKLU: Record<TydenCyklus, string> = {
  kazdy: 'Každý týden',
  sudy: 'Sudý týden',
  lichy: 'Lichý týden',
}

export interface HodinaRozvrhu {
  id: string
  den: DenVTydnu
  /** 'HH:MM', 24hodinový formát */
  casOd: string
  casDo: string
  predmet: string
  mistnost: string
  vyucujici: string
  /** Nepovinné — starší hodina ho vůbec neměla (viz tydenHodiny níž),
   *  appka ji odjakživa počítala jako 'kazdy'. */
  tyden?: TydenCyklus
  // --- Cloudová synchronizace (skolaSync.ts) ---
  // Stejná trojice jako Kniha/Scenar/Komiks/Goal — updatedAt rozhoduje
  // "kdo vyhrává" při sloučení mezi zařízeními, deletedAt je tombstone
  // měkkého smazání (viz smazatHodinu v useRozvrh.ts).
  createdAt: string
  updatedAt: number
  deletedAt: number | null
}

// Nesplněné se řadí schválně stejně jako Planer — podle dne, uvnitř
// dne podle času, ať se rozvrh vždycky ukáže v pořadí, v jakém den
// doopravdy probíhá, i když se hodiny zadaly v jiném pořadí.
export const serazenoPodleCasu = (hodiny: HodinaRozvrhu[]): HodinaRozvrhu[] =>
  [...hodiny].sort((a, b) => (a.den !== b.den ? a.den - b.den : a.casOd.localeCompare(b.casOd)))

/** Starší uložená hodina pole tyden vůbec nemá — appka ji odjakživa
 *  počítala jako "každý týden". */
export const tydenHodiny = (h: HodinaRozvrhu): TydenCyklus => h.tyden ?? 'kazdy'

/** ISO 8601 číslo týdne (týden 1 = ten, co obsahuje první čtvrtek roku,
 *  pondělí je první den týdne) — appka na něm postaví sudý/lichý
 *  cyklus, protože je to přesně ta samá konvence, co reálné české školy
 *  pro "sudý/lichý týden" používají. Počítá čistě z místních Y/M/D,
 *  žádný toISOString()/UTC posun. */
const isoTydenZDatumu = (y: number, m: number, d: number): number => {
  const datum = new Date(y, m - 1, d)
  const denOdPondeli = (datum.getDay() + 6) % 7 // Po=0 .. Ne=6
  datum.setDate(datum.getDate() - denOdPondeli + 3) // nejbližší čtvrtek
  const prvniCtvrtek = new Date(datum.getFullYear(), 0, 4)
  const prvniCtvrtekOdPondeli = (prvniCtvrtek.getDay() + 6) % 7
  prvniCtvrtek.setDate(prvniCtvrtek.getDate() - prvniCtvrtekOdPondeli + 3)
  return 1 + Math.round((datum.getTime() - prvniCtvrtek.getTime()) / (7 * 24 * 60 * 60 * 1000))
}

/** Sudý/lichý týden pro dané 'YYYY-MM-DD' datum. */
export const paritaTydne = (datumIso: string): 'sudy' | 'lichy' => {
  const [y, m, d] = datumIso.split('-').map(Number)
  return isoTydenZDatumu(y, m, d) % 2 === 0 ? 'sudy' : 'lichy'
}

/** Klíč pro jeden záznam docházky — jedna konkrétní hodina v konkrétní
 *  den (ne šablona, ale skutečné datum). */
export const klicDochazky = (hodinaId: string, datumIso: string): string =>
  `${hodinaId}::${datumIso}`

// 'YYYY-MM-DD' z místního data — stejná "zone-less string, ne UTC
// posunuté" opatrnost jako Kalendář's naFormatDatumu, appka si tenhle
// malý kus schválně nepůjčuje z jiné miniaplikace (BARVY_UZLU-styl
// přijaté drobné zdvojení, ne nutná závislost mezi dvěma appkami).
export const dnesniDatumIso = (ted: Date = new Date()): string =>
  `${ted.getFullYear()}-${String(ted.getMonth() + 1).padStart(2, '0')}-${String(ted.getDate()).padStart(2, '0')}`

// JS Date.getDay(): 0 = neděle. null o víkendu — rozvrh se ho neptá.
export const denVTydnuZDatumu = (datum: Date): DenVTydnu | null => {
  const jsDen = datum.getDay()
  return jsDen >= 1 && jsDen <= 5 ? (jsDen as DenVTydnu) : null
}

/** Dnešní hodiny podle rozvrhu, seřazené — prázdné pole o víkendu. */
export const hodinyDnes = (hodiny: HodinaRozvrhu[], ted: Date = new Date()): HodinaRozvrhu[] => {
  const den = denVTydnuZDatumu(ted)
  if (den === null) return []
  return serazenoPodleCasu(hodiny.filter((h) => h.den === den))
}

// --- Připomínka před hodinou ---

/** Kolik minut předem appka upozorní (rozvrhReminders.ts). */
export const PREDSTIH_MINUT = 10

/** Najde nejbližší dnešní hodinu, co ještě nezačala, a spočítá, za
 *  kolik milisekund by na ni měla přijít připomínka (může vyjít i
 *  záporné/nulové, když je appka otevřená až v posledních
 *  PREDSTIH_MINUT před začátkem) — null, když dnes už žádná další
 *  hodina není. Pure funkce žijící tady, ne v rozvrhReminders.ts
 *  samotném — ten už notify.ts importuje, a core/utils/notify.ts přes
 *  registerSW.ts's virtual:pwa-register by kontaminovalo testovatelnost
 *  čehokoli, co by ho importovalo (stejná past, co si appka musela
 *  vyřešit u Financí/Goal Trackeru). */
// Nepovinné prazdniny/zruseneHodiny/presuny s výchozím prázdným polem
// — appka nikdy nenutí žádný starší kód (žádný test ani caller tyhle
// tři nový koncepty ještě nezná), co tuhle funkci volá jen se dvěma/
// třemi původními argumenty, aby se musel učit o tombstonech navíc.
// Vrácený tvar taky zůstává { hodina, ... } (ne EfektivniHodina
// zabalená uvnitř), stejný důvod — existující volající čte .hodina
// přímo.
export const najdiDalsiPripominku = (
  hodiny: HodinaRozvrhu[],
  ted: Date,
  predstihMinut: number = PREDSTIH_MINUT,
  prazdniny: Prazdniny[] = [],
  zruseneHodiny: ZrusenaHodina[] = [],
  presuny: Presun[] = []
): { hodina: HodinaRozvrhu; casOd: string; casDo: string; zaMs: number } | null => {
  const dnesniIso = dnesniDatumIso(ted)
  const dnesek = efektivniRozvrhProDatum(hodiny, prazdniny, zruseneHodiny, presuny, dnesniIso).filter(
    (e) => !e.zrusena
  )
  const nyniStr = `${String(ted.getHours()).padStart(2, '0')}:${String(ted.getMinutes()).padStart(2, '0')}`
  const dalsi = dnesek.find((e) => e.casOd > nyniStr)
  if (!dalsi) return null

  const [hod, min] = dalsi.casOd.split(':').map(Number)
  const zacatek = new Date(ted)
  zacatek.setHours(hod, min, 0, 0)
  const zaMs = zacatek.getTime() - predstihMinut * 60_000 - ted.getTime()
  return { hodina: dalsi.hodina, casOd: dalsi.casOd, casDo: dalsi.casDo, zaMs }
}

/** Přesahují se dva časové úseky stejného dne? Čistý řetězcový
 *  porovnání funguje díky 'HH:MM' formátu se zarovnáním nulou —
 *  lexikografické řazení tu je totéž co časové. */
const casyKoliduji = (aOd: string, aDo: string, bOd: string, bDo: string): boolean => aOd < bDo && bOd < aDo

/** Které už uložené hodiny koliduje se zadaným dnem/časem — vynechává
 *  vlastní id (úprava existující hodiny proti sobě samotné nikdy
 *  nekoliduje). Volá appka živě při psaní do formuláře i znovu při
 *  odeslání, ať uživatel vidí varování dřív, než se rozhodne uložit. */
export const najdiKolize = (
  hodiny: HodinaRozvrhu[],
  den: DenVTydnu,
  casOd: string,
  casDo: string,
  vynechatId: string | null = null
): HodinaRozvrhu[] =>
  hodiny.filter(
    (h) => h.id !== vynechatId && h.den === den && casyKoliduji(casOd, casDo, h.casOd, h.casDo)
  )

// --- Docházka ---

// Uložený tvar (v úložišti i v cloudu) je pole záznamů, ne Record<string,
// boolean> — appka potřebuje na jeden záznam docházky vlastní id/
// updatedAt/deletedAt kvůli synchronizaci (stejná "záznam po záznamu"
// architektura jako Kniha/Goal), a měkké smazání (odznačení "byl jsem")
// potřebuje tombstone, ne fyzické odstranění klíče. Číst/psát docházku
// zůstává pro zbytek appky (Rozvrh.tsx, School Room) stejně jednoduché
// jako dřív — useRozvrh() z tohohle pole počítá přesně ten samý
// Record<string, boolean> pohled, co appka měla odjakživa (viz
// dochazkaJakoRecord níž), a spocitejDochazkuPodlePredmetu tak dál bere
// Record, ne pole.
export interface DochazkaZaznam {
  /** Stejný klíč jako klicDochazky(hodinaId, datum) výš. */
  id: string
  hodinaId: string
  datum: string
  byl: boolean
  createdAt: string
  updatedAt: number
  deletedAt: number | null
}

/** Nesmazané záznamy docházky jako Record<klic, byl> — přesně ten tvar,
 *  co appka odjakživa četla/zapisovala přímo (Rozvrh.tsx's dochazka[klic],
 *  spocitejDochazkuPodlePredmetu). */
export const dochazkaJakoRecord = (zaznamy: DochazkaZaznam[]): Record<string, boolean> => {
  const dochazka: Record<string, boolean> = {}
  for (const z of zaznamy) {
    if (!z.deletedAt) dochazka[z.id] = z.byl
  }
  return dochazka
}

export interface DochazkaPredmetu {
  predmet: string
  celkem: number
  pritomen: number
  procenta: number
  /** Kolik dalších hodin si předmět ještě může dovolit zmeškat, než
   *  procenta klesnou pod PRAH_RIZIKA_DOCHAZKY. */
  pocetDovolenychAbsenci: number
}

// Běžná minimální hranice docházky na vysokých školách — jen orientační
// práh pro zvýraznění rizika, appka nikam nehlásí, žádné "vyloučen".
export const PRAH_RIZIKA_DOCHAZKY = 75

/** Kolik dalších hodin může předmět zmeškat a ještě zůstat na/nad
 *  prahu — každá další "budoucí" absence zvedne jen `celkem`, ne
 *  `pritomen`, takže appka hledá největší x, pro které pritomen/(celkem+x)
 *  ještě neklesne pod prah. Nikdy záporné (předmět už pod prahem prostě
 *  žádnou další absenci nesnese). */
export const spocitejDovolenychAbsenci = (
  celkem: number,
  pritomen: number,
  prah: number = PRAH_RIZIKA_DOCHAZKY
): number => Math.max(0, Math.floor((pritomen * 100) / prah) - celkem)

/** Spočítá % docházky za předmět z uložených záznamů — nejnižší
 *  docházka první, ať riziko vyskočí nahoru samo. */
export const spocitejDochazkuPodlePredmetu = (
  hodiny: HodinaRozvrhu[],
  dochazka: Record<string, boolean>
): DochazkaPredmetu[] => {
  const mapa = new Map<string, { celkem: number; pritomen: number }>()

  for (const [klic, byl] of Object.entries(dochazka)) {
    const hodinaId = klic.split('::')[0]
    const hodina = hodiny.find((h) => h.id === hodinaId)
    if (!hodina) continue

    const zaznam = mapa.get(hodina.predmet) ?? { celkem: 0, pritomen: 0 }
    zaznam.celkem += 1
    if (byl) zaznam.pritomen += 1
    mapa.set(hodina.predmet, zaznam)
  }

  return [...mapa.entries()]
    .map(([predmet, z]) => ({
      predmet,
      celkem: z.celkem,
      pritomen: z.pritomen,
      procenta: z.celkem > 0 ? Math.round((z.pritomen / z.celkem) * 100) : 0,
      pocetDovolenychAbsenci: spocitejDovolenychAbsenci(z.celkem, z.pritomen),
    }))
    .sort((a, b) => a.procenta - b.procenta)
}

// --- Prázdniny ---

export interface Prazdniny {
  id: string
  nazev: string
  /** 'YYYY-MM-DD', včetně obou krajních dní. */
  datumOd: string
  datumDo: string
  createdAt: string
  updatedAt: number
  deletedAt: number | null
}

/** Padne zadané datum do nějakých (nesmazaných) prázdnin? Appka vrací
 *  tu konkrétní položku (kvůli jejímu názvu), ne jen boolean. */
export const jeDenPrazdninovy = (prazdniny: Prazdniny[], datumIso: string): Prazdniny | null =>
  prazdniny.find((p) => !p.deletedAt && p.datumOd <= datumIso && datumIso <= p.datumDo) ?? null

// --- Jednorázové zrušení konkrétního výskytu ---
// Zrušení jednoho konkrétního dne hodiny, ne změna šablony samotné —
// "zítřejší matika je zrušená" neznamená, že matika zmizí z rozvrhu
// navždy. Appka ji drží jako samostatný tombstone-schopný záznam, ne
// jako pole dat uvnitř HodinaRozvrhu, stejný důvod jako docházka vedle
// — jedna šablonová hodina může mít libovolně moc zrušených/
// přesunutých výskytů v čase.

export interface ZrusenaHodina {
  id: string
  hodinaId: string
  /** 'YYYY-MM-DD' — ten jeden konkrétní den, ne celá šablona. */
  datum: string
  createdAt: string
  updatedAt: number
  deletedAt: number | null
}

export const jeHodinaZrusenaVDatu = (zrusene: ZrusenaHodina[], hodinaId: string, datumIso: string): boolean =>
  zrusene.some((z) => !z.deletedAt && z.hodinaId === hodinaId && z.datum === datumIso)

// --- Jednorázový přesun konkrétního výskytu ---

export interface Presun {
  id: string
  hodinaId: string
  puvodniDatum: string
  novyDatum: string
  novyCasOd: string
  novyCasDo: string
  createdAt: string
  updatedAt: number
  deletedAt: number | null
}

// --- Semestry a archiv ---
// Appka neváže živé hodiny na konkrétní semestr (semestrId by se
// musel táhnout přes paritu/prázdniny/zrušení/přesuny všude — reálná
// škoda za architektonickou čistotu, co nikdo nepotřebuje). Místo
// toho "archivovat semestr" vezme ZMRZLÝ snímek aktuálních hodin do
// Semestr.hodiny a volitelně vyčistí živý rozvrh pro nový — archiv je
// kopie, ne odkaz, další úpravy živého rozvrhu se do něj zpětně
// nepropisují.

export interface Semestr {
  id: string
  nazev: string
  datumOd: string
  datumDo: string
  hodiny: HodinaRozvrhu[]
  createdAt: string
  updatedAt: number
  deletedAt: number | null
}

// --- Efektivní rozvrh pro konkrétní den ---
// Šablona (hodiny výš) + prázdniny + zrušené výskyty + přesuny dají
// společně "co se tenhle konkrétní den doopravdy koná" — jedna
// sdílená funkce, co používá Rozvrh.tsx's "Dnešní hodiny",
// rozvrhReminders.ts's připomínka, School Roomovo "Příští hodina" i
// Kalendářovo "📚 Podle rozvrhu", ať žádná ze čtyř cest nezapomene na
// prázdniny/zrušení/přesun a neukáže/nepřipomene něco, co se doopravdy
// nekoná.

export interface EfektivniHodina {
  hodina: HodinaRozvrhu
  casOd: string
  casDo: string
  zrusena: boolean
  /** Když je položka důsledkem Presunu "do" tohodle dne — původní
   *  datum, odkud se sem přesunula (appka to ukáže jako "přesunuto
   *  z ..."). */
  presunutoZ: string | null
}

export const efektivniRozvrhProDatum = (
  hodiny: HodinaRozvrhu[],
  prazdniny: Prazdniny[],
  zruseneHodiny: ZrusenaHodina[],
  presuny: Presun[],
  datumIso: string
): EfektivniHodina[] => {
  if (jeDenPrazdninovy(prazdniny, datumIso)) return []

  const [y, m, d] = datumIso.split('-').map(Number)
  const den = denVTydnuZDatumu(new Date(y, m - 1, d))
  if (den === null) return []

  const parita = paritaTydne(datumIso)
  const aktivniPresuny = presuny.filter((p) => !p.deletedAt)

  const zakladni: EfektivniHodina[] = hodiny
    .filter((h) => h.den === den && (tydenHodiny(h) === 'kazdy' || tydenHodiny(h) === parita))
    // Hodina přesunutá PRYČ z tohodle data se na svém původním místě
    // neukáže vůbec — objeví se níž na svém NOVÉM datu.
    .filter((h) => !aktivniPresuny.some((p) => p.hodinaId === h.id && p.puvodniDatum === datumIso))
    .map((h) => ({
      hodina: h,
      casOd: h.casOd,
      casDo: h.casDo,
      zrusena: jeHodinaZrusenaVDatu(zruseneHodiny, h.id, datumIso),
      presunutoZ: null,
    }))

  const presunuteSem: EfektivniHodina[] = aktivniPresuny
    .filter((p) => p.novyDatum === datumIso)
    .map((p): EfektivniHodina | null => {
      const hodina = hodiny.find((h) => h.id === p.hodinaId)
      if (!hodina) return null
      return { hodina, casOd: p.novyCasOd, casDo: p.novyCasDo, zrusena: false, presunutoZ: p.puvodniDatum }
    })
    .filter((e): e is EfektivniHodina => e !== null)

  return [...zakladni, ...presunuteSem].sort((a, b) => a.casOd.localeCompare(b.casOd))
}

// --- Export do .ics ---

const paddedTwo = (n: number) => String(n).padStart(2, '0')

const RRULE_DEN: Record<DenVTydnu, string> = { 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR' }

/** Nejbližší reálné datum (dnes, nebo dopředu), co padne na daný den
 *  v týdnu — DTSTART opakované události musí být konkrétní datum, ne
 *  jen "pondělí" samo o sobě. */
const nejblizsiDatumPro = (den: DenVTydnu, ted: Date): Date => {
  const vysledek = new Date(ted)
  const dnesniDen = denVTydnuZDatumu(ted) ?? 1
  let posun = den - dnesniDen
  if (posun < 0) posun += 7
  vysledek.setDate(vysledek.getDate() + posun)
  return vysledek
}

/** Stejné jako nejblizsiDatumPro, ale pro 'sudy'/'lichy' cyklus navíc
 *  doskočí o celý další týden, když první kandidátní datum padne na
 *  špatnou paritu — jinak by RRULE;INTERVAL=2 kotvený na špatném
 *  DTSTART ukázal hodinu v přesně opačných týdnech, než se doopravdy
 *  koná. */
export const nejblizsiDatumProSParitou = (den: DenVTydnu, tyden: TydenCyklus, ted: Date): Date => {
  const prvni = nejblizsiDatumPro(den, ted)
  if (tyden === 'kazdy') return prvni
  const prvniIso = `${prvni.getFullYear()}-${paddedTwo(prvni.getMonth() + 1)}-${paddedTwo(prvni.getDate())}`
  if (paritaTydne(prvniIso) === tyden) return prvni
  const dalsi = new Date(prvni)
  dalsi.setDate(dalsi.getDate() + 7)
  return dalsi
}

const naIcsDatumCas = (datum: Date, cas: string): string => {
  const [hod, min] = cas.split(':').map(Number)
  return `${datum.getFullYear()}${paddedTwo(datum.getMonth() + 1)}${paddedTwo(datum.getDate())}T${paddedTwo(hod || 0)}${paddedTwo(min || 0)}00`
}

/** RFC 5545 escapování TEXT hodnot (SUMMARY/LOCATION/DESCRIPTION) —
 *  bez něj čárka/středník/zpětné lomítko v názvu předmětu (třeba
 *  "Dějiny, filozofie" nebo "Úvod; pokročilý") vytvoří neplatný .ics,
 *  co si reálný kalendář (Google/Apple/Outlook) buď odmítne, nebo
 *  rozseká na víc polí, než uživatel zadal. Backslash musí jít první,
 *  jinak by se escapovala i ta backslash, co teprve escapuje čárku. */
const icsEscape = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')

/** Sestaví .ics kalendář s jednou týdně se opakující událostí na
 *  hodinu (RRULE FREQ=WEEKLY) — floating místní čas, žádná časová zóna,
 *  stejná jednoduchost jako Kalendář's holé 'YYYY-MM-DD' řetězce. Bez
 *  UNTIL/COUNT: appka nezná konec semestru, opakuje se neomezeně. */
export const sestavIcsRozvrhu = (hodiny: HodinaRozvrhu[], ted: Date = new Date()): string => {
  const radky: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Buddy//Rozvrh//CS']

  hodiny.forEach((h, i) => {
    const tyden = tydenHodiny(h)
    const datum = nejblizsiDatumProSParitou(h.den, tyden, ted)
    radky.push('BEGIN:VEVENT', `UID:rozvrh-${h.id}-${i}@buddy`)
    radky.push(`DTSTART:${naIcsDatumCas(datum, h.casOd)}`)
    radky.push(`DTEND:${naIcsDatumCas(datum, h.casDo)}`)
    // Sudý/lichý týden appka vyjádří jako RRULE;INTERVAL=2, kotvený
    // na první nadcházející datum SE SPRÁVNOU paritou — "každý týden"
    // zůstává prostý WEEKLY beze změny (INTERVAL=1 je výchozí, appka
    // ho nepíše schválně, ať .ics zůstane stejný jako před touhle
    // funkcí pro hodiny, co paritu nemají).
    radky.push(
      tyden === 'kazdy'
        ? `RRULE:FREQ=WEEKLY;BYDAY=${RRULE_DEN[h.den]}`
        : `RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=${RRULE_DEN[h.den]}`
    )
    radky.push(`SUMMARY:${icsEscape(h.predmet || 'Bez názvu')}`)
    if (h.mistnost) radky.push(`LOCATION:${icsEscape(h.mistnost)}`)
    if (h.vyucujici) radky.push(`DESCRIPTION:${icsEscape(h.vyucujici)}`)
    radky.push('END:VEVENT')
  })

  radky.push('END:VCALENDAR')
  return radky.join('\r\n')
}

// --- Import z .ics ---
// Rozvrh reaguje jen na opakující se (RRULE:FREQ=WEEKLY) VEVENT bloky
// s BYDAY — jednorázová (nikdy se neopakující) událost appku
// nezajímá, protože Rozvrh je šablona, ne kalendář konkrétních
// termínů (na ty appka má Kalendář a jeho vlastní naparsujIcs).

export interface NavrhHodiny {
  den: DenVTydnu
  casOd: string
  casDo: string
  predmet: string
  mistnost: string
  vyucujici: string
  tyden: TydenCyklus
}

/** Stejná "rozděl na první ':', ';parametry' v klíči zahoď" logika
 *  jako Kalendář's vlastní rozdelRadekVevent — appka si ji sem
 *  schválně nepůjčuje (miniaplikace si mezi sebou nepůjčují kód),
 *  vlastní malá kopie. */
const rozdelRadekVevent = (radek: string): { klic: string; hodnota: string } | null => {
  const idx = radek.indexOf(':')
  if (idx === -1) return null
  const klic = radek.slice(0, idx).split(';')[0]
  return { klic, hodnota: radek.slice(idx + 1) }
}

/** 'YYYYMMDDTHHMMSS' → jen čas 'HH:MM' — appka z importovaného .ics
 *  zajímá jen hodina/minuta, ne konkrétní datum (Rozvrh je šablona). */
const casZIcsHodnoty = (hodnota: string): string | null => {
  const idx = hodnota.indexOf('T')
  if (idx === -1) return null
  const casCast = hodnota.slice(idx + 1)
  if (casCast.length < 4) return null
  return `${casCast.slice(0, 2)}:${casCast.slice(2, 4)}`
}

const datumZIcsHodnoty = (hodnota: string): string | null => {
  const datumCast = hodnota.slice(0, 8)
  if (datumCast.length !== 8 || !/^\d{8}$/.test(datumCast)) return null
  return `${datumCast.slice(0, 4)}-${datumCast.slice(4, 6)}-${datumCast.slice(6, 8)}`
}

const DEN_Z_RRULE: Record<string, DenVTydnu> = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5 }

/** Zpětné RFC 5545 escapování — appka tak dostane zpátky skutečnou
 *  čárku/středník/zpětné lomítko, co export sám escapoval. */
const icsUnescape = (text: string): string =>
  text.replace(/\\n/g, ' ').replace(/\\;/g, ';').replace(/\\,/g, ',').replace(/\\\\/g, '\\')

/** Rozebere .ics text na návrhy hodin. */
export const naparsujIcsRozvrh = (text: string): NavrhHodiny[] => {
  const navrhy: NavrhHodiny[] = []

  let vBloku = false
  let dtstart: string | null = null
  let dtend: string | null = null
  let rrule: string | null = null
  let summary = ''
  let location = ''
  let description = ''

  const ukonciBlok = () => {
    if (dtstart && dtend && rrule && /FREQ=WEEKLY/i.test(rrule)) {
      const casOd = casZIcsHodnoty(dtstart)
      const casDo = casZIcsHodnoty(dtend)
      const bydayShoda = rrule.match(/BYDAY=([A-Z]{2})/i)
      const den = bydayShoda ? DEN_Z_RRULE[bydayShoda[1].toUpperCase()] : undefined
      const datumZacatkuIso = datumZIcsHodnoty(dtstart)
      const intervalShoda = rrule.match(/INTERVAL=(\d+)/i)

      if (casOd && casDo && den && datumZacatkuIso) {
        const tyden: TydenCyklus =
          intervalShoda && Number(intervalShoda[1]) === 2 ? paritaTydne(datumZacatkuIso) : 'kazdy'
        navrhy.push({
          den,
          casOd,
          casDo,
          predmet: icsUnescape(summary) || 'Bez názvu',
          mistnost: icsUnescape(location),
          vyucujici: icsUnescape(description),
          tyden,
        })
      }
    }
    dtstart = dtend = rrule = null
    summary = location = description = ''
  }

  for (const radekSyrovy of text.split(/\r\n|\n|\r/)) {
    const radek = radekSyrovy.trim()
    if (radek === 'BEGIN:VEVENT') {
      vBloku = true
      continue
    }
    if (radek === 'END:VEVENT') {
      if (vBloku) ukonciBlok()
      vBloku = false
      continue
    }
    if (!vBloku) continue

    const rozdeleny = rozdelRadekVevent(radek)
    if (!rozdeleny) continue
    const { klic, hodnota } = rozdeleny
    if (klic === 'DTSTART') dtstart = hodnota
    else if (klic === 'DTEND') dtend = hodnota
    else if (klic === 'RRULE') rrule = hodnota
    else if (klic === 'SUMMARY') summary = hodnota
    else if (klic === 'LOCATION') location = hodnota
    else if (klic === 'DESCRIPTION') description = hodnota
  }

  return navrhy
}

/** Shoda s už uloženou hodinou — stejný den, čas začátku a předmět
 *  (case-insensitive, appka toleruje jinak napsaná velká/malá písmena
 *  z jiného zdroje exportu). */
export const jeNavrhDuplicitni = (navrh: NavrhHodiny, hodiny: HodinaRozvrhu[]): boolean =>
  hodiny.some(
    (h) =>
      h.den === navrh.den &&
      h.casOd === navrh.casOd &&
      h.predmet.trim().toLowerCase() === navrh.predmet.trim().toLowerCase()
  )
