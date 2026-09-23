export type GoalCategory = 'Studium' | 'Návyky' | 'Osobní'

export const GOAL_CATEGORIES: GoalCategory[] = ['Studium', 'Návyky', 'Osobní']

export const ALL_GOALS = 'Vše'

// Priorita cíle — pevná trojice, řadí se podle ní seznam (Vysoká napřed).
export type GoalPriority = 'vysoka' | 'stredni' | 'nizka'

export const GOAL_PRIORITIES: GoalPriority[] = ['vysoka', 'stredni', 'nizka']

export const PRIORITA_LABEL: Record<GoalPriority, string> = {
  vysoka: 'Vysoká',
  stredni: 'Střední',
  nizka: 'Nízká',
}

// Nižší číslo = vpředu v seznamu.
export const PRIORITA_VAHA: Record<GoalPriority, number> = { vysoka: 0, stredni: 1, nizka: 2 }

// Cíl s číselným postupem k jedné cílové hodnotě ('cil', výchozí — chybějící
// pole u starších uložených cílů znamená tohle) vs. opakovaný návyk ('navyk'),
// u kterého current/target neznamenají totéž — viz spocitejTydenniPokrokNavyku.
export type GoalTyp = 'cil' | 'navyk'

export interface Milnik {
  id: string
  text: string
  done: boolean
}

export interface Goal {
  id: string
  title: string
  current: number
  target: number
  unit: string
  category: GoalCategory
  // Nastaví se, když cíl poprvé dosáhne cílové hodnoty, a už se nemaže.
  // Kdyby se dal vynulovat, šlo by XP donekonečna sbírat tím, že si
  // uživatel cíl znovu sníží a zase dotáhne.
  completedAt?: string | null

  // --- Profesionální použití ---
  // Termín ve tvaru YYYY-MM-DD, nebo null (bez termínu). Zone-less
  // řetězec, ne Date/timestamp — stejná opatrnost jako u Kalendáře,
  // aby UTC posun neposunul den podle časového pásma prohlížeče.
  deadline?: string | null
  priority?: GoalPriority
  // Soukromá poznámka/deníček k cíli — nikdy se neposílá nikam ven,
  // jen lokální secureStorage jako zbytek cíle.
  poznamka?: string
  milniky?: Milnik[]
  // U 'navyk' cílů current/target nedrží číselný postup appka sama —
  // "current" se vždycky dopočítává ze seznamu navykDny při čtení
  // (viz spocitejTydenniPokrokNavyku), aby se zobrazená hodnota nemohla
  // rozejít se skutečnou historií, kdyby appka pár dní zůstala zavřená.
  typ?: GoalTyp
  // Dny (YYYY-MM-DD), kdy byl návyk odškrtnutý — celá historie, ne jen
  // aktuální okno, ať jde dopočítat i delší série zpětně.
  navykDny?: string[]
  // Dny, za které už bylo vyplaceno XP — permanentní, append-only záznam,
  // nikdy se z něj nic neodebírá (ani při odškrtnutí zpátky). Bez něj by
  // odškrtnutí-zrušení-odškrtnutí ve stejný den vyplatilo XP tolikrát,
  // kolikrát to uživatel stihne přepnout — stejná "vydělaný pokrok nikdy
  // nejde zpátky" zásada jako u BACKUP_STORES's gamification
  // restorable: false, jen na úrovni jednoho dne místo celého účtu.
  navykXpDny?: string[]
}

// Ukázkové cíle tu schválně nejsou — každý si zakládá svoje.
// Původní trojice ("Přečíst knihu", "Ranní cvičení", "Učení angličtiny")
// vypadala jako data uživatele, přitom mu nepatřila.
export const DEMO_GOAL_IDS = ['1', '2', '3']
export const DEMO_GOAL_TITLES = ['Přečíst knihu', 'Ranní cvičení', 'Učení angličtiny']

