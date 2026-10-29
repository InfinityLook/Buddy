export type TaskPriority = 'Vysoká' | 'Střední' | 'Nízká'

export const TASK_PRIORITIES: TaskPriority[] = ['Vysoká', 'Střední', 'Nízká']

export type TaskFilter = 'Vše' | 'Nesplněné' | 'Splněné'

export const TASK_FILTERS: TaskFilter[] = ['Vše', 'Nesplněné', 'Splněné']

export interface Podukol {
  id: string
  text: string
  hotovo: boolean
}

export interface PrilohaUkolu {
  id: string
  nazev: string
  mime: string
}

// Opakování úkolu — appka při zaškrtnutí opakujícího se úkolu nevytočí
// obyčejné "hotovo", ale (viz useStudyPlanner.ts's toggleTask) vytvoří
// DALŠÍ výskyt s posunutým termínem a teprve PŮVODNÍ instanci, co
// uživatel doopravdy udělal, označí za hotovou — stejný "dokončení
// vytvoří další výskyt" vzorec, jaký TickTick/Todoist u opakovaných
// úkolů používají, ne appka, co jednu položku navždy posouvá dokola.
export type Opakovani = 'zadne' | 'tydne' | 'mesicne'

export const OPAKOVANI_LABELS: Record<Opakovani, string> = {
  zadne: 'Jednorázově',
  tydne: 'Každý týden',
  mesicne: 'Každý měsíc',
}

// Prostor id pro přílohy ve sdíleném IndexedDB blob store
// (core/utils/fileStorage.ts) — stejný "vlastní prefix, jedno sdílené
// úložiště" vzorec jako Financí UCTENKA_ID_PREFIX/Music Studiovo
// NAHRAVKA_ID_PREFIX. restoreFilesFromZip (core/utils/fileBackup.ts)
// musí o téhle appce vědět taky, jinak by obnovená příloha po
// zálohování/obnově ztratila svůj skutečný MIME typ.
export const PRILOHA_ID_PREFIX = 'planer-priloha-'

export interface StudyTask {
  id: string
  subject: string
  topic: string
  // Termín ve tvaru YYYY-MM-DD. Starší úkoly tu můžou mít volný text
  // ("Dnes") — proto se všude formátuje přes formatDueDate, který si
  // s neplatnou hodnotou poradí.
  dueDate: string
  priority: TaskPriority
  completed: boolean
  // Nepovinné — starší úkol tohle pole vůbec nemá (žádná valibot
  // validace tenhle store nemá, appka to tak čte defenzivně všude jako
  // (task.podukoly ?? [])), appka funguje úplně stejně bez jediného
  // podúkolu, dokončení úkolu samo o sobě žádný podúkol nevyžaduje.
  podukoly?: Podukol[]
  // --- School Room: dokončený systém pro studium, Fáze 1 ---
  // Odhadovaný čas práce v minutách — appka ho nikdy sama nevymýšlí,
  // je to jen to, co si uživatel sám odhadne (chytrySouhrn.ts ho pak
  // umí přečíst zpátky do věty "na N minut").
  estimateMinutes?: number | null
  // Den, kdy na úkolu PLÁNUJEŠ reálně pracovat — odlišný od dueDate
  // (termínu odevzdání). Nepovinný; bez vyplnění appka v pohledech
  // "Dnes"/"Týden" počítá jen s dueDate, přesně jako dřív.
  planDate?: string | null
  opakovani?: Opakovani
  // Volná soukromá poznámka k úkolu — ne vazba na Quick Notes. Appka
  // mezi miniaplikacemi nemá sdílený odkazovací mechanismus (viz
  // CLAUDE.md's Kalendář→Rozvrh jako jediná, úzce zdokumentovaná
  // výjimka) a stavět ho jen pro tohle jedno pole by bylo nad rámec
  // týhle fáze — poznámka u úkolu samotného (stejný "loose merge-by-id"
  // tvar jako Goal Trackerovo nastavPoznamku) ale pokrývá praktický
  // případ "zapsat si pár slov k úkolu" i bez křížení do cizí appky.
  poznamka?: string
  // Přílohy — appka drží jen metadata, obsah leží ve fileStorage.ts
  // (viz PRILOHA_ID_PREFIX výš).
  prilohy?: PrilohaUkolu[]
  // Kolikrát appka termín posunula (viz useStudyPlanner.ts's
  // posunoutUkol, "Nestihnuté" pohled) a jaký byl úplně PŮVODNÍ termín
  // před prvním posunem — appka ho nastaví jen jednou, další posuny ho
  // nepřepisují, ať historie zůstane čitelná ("tohle měl být 3. týden
  // po sobě posunutý úkol", ne jen jedno stále stejné datum).
  posunuto?: number
  puvodniTermin?: string | null
  // --- Cloudová synchronizace (skolaSync.ts) ---
  // Tenhle store nemá žádnou valibot validaci (viz komentář výš), takže
  // se starší úkol bez těchhle polí dorovná přímo v persist's merge
  // (useStudyPlanner.ts's backfillSyncFields), ne v samostatném
  // sanitizuj* souboru jako u ostatních miniaplikací. updatedAt
  // rozhoduje "kdo vyhrává" při sloučení mezi zařízeními, deletedAt je
  // tombstone měkkého smazání (viz deleteTask).
  createdAt: string
  updatedAt: number
  deletedAt: number | null
}

