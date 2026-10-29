import { DueInfo, PRIORITY_WEIGHT, StudyTask, formatDueDate } from '@/miniapps/study-planner/types'

// ==========================================
// Chytrý souhrn — School Roomova úvodní věta ("Ve čtvrtek písemka
// z matematiky. Dnes máš připravené procvičování rovnic na 25 minut.").
// Čistá funkce nad Planerovými úkoly, žádný nový store — appka tu
// nevymýšlí nic, co by Planer sám neznal (dueDate/priority/
// estimateMinutes), jen to skládá do jedné věty při otevření pokoje.
// ==========================================

export interface ChytrySouhrn {
  // Nejbližší nesplněný termín (podle dueDate) — null, pokud appka
  // nemá žádný nesplněný úkol s platným termínem.
  nejblizsiTermin: { task: StudyTask; due: DueInfo } | null
  // Konkrétní dnešní krok — nejbližší nesplněný úkol plánovaný/
  // splatný dnes, podle priority, pak podle pořadí v poli (appka řadí
  // stabilně, novější úkoly jsou v poli napřed — viz addTask).
  dnesniKrok: StudyTask | null
}

/** Sestaví souhrn z aktuálního seznamu úkolů a dnešního data
 *  (YYYY-MM-DD) — appka datum dostává zvenčí, ať appka nemusí
 *  vytvářet druhé new Date() vedle School Roomova vlastního `ted`. */
export const sestavChytrySouhrn = (tasks: StudyTask[], dnesniStr: string): ChytrySouhrn => {
  const nesplnene = tasks.filter((t) => !t.completed)

  const serazenePodleTerminu = nesplnene
    .filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const nejblizsiTask = serazenePodleTerminu[0] ?? null

  const dnesni = nesplnene
    .filter((t) => (t.planDate ?? t.dueDate) === dnesniStr)
    .sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority])
  const dnesniKrok = dnesni[0] ?? null

  return {
    nejblizsiTermin: nejblizsiTask ? { task: nejblizsiTask, due: formatDueDate(nejblizsiTask.dueDate) } : null,
    dnesniKrok,
  }
}

/** Lidská věta o nejbližším termínu — appka ji sestavuje zvlášť od
 *  JSX, ať appka umí jednoduše testovat výsledný text, ne jen tvar
 *  dat. "Dnes"/"Zítra" appka nechává tak, jak formatDueDate vrátí —
 *  "Ve čtvrtek" ze zadání appka nenapodobuje přesně (appka by musela
 *  znovu psát den-v-týdnu formátovač, co jinde v appce není), ale
 *  stejný styl ("kdy — co") appka dodržuje. */
export const vetaONejblizsimTerminu = (souhrn: ChytrySouhrn): string => {
  if (!souhrn.nejblizsiTermin) return 'Zatím nemáš žádný nesplněný úkol s termínem.'
  const { task, due } = souhrn.nejblizsiTermin
  return `${due.label}: ${task.subject} — ${task.topic}.`
}

/** Lidská věta o dnešním konkrétním kroku. */
export const vetaODnesnimKroku = (souhrn: ChytrySouhrn): string => {
  if (!souhrn.dnesniKrok) return 'Dnes nemáš nic naplánované — dobrá chvíle přidat si úkol v Planeru.'
  const { topic, estimateMinutes } = souhrn.dnesniKrok
  return estimateMinutes ? `Dnes máš připravené ${topic} na ${estimateMinutes} minut.` : `Dnes máš na programu ${topic}.`
}