// ==========================================
// Šablony — pevná, malá sada rychlých startů, ne uživatelem upravitelný
// systém (stejná "pevná sada, ne libovolný vstup" zásada jako u
// Writer's Roomových SABLONY_KAPITOL/SABLONY_SCEN). Cíl vytvořený ze
// šablony je normální, plně upravitelný cíl — šablona jen předvyplní
// první hodnoty, nic dalšího si nepamatuje.
// ==========================================
export interface SablonaCile {
  id: string
  nazev: string
  popis: string
  typ: GoalTyp
  target: number
  unit: string
  category: GoalCategory
  // Vidí ji každý (appka nikdy neschovává, co existuje), použije jen
  // VIP účet — stejná "vidět, ne použít" zásada jako u Writer's Roomova
  // SablonaKapitol.vip. Chybějící pole = volně dostupná šablona.
  vip?: boolean
}

export const SABLONY_CILU: SablonaCile[] = [
  { id: 'knihy', nazev: 'Přečíst 12 knih', popis: 'Jedna kniha měsíčně', typ: 'cil', target: 12, unit: 'knih', category: 'Studium' },
  { id: 'usporit', nazev: 'Ušetřit 20 000 Kč', popis: 'Dlouhodobá finanční rezerva', typ: 'cil', target: 20000, unit: 'Kč', category: 'Osobní' },
  { id: 'slovicka', nazev: 'Naučit se 500 slovíček', popis: 'Slovní zásoba cizího jazyka', typ: 'cil', target: 500, unit: 'slovíček', category: 'Studium' },
  { id: 'cviceni', nazev: 'Cvičit 5× týdně', popis: 'Pravidelný pohyb', typ: 'navyk', target: 5, unit: '', category: 'Návyky' },
  { id: 'meditace', nazev: 'Meditovat každý den', popis: 'Krátká denní meditace', typ: 'navyk', target: 7, unit: '', category: 'Návyky' },
  { id: 'diplomka', nazev: 'Napsat 100 stran diplomky', popis: 'Rozdělené na zvládnutelné kroky', typ: 'cil', target: 100, unit: 'stran', category: 'Studium' },
  // Exkluzivní VIP šablony — záměrně o řád náročnější verze existujících
  // (100 000 Kč místo 20 000, cvičení každý den místo 5×), ne dvě
  // vymyšlené kategorie navíc, ať je rozdíl od volných šablon na první
  // pohled jasný.
  { id: 'usporit-velky', nazev: 'Ušetřit 100 000 Kč', popis: 'Velký finanční cíl na rok', typ: 'cil', target: 100000, unit: 'Kč', category: 'Osobní', vip: true },
  { id: 'cviceni-kazdyden', nazev: 'Cvičit každý den', popis: 'Náročnější verze pravidelného pohybu', typ: 'navyk', target: 7, unit: '', category: 'Návyky', vip: true },
]

// ==========================================
// Datum a termín — stejná "zone-less string, ne Date/timestamp" opatrnost
// jako u Study Planneru/Kalendáře. Vlastní kopie, ne import napříč
// miniaplikacemi — Goal Tracker zůstává samostatný stejně jako všude
// jinde v CLAUDE.md (přijaté malé zdvojení).
// ==========================================

