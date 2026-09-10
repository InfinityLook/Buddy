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

export interface HodinaRozvrhu {
  id: string
  den: DenVTydnu
  /** 'HH:MM', 24hodinový formát */
  casOd: string
  casDo: string
  predmet: string
  mistnost: string
  vyucujici: string
}

// Nesplněné se řadí schválně stejně jako Planer — podle dne, uvnitř
// dne podle času, ať se rozvrh vždycky ukáže v pořadí, v jakém den
// doopravdy probíhá, i když se hodiny zadaly v jiném pořadí.
export const serazenoPodleCasu = (hodiny: HodinaRozvrhu[]): HodinaRozvrhu[] =>
  [...hodiny].sort((a, b) => (a.den !== b.den ? a.den - b.den : a.casOd.localeCompare(b.casOd)))

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

// --- Docházka ---

export interface DochazkaPredmetu {
  predmet: string
  celkem: number
  pritomen: number
  procenta: number
}

// Běžná minimální hranice docházky na vysokých školách — jen orientační
// práh pro zvýraznění rizika, appka nikam nehlásí, žádné "vyloučen".
export const PRAH_RIZIKA_DOCHAZKY = 75

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
    }))
    .sort((a, b) => a.procenta - b.procenta)
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

const naIcsDatumCas = (datum: Date, cas: string): string => {
  const [hod, min] = cas.split(':').map(Number)
  return `${datum.getFullYear()}${paddedTwo(datum.getMonth() + 1)}${paddedTwo(datum.getDate())}T${paddedTwo(hod || 0)}${paddedTwo(min || 0)}00`
}

/** Sestaví .ics kalendář s jednou týdně se opakující událostí na
 *  hodinu (RRULE FREQ=WEEKLY) — floating místní čas, žádná časová zóna,
 *  stejná jednoduchost jako Kalendář's holé 'YYYY-MM-DD' řetězce. Bez
 *  UNTIL/COUNT: appka nezná konec semestru, opakuje se neomezeně. */
export const sestavIcsRozvrhu = (hodiny: HodinaRozvrhu[], ted: Date = new Date()): string => {
  const radky: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Buddy//Rozvrh//CS']

  hodiny.forEach((h, i) => {
    const datum = nejblizsiDatumPro(h.den, ted)
    radky.push('BEGIN:VEVENT', `UID:rozvrh-${h.id}-${i}@buddy`)
    radky.push(`DTSTART:${naIcsDatumCas(datum, h.casOd)}`)
    radky.push(`DTEND:${naIcsDatumCas(datum, h.casDo)}`)
    radky.push(`RRULE:FREQ=WEEKLY;BYDAY=${RRULE_DEN[h.den]}`)
    radky.push(`SUMMARY:${h.predmet || 'Bez názvu'}`)
    if (h.mistnost) radky.push(`LOCATION:${h.mistnost}`)
    if (h.vyucujici) radky.push(`DESCRIPTION:${h.vyucujici}`)
    radky.push('END:VEVENT')
  })

  radky.push('END:VCALENDAR')
  return radky.join('\r\n')
}