/** Kolik podúkolů je hotovo z celkového počtu — čistá pomocná funkce,
 *  appka ji používá jak v seznamu úkolů, tak v detailu jednoho úkolu. */
export const spocitejPodukoly = (task: StudyTask): { hotovo: number; celkem: number } => {
  const podukoly = task.podukoly ?? []
  return { hotovo: podukoly.filter((p) => p.hotovo).length, celkem: podukoly.length }
}

// Nový uživatel začíná s prázdným plánem — viz DEMO_TASK_IDS níž.
export const INITIAL_TASKS: StudyTask[] = []

// Ukázkové úkoly z matematiky a fyziky se tvářily jako uživatelovy
// a prosakovaly až do denní výzvy v Hubu ("Dnes tě čeká 1 úkol
// z matematiky"), přestože si je nikdo nezadal. Poznáme je podle id
// i tématu zároveň, ať se nesmaže vlastní úkol se stejným id.
export const DEMO_TASK_IDS = ['1', '2']
export const DEMO_TASK_TOPICS = [
  'Integrální počet - příprava na test',
  'Laboratorní práce #3',
]

// Dnešek jako YYYY-MM-DD v místním čase. toISOString() by tu byl chyba —
// vrací UTC, takže večer v našem pásmu ukazuje už zítřek.
export const todayIso = (): string => {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export interface DueInfo {
  label: string
  // 'overdue' = po termínu, 'today' = dnes, 'soon' = do tří dnů, jinak 'later'
  tone: 'overdue' | 'today' | 'soon' | 'later'
}

// Převede termín na lidský popisek. Neplatnou nebo starou textovou
// hodnotu vrátí beze změny místo "Invalid Date".
export const formatDueDate = (dueDate: string): DueInfo => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { label: dueDate || 'Bez termínu', tone: 'later' }
  }

  const today = todayIso()
  if (dueDate === today) return { label: 'Dnes', tone: 'today' }

  const diffDays = Math.round(
    (new Date(`${dueDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) /
      86_400_000
  )

  const formatted = new Date(`${dueDate}T00:00:00`).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
  })

  if (diffDays === -1) return { label: 'Včera', tone: 'overdue' }
  if (diffDays < 0) return { label: `Po termínu · ${formatted}`, tone: 'overdue' }

  if (diffDays === 1) return { label: 'Zítra', tone: 'soon' }
  if (diffDays <= 3) return { label: `Za ${diffDays} dny · ${formatted}`, tone: 'soon' }

  return { label: formatted, tone: 'later' }
}

// Vyvedené z useStudyPlanner.ts na nejvyšší úroveň (dřív to byla jeho
// soukromá konstanta) — chytrySouhrn.ts potřebuje přesně tutéž váhu
// priorit pro "dnešní krok", appka tak nemůže mít dvě kopie, co by se
// mohly časem rozejít.
export const PRIORITY_WEIGHT: Record<TaskPriority, number> = { Vysoká: 0, Střední: 1, Nízká: 2 }

// Pohledy nad úkoly — "Dnes"/"Týden"/"Nestihnuté"/"Předměty" vedle
// "Vše" doplňují (ne nahrazují) stávající Vše/Nesplněné/Splněné filtr
// stavu dokončení — appka obě dimenze kombinuje (viz useStudyPlanner.ts).
export type TaskView = 'vse' | 'dnes' | 'tyden' | 'nestihnute' | 'predmety'

export const TASK_VIEWS: { id: TaskView; label: string }[] = [
  { id: 'vse', label: 'Vše' },
  { id: 'dnes', label: 'Dnes' },
  { id: 'tyden', label: 'Týden' },
  { id: 'nestihnute', label: 'Nestihnuté' },
  { id: 'predmety', label: 'Předměty' },
]

/** Pondělí–neděle aktuálního týdne jako YYYY-MM-DD řetězce — appka
 *  počítá z místního data, ne UTC (stejný důvod jako todayIso). */
export const tydenniRozsah = (ted: Date = new Date()): { od: string; doo: string } => {
  // getDay(): 0=neděle..6=sobota → appka chce pondělí jako první den.
  const denVTydnu = (ted.getDay() + 6) % 7
  const pondeli = new Date(ted.getFullYear(), ted.getMonth(), ted.getDate() - denVTydnu)
  const nedele = new Date(pondeli.getFullYear(), pondeli.getMonth(), pondeli.getDate() + 6)
  const naIso = (d: Date) =>
    `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`
  return { od: naIso(pondeli), doo: naIso(nedele) }
}

/** Je datum (YYYY-MM-DD) uvnitř [od, doo] včetně obou krajů? Neplatný
 *  řetězec (starý volný text v dueDate) appka řeší jako "ne". */
export const jeVRozsahu = (datum: string | null | undefined, od: string, doo: string): boolean => {
  if (!datum || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) return false
  return datum >= od && datum <= doo
}

/** Rozhodne, jestli úkol patří do daného dne — podle plánovaného dne
 *  práce (planDate), když je zadaný, jinak podle termínu (dueDate). */
export const patriKeDni = (task: StudyTask, den: string): boolean =>
  (task.planDate ?? task.dueDate) === den

/** Datum příštího výskytu opakujícího se úkolu. Měsíčně appka
 *  přeskočí měsíc, co daný den v měsíci vůbec nemá (31. v lednu →
 *  31. v březnu, únor appka přeskočí) — stejná konvence jako appčino
 *  opakování událostí v Kalendáři (kalendar/types.ts), aby appka
 *  neměla dvě různá pravidla pro "co znamená měsíčně". */
export const dalsiTerminOpakovani = (aktualniTermin: string, opakovani: Opakovani): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(aktualniTermin) || opakovani === 'zadne') return aktualniTermin

  const [rok, mesic, den] = aktualniTermin.split('-').map(Number)
  const naIso = (r: number, m: number, d: number) =>
    `${r}-${`${m}`.padStart(2, '0')}-${`${d}`.padStart(2, '0')}`

  if (opakovani === 'tydne') {
    const datum = new Date(rok, mesic - 1, den + 7)
    return naIso(datum.getFullYear(), datum.getMonth() + 1, datum.getDate())
  }

  // Měsíčně — appka hledá nejbližší další měsíc, co daný den skutečně
  // má, nejvýš dva roky dopředu (defenzivní strop, prakticky nikdy
  // nedosažený — jen 31. v lednu/březnu/květnu/… ho nikdy nepotřebuje).
  let r = rok
  let m = mesic
  for (let i = 0; i < 24; i++) {
    m += 1
    if (m > 12) {
      m = 1
      r += 1
    }
    const posledniDenMesice = new Date(r, m, 0).getDate()
    if (den <= posledniDenMesice) return naIso(r, m, den)
  }
  return aktualniTermin
}