/** Dnešek jako YYYY-MM-DD v místním čase. */
export const dnesniDatum = (d = new Date()): string => {
  const mesic = `${d.getMonth() + 1}`.padStart(2, '0')
  const den = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${mesic}-${den}`
}

export interface TerminInfo {
  label: string
  tone: 'overdue' | 'today' | 'soon' | 'later'
}

/** Převede termín na lidský popisek + naléhavost, stejný tvar jako
 *  Study Plannerovo formatDueDate. */
export const formatujTermin = (deadline: string, dnes = new Date()): TerminInfo => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return { label: deadline || 'Bez termínu', tone: 'later' }

  const dnesniIso = dnesniDatum(dnes)
  if (deadline === dnesniIso) return { label: 'Dnes', tone: 'today' }

  const diffDny = Math.round(
    (new Date(`${deadline}T00:00:00`).getTime() - new Date(`${dnesniIso}T00:00:00`).getTime()) / 86_400_000
  )
  const formatovano = new Date(`${deadline}T00:00:00`).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })

  if (diffDny === -1) return { label: 'Včera', tone: 'overdue' }
  if (diffDny < 0) return { label: `Po termínu · ${formatovano}`, tone: 'overdue' }
  if (diffDny === 1) return { label: 'Zítra', tone: 'soon' }
  if (diffDny <= 3) return { label: `Za ${diffDny} dny · ${formatovano}`, tone: 'soon' }
  return { label: formatovano, tone: 'later' }
}

// ==========================================
// Návyky — current/target se u typu 'navyk' nikdy neukládají jako
// zdroj pravdy, dopočítávají se vždycky z navykDny (stejné "vyhodnoť
// při čtení, nikdy nevěř uloženému" jako resolveActiveRoleId/
// resolveActiveThemeId jinde v appce) — appka tak nemůže zůstat s
// týden starým číslem jen proto, že ji uživatel pár dní neotevřel.
// ==========================================

const OKNO_DNI_NAVYKU = 7

/** Je návyk odškrtnutý pro zadaný den (výchozí dnešek)? */
export const jeNavykOznacenDnes = (goal: Goal, dnes = new Date()): boolean =>
  (goal.navykDny ?? []).includes(dnesniDatum(dnes))

/** Kolikrát byl návyk odškrtnutý za posledních 7 dní včetně dneška —
 *  "current" pro zobrazení u návykových cílů. */
export const spocitejTydenniPokrokNavyku = (goal: Goal, dnes = new Date()): number => {
  const hranice = new Date(dnes)
  hranice.setDate(hranice.getDate() - (OKNO_DNI_NAVYKU - 1))
  const hraniceIso = dnesniDatum(hranice)
  const dnesniIso = dnesniDatum(dnes)
  return (goal.navykDny ?? []).filter((d) => d >= hraniceIso && d <= dnesniIso).length
}

/** Aktuální série po sobě jdoucích dní. Pokud dnešek ještě není
 *  odškrtnutý, počítá se od včerejška — jinak by nesplněný dnešek hned
 *  na startu vynuloval sérii, kterou má uživatel ještě šanci dnes
 *  prodloužit. */
export const spocitejSeriiNavyku = (goal: Goal, dnes = new Date()): number => {
  const dny = new Set(goal.navykDny ?? [])
  const kurzor = new Date(dnes)
  if (!dny.has(dnesniDatum(kurzor))) kurzor.setDate(kurzor.getDate() - 1)

  let serie = 0
  while (dny.has(dnesniDatum(kurzor))) {
    serie++
    kurzor.setDate(kurzor.getDate() - 1)
  }
  return serie
}

export interface HeatmapDen {
  /** 'YYYY-MM-DD' — stejný zápis jako navykDny samotné. */
  datum: string
  oznaceno: boolean
}

// 84 dní = 12 týdnů — dost dlouhé okno na to, aby byl vidět skutečný
// vzorec (víkendy, přestávky), a pořád se vejde do malé mřížky na
// telefonu bez zmenšení pod čitelnost jednoho čtverečku.
const POCET_DNI_HEATMAPY = 84

/** Posledních `pocetDni` dní (včetně dneška) jako plochý, chronologicky
 *  seřazený seznam — appka si je v komponentě sama poskládá do mřížky
 *  (GoalTracker.tsx's .gt-heatmapa), stejný "appka si mřížku poskládá
 *  z pole, žádná knihovna" vzor jako Writer Roomova 14denní aktivita.
 *  Čistá funkce, testovatelná bez store. */
export const spocitejHeatmapuNavyku = (
  goal: Goal,
  dnes = new Date(),
  pocetDni: number = POCET_DNI_HEATMAPY
): HeatmapDen[] => {
  const oznacene = new Set(goal.navykDny ?? [])
  const dny: HeatmapDen[] = []
  for (let i = pocetDni - 1; i >= 0; i--) {
    const d = new Date(dnes)
    d.setDate(d.getDate() - i)
    const iso = dnesniDatum(d)
    dny.push({ datum: iso, oznaceno: oznacene.has(iso) })
  }
  return dny
}

export interface TydenniSouhrn {
  dokoncenoCilu: number
  navykovychOdskrtnuti: number
}

/** Kolik číselných cílů bylo dokončeno a kolikrát se za posledních 7
 *  dní (včetně dneška) odškrtl nějaký návyk — vstup pro týdenní
 *  souhrnné upozornění (checkWeeklyDigest v useGoalTracker.ts). Čistá
 *  funkce, testovatelná bez store/notifikace. */
export const spocitejTydenniSouhrn = (goals: Goal[], dnes = new Date()): TydenniSouhrn => {
  const hranice = new Date(dnes)
  hranice.setDate(hranice.getDate() - 6)
  const hraniceIso = dnesniDatum(hranice)
  const dnesniIso = dnesniDatum(dnes)

  const dokoncenoCilu = goals.filter((g) => {
    if ((g.typ ?? 'cil') !== 'cil' || !g.completedAt) return false
    const den = g.completedAt.slice(0, 10)
    return den >= hraniceIso && den <= dnesniIso
  }).length

  const navykovychOdskrtnuti = goals
    .filter((g) => g.typ === 'navyk')
    .reduce((sum, g) => sum + (g.navykDny ?? []).filter((d) => d >= hraniceIso && d <= dnesniIso).length, 0)

  return { dokoncenoCilu, navykovychOdskrtnuti }
}

// ==========================================
// Sanitizace, řazení — čisté funkce nad Goal, žít musí tady, ne v
// useGoalTracker.ts. useGoalTracker.ts od téhle relace poprvé
// importuje core/utils/notify.ts (upozornění na termíny), a to
// přetahuje virtual:pwa-register (registerSW.ts), který Vitestovo
// vlastní Vite nedokáže vyřešit — stejná past, co CLAUDE.md už
// dokumentuje pro useFinance.ts. Umístěním sem zůstávají tyhle funkce
// testovatelné bez mockování celého modulu.
// ==========================================

/** Poškozený milník se tiše vyřadí, ne celý cíl — stejné "poškozená
 *  položka zmizí, seznam kolem ní zůstane" jako u ostatních miniapek. */
const sanitizujMilniky = (raw: unknown): Milnik[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (m): m is Milnik =>
        !!m && typeof m === 'object' && typeof (m as Milnik).id === 'string' && typeof (m as Milnik).text === 'string'
    )
    .map((m) => ({ id: m.id, text: m.text, done: !!m.done }))
}

const sanitizujNavykDny = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) : []

/** Bylo za zadaný den u tohohle návyku už vyplaceno XP? Chybějící pole
 *  (cíl uložený před touto opravou) se bere jako "ne" — o nic to
 *  neošidí, jen se první další odškrtnutí znovu započítá, což je
 *  bezpečnější než tvářit se, že XP za starou historii už bylo dané. */
export const bylaVyplacenaXpZaNavyk = (goal: Goal, den: string): boolean =>
  (goal.navykXpDny ?? []).includes(den)

/** Doplní chybějící/poškozená pole na bezpečné výchozí hodnoty —
 *  stejný hand-rolled přístup jako Mind Mapovo sanitizeNode(), Goal
 *  Tracker nikdy neměl valibot schéma a zavádět ho jen pro pár nových
 *  polí by bylo víc rozsahu, než tahle oprava potřebuje.
 *
 *  Součástí je i oprava reálného bugu: cíl uložený ještě předtím, než
 *  existovalo pole completedAt, dřív dostával completedAt: '' (prázdný
 *  řetězec) — ale ten je "falsy" stejně jako null, takže
 *  changeProgress's kontrola `!goal.completedAt` brala takový (už
 *  dávno splněný) cíl pořád za nesplněný. Šlo mu tak ubrat pokrok
 *  tlačítkem "−" a znovu ho dotáhnout na cíl, a XP by se vyplatilo
 *  podruhé — přesně ta díra, kterou completedAt mělo podle svého
 *  vlastního komentáře zavírat. Skutečné (i když jen přibližné, "právě
 *  teď zjištěno jako hotové") datum tu díru zavírá, protože je vždycky
 *  truthy. */
export const sanitizujCil = (goal: Goal): Goal => ({
  ...goal,
  completedAt:
    goal.current >= goal.target ? goal.completedAt || new Date().toISOString() : goal.completedAt || null,
  priority: (['vysoka', 'stredni', 'nizka'] as GoalPriority[]).includes(goal.priority as GoalPriority)
    ? goal.priority
    : 'stredni',
  poznamka: typeof goal.poznamka === 'string' ? goal.poznamka : '',
  milniky: sanitizujMilniky(goal.milniky),
  typ: goal.typ === 'navyk' ? 'navyk' : 'cil',
  navykDny: sanitizujNavykDny(goal.navykDny),
  navykXpDny: sanitizujNavykDny(goal.navykXpDny),
  deadline: typeof goal.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(goal.deadline) ? goal.deadline : null,
})

/** Číselný cíl je "hotový", jen když dosáhl své cílové hodnoty — návyk
 *  se nikdy natrvalo nesplní, takže se za hotový nepovažuje nikdy. */
export const jeHotovyCil = (g: Goal): boolean => (g.typ ?? 'cil') === 'cil' && g.current >= g.target

// Nesplněné napřed, uvnitř podle termínu (bez termínu na konec) a při
// shodě podle priority — stejná logika jako Study Plannerovo compareTasks.
export const compareGoals = (a: Goal, b: Goal): number => {
  const aHotovo = jeHotovyCil(a)
  const bHotovo = jeHotovyCil(b)
  if (aHotovo !== bHotovo) return aHotovo ? 1 : -1

  const aTermin = a.deadline ?? '9999-99-99'
  const bTermin = b.deadline ?? '9999-99-99'
  if (aTermin !== bTermin) return aTermin.localeCompare(bTermin)

  return PRIORITA_VAHA[a.priority ?? 'stredni'] - PRIORITA_VAHA[b.priority ?? 'stredni']
}

// ==========================================
// Sdílení pokroku — čistý stavební blok textu, appka sama nikdy
// nepošle nic přímo (core/utils/sdileni.ts's sdilejText to udělá),
// tady jen skládá, CO se pošle, ať je to testovatelné bez Web Share
// API. Číselný cíl posílá procenta, návyk posílá aktuální sérii —
// stejné dvě různé věci, co appka jinde ukazuje odděleně.
// ==========================================
export const sestavTextSdileniCile = (goal: Goal, dnes = new Date()): string => {
  if ((goal.typ ?? 'cil') === 'navyk') {
    const serie = spocitejSeriiNavyku(goal, dnes)
    return `🔁 „${goal.title}“ — ${serie} ${serie === 1 ? 'den' : serie >= 2 && serie <= 4 ? 'dny' : 'dní'} v řadě! 💪`
  }
  const percent = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0
  return `🎯 „${goal.title}“ — ${goal.current}/${goal.target}${goal.unit ? ` ${goal.unit}` : ''} (${percent} %)`
}

// ==========================================
// Export do CSV — stejná česká Excel konvence (středník, BOM) jako
// Form Checkova sestavCsvSezeni, samostatná kopie csvEscape místo
// importu odtamtud — nezávislé miniapky, stejná přijatá duplikace jako
// BARVY_UZLU jinde v appce.
// ==========================================
const csvEscape = (hodnota: string): string => {
  if (/[";\n]/.test(hodnota)) return `"${hodnota.replace(/"/g, '""')}"`
  return hodnota
}

