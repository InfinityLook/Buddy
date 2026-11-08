export type TimerMode = 'work' | 'shortBreak' | 'longBreak'

export interface TimerSettings {
  // Délky v minutách — tak je uživatel zadává i vidí
  work: number
  shortBreak: number
  longBreak: number
  // Po kolika soustředěních přijde dlouhá pauza
  cycleLength: number
  soundEnabled: boolean
  // Další fáze (pauza po soustředění, další soustředění po pauze) se
  // spustí sama, bez čekání na Start. Vypnuto ve výchozím stavu — appka
  // dřív měla stejnou plnou logiku (switchMode's autoStart parametr)
  // hotovou, jen ji nikdy nic v appce nezavolalo s true, takže vlastně
  // nikdy nešla zapnout.
  autoStartNextPhase: boolean
}

export const DEFAULT_SETTINGS: TimerSettings = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
  cycleLength: 4,
  soundEnabled: true,
  autoStartNextPhase: false,
}

// Meze pro nastavení. Bez horní hranice by šlo zadat nesmysl, bez dolní
// by se z Pomodora stal klikací automat na XP.
export const LIMITS = {
  work: { min: 5, max: 90 },
  shortBreak: { min: 1, max: 30 },
  longBreak: { min: 5, max: 60 },
  cycleLength: { min: 2, max: 8 },
} as const

export const MODE_LABELS: Record<TimerMode, string> = {
  work: 'Soustředění',
  shortBreak: 'Krátká pauza',
  longBreak: 'Dlouhá pauza',
}

export const MODE_COLORS: Record<TimerMode, string> = {
  work: '#f59e0b',
  shortBreak: '#10b981',
  longBreak: '#3b82f6',
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.round(value) || min))

// Délka režimu v sekundách podle nastavení
export const durationFor = (mode: TimerMode, settings: TimerSettings): number =>
  settings[mode] * 60

/** Jestli má kliknutí na záložku režimu, co je už aktivní, zůstat
 *  no-op — jinak by tiše vynulovalo běžící (nebo pozastavený) odpočet
 *  zpátky na plnou délku a zastavilo ho, bez varování. Na vynulování
 *  délky v AKTUÁLNÍM režimu je vyhrazené tlačítko RESET. Netýká se
 *  autoStart volání z usePomodoro.ts's complete() — to si vždycky žádá
 *  JINÝ režim, než ve kterém appka právě je, proto "!autoStart".
 *
 *  Čistá funkce tady v types.ts, ne inline v usePomodoro.ts — ten
 *  soubor importuje core/utils/notify.ts, co přes core/utils/
 *  registerSW.ts sahá na Vite-only virtual:pwa-register modul,
 *  nerozpoznatelný pro Vitestovu vlastní instanci Vite (stejná
 *  "testovatelnost souboru je vlastnost celého importního grafu"
 *  past, jakou CLAUDE.md dokumentuje pro Writer's Room/Goal Tracker/
 *  Finance) — čistá logika žije tady, notify-volající lepidlo v
 *  usePomodoro.ts si ji odsud jen půjčuje. */
export const jeSwitchModeNoOp = (
  cilovyMod: TimerMode,
  aktualniMod: TimerMode,
  autoStart: boolean
): boolean => cilovyMod === aktualniMod && !autoStart

// ==========================================
// Historie dokončených soustředění — "Pomodoro podle předmětu" a
// School Roomův "Studijní cíl" obojí stojí na téhle jedné historii,
// ne na dvou různých počítadlech. Předmět je volný text, nepovinný a
// nevázaný na žádnou jinou appku (Známky apod.) — Pomodoro zůstává
// samostatná miniaplikace jako každá jiná, ne appka svázaná s tou
// druhou.
// ==========================================

export interface PomodoroSession {
  taskId?: string | null
  /** Absolutní čas dokončení (Date.now()) — stejný "časové razítko, ne
   *  countdown" přístup jako endsAt. */
  at: number
  minuty: number
  predmet: string | null
}

// Kolik záznamů historie appka drží nejvýš — dost na smysluplný přehled
// za týdny zpátky, ne neomezený růst uloženého stavu.
export const MAX_SESSION_LOG = 300

export interface SouhrnPredmetu {
  predmet: string | null
  minuty: number
}

/** Součet minut podle předmětu, seřazený od nejvíc odstudovaného —
 *  čistá funkce nad hotovou historií, žádný store, testovatelná bez
 *  komponenty. */
export const spocitejSouhrnPodlePredmetu = (log: PomodoroSession[]): SouhrnPredmetu[] => {
  const mapa = new Map<string | null, number>()
  for (const s of log) {
    mapa.set(s.predmet, (mapa.get(s.predmet) ?? 0) + s.minuty)
  }
  return [...mapa.entries()]
    .map(([predmet, minuty]) => ({ predmet, minuty }))
    .sort((a, b) => b.minuty - a.minuty)
}

// Kolik nejvýš naposledy použitých předmětů appka nabídne — dost na
// rychlý výběr, ne že by datalist narostl do stovek položek u
// někoho, kdo pokaždé napíše jiný text.
export const NEJVICE_NAPOSLEDY_POUZITYCH_PREDMETU = 20

/** Unikátní předměty z historie, od nejnověji použitého — datalist pro
 *  rychlý opakovaný výběr (viz input v Pomodoro.tsx), ať nejde omylem
 *  napsat ten samý předmět dvakrát jinak ("Matematika" vs "matematika")
 *  a rozdělit tak jeho minuty na dva různé řádky v "Podle předmětu". */
export const ziskejNaposledyPouziteNazvyPredmetu = (log: PomodoroSession[]): string[] => {
  const videno = new Set<string>()
  const vysledek: string[] = []
  for (let i = log.length - 1; i >= 0; i--) {
    const predmet = log[i].predmet
    if (!predmet || videno.has(predmet)) continue
    videno.add(predmet)
    vysledek.push(predmet)
    if (vysledek.length >= NEJVICE_NAPOSLEDY_POUZITYCH_PREDMETU) break
  }
  return vysledek
}