export const sestavCsvCilu = (goals: Goal[], dnes = new Date()): string => {
  const hlavicka = ['Název', 'Typ', 'Kategorie', 'Priorita', 'Termín', 'Pokrok', 'Stav', 'Datum splnění', 'Poznámka'].join(
    ';'
  )
  const radky = goals.map((g) => {
    const jeNavyk = (g.typ ?? 'cil') === 'navyk'
    const pokrok = jeNavyk
      ? `${spocitejTydenniPokrokNavyku(g, dnes)}/${g.target}× týdně, série ${spocitejSeriiNavyku(g, dnes)}`
      : `${g.current}/${g.target}${g.unit ? ` ${g.unit}` : ''}`
    return [
      csvEscape(g.title),
      jeNavyk ? 'Návyk' : 'Cíl',
      g.category,
      PRIORITA_LABEL[g.priority ?? 'stredni'],
      g.deadline ?? '',
      csvEscape(pokrok),
      jeHotovyCil(g) ? 'Splněno' : 'Aktivní',
      g.completedAt ? new Date(g.completedAt).toLocaleDateString('cs-CZ') : '',
      csvEscape(g.poznamka ?? ''),
    ].join(';')
  })
  // BOM na začátku, ať Excel český text (diakritiku) rozpozná jako
  // UTF-8 a nezobrazí ho jako změť — bez něj Excel často naslepo
  // předpokládá Windows-1250.
  return `﻿${[hlavicka, ...radky].join('\r\n')}`
}
