import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { requestNotificationPermission, showAppNotification } from '@/core/utils/notify'
import { plural } from '@/core/utils/pluralCZ'
import {
  ALL_GOALS,
  DEMO_GOAL_IDS,
  DEMO_GOAL_TITLES,
  Goal,
  GoalCategory,
  GoalPriority,
  GoalTyp,
  Milnik,
  SABLONY_CILU,
  bylaVyplacenaXpZaNavyk,
  compareGoals,
  dnesniDatum,
  jeHotovyCil,
  jeNavykOznacenDnes,
  sanitizujCil,
  spocitejTydenniSouhrn,
} from './types'

// compareGoals/jeHotovyCil/sanitizujCil se dál používají v tomhle
// souboru — re-export kvůli zpětné kompatibilitě volajících, co je
// dřív importovaly odsud (viz komentář u jejich definice v types.ts).
export { compareGoals, jeHotovyCil, sanitizujCil }

// XP odměna za splnění celého cíle (dosažení target hodnoty)
const XP_PER_COMPLETED_GOAL = 25
// XP za odškrtnutí návyku pro daný den — menší, jednorázová akce, ne
// dokončení celého cíle, stejný řád jako Kalendářovo recordAction('kalendar', 5).
const XP_PER_HABIT_CHECKIN = 5

export interface NovyCilVstup {
  title: string
  target: number
  unit: string
  category: GoalCategory
  typ: GoalTyp
  priority: GoalPriority
  deadline: string | null
  poznamka: string
}

interface GoalTrackerState {
  goals: Goal[]
  // Datum (YYYY-MM-DD), kdy naposledy odešlo upozornění na termíny —
  // nejvýš jedno za den, stejný vzor jako Study Plannerovo lastReminderDate.
  lastReminderDate: string | null
  // Stejné, ale pro upozornění na neodškrtnuté návyky (checkHabitReminders
  // níž) — vlastní, nezávislé datum, ať odeslání jednoho upozornění
  // nezablokuje to druhé jen proto, že sdílí den.
  lastHabitReminderDate: string | null
  // ISO týdenní klíč (RRRR-Wtt) týdne, za který appka naposledy poslala
  // souhrnné upozornění (checkWeeklyDigest níž) — na rozdíl od denních
  // připomínek výš se porovnává týden, ne den, protože se posílá nejvýš
  // jednou týdně, ne jednou denně.
  lastDigestWeekKey: string | null
  // Vrací, jestli tenhle konkrétní krok cíl PRÁVĚ TEĎ poprvé dokončil —
  // GoalTracker.tsx to čte synchronně po zavolání, ať ví, jestli má
  // spustit oslavu, aniž by musel sám znovu propočítávat totéž.
  changeProgress: (id: string, amount: number) => boolean
  addGoal: (vstup: NovyCilVstup) => void
  updateGoal: (id: string, vstup: NovyCilVstup) => void
  deleteGoal: (id: string) => void
  pridatZeSablony: (sablonaId: string) => void
  oznacitNavykDnes: (id: string) => void
  nastavPoznamku: (goalId: string, poznamka: string) => void
  pridatMilnik: (goalId: string, text: string) => void
  prepnoutMilnik: (goalId: string, milnikId: string) => void
  smazatMilnik: (goalId: string, milnikId: string) => void
}

const useGoalTrackerStore = create<GoalTrackerState>()(
  persist(
    (set) => ({
      goals: [],
      lastReminderDate: null,
      lastHabitReminderDate: null,
      lastDigestWeekKey: null,

      // Kladné i záporné kroky — překlep v počtu stránek se musí dát vzít zpět
      changeProgress: (id, amount) => {
        let justCompleted = false

        set((state) => ({
          goals: state.goals.map((goal) => {
            if (goal.id !== id || goal.typ === 'navyk') return goal

            const nextVal = Math.max(0, Math.min(goal.target, goal.current + amount))
            // XP jen v okamžiku, kdy cíl poprvé dosáhne své cílové hodnoty
            if (nextVal >= goal.target && !goal.completedAt) justCompleted = true

            return {
              ...goal,
              current: nextVal,
              completedAt:
                goal.completedAt ?? (nextVal >= goal.target ? new Date().toISOString() : null),
              updatedAt: Date.now(),
            }
          }),
        }))

        // recordAction, ne holé addXp — počítadlo splněných cílů a XP se
        // tak nemůžou rozejít, stejně jako u ostatních miniapek.
        if (justCompleted) useGamificationStore.getState().recordAction('goal', XP_PER_COMPLETED_GOAL)

        return justCompleted
      },

      addGoal: (vstup) => {
        if (!vstup.title.trim() || vstup.target <= 0) return

        const ted = Date.now()
        const newGoal: Goal = {
          id: `${ted}-${Math.random().toString(36).slice(2, 7)}`,
          title: vstup.title.trim(),
          current: 0,
          target: vstup.target,
          unit: vstup.typ === 'navyk' ? '' : vstup.unit.trim() || 'kroků',
          category: vstup.category,
          completedAt: null,
          typ: vstup.typ,
          priority: vstup.priority,
          deadline: vstup.deadline,
          poznamka: vstup.poznamka.trim(),
          milniky: [],
          navykDny: [],
          createdAt: new Date(ted).toISOString(),
          updatedAt: ted,
          deletedAt: null,
        }

        set((state) => ({ goals: [...state.goals, newGoal] }))

        // Nastavení termínu, nebo založení návyku (ten bude časem
        // připomínán checkHabitReminders níž), je nejpřirozenější chvíle
        // zeptat se na svolení k notifikacím — stejné gesto jako Study
        // Plannerovo addTask.
        if (vstup.deadline || vstup.typ === 'navyk') requestNotificationPermission()
      },

      updateGoal: (id, vstup) => {
        if (!vstup.title.trim() || vstup.target <= 0) return

        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === id
              ? {
                  ...goal,
                  title: vstup.title.trim(),
                  target: vstup.target,
                  unit: vstup.typ === 'navyk' ? '' : vstup.unit.trim() || 'kroků',
                  category: vstup.category,
                  typ: vstup.typ,
                  priority: vstup.priority,
                  deadline: vstup.deadline,
                  poznamka: vstup.poznamka.trim(),
                  // Když se cíl zvedne, pokrok nesmí zůstat nad ním
                  current: vstup.typ === 'navyk' ? goal.current : Math.min(goal.current, vstup.target),
                  updatedAt: Date.now(),
                }
              : goal
          ),
        }))

        if (vstup.deadline || vstup.typ === 'navyk') requestNotificationPermission()
      },

      // Měkké smazání — appka cíl nikdy fyzicky neodstraní z pole, jen
      // ho označí deletedAt (viz Goal.deletedAt v types.ts). Veřejný
      // useGoalTracker() ho sám vyfiltruje, ať appka i tak vypadá, jako
      // by cíl zmizel — jen se smazání dá zrcadlit na druhé zařízení.
      deleteGoal: (id) =>
        set((state) => {
          const ted = Date.now()
          return { goals: state.goals.map((g) => (g.id === id ? { ...g, deletedAt: ted, updatedAt: ted } : g)) }
        }),

      pridatZeSablony: (sablonaId) => {
        const sablona = SABLONY_CILU.find((s) => s.id === sablonaId)
        if (!sablona) return

        const ted = Date.now()
        const newGoal: Goal = {
          id: `${ted}-${Math.random().toString(36).slice(2, 7)}`,
          title: sablona.nazev,
          current: 0,
          target: sablona.target,
          unit: sablona.unit,
          category: sablona.category,
          completedAt: null,
          typ: sablona.typ,
          priority: 'stredni',
          deadline: null,
          poznamka: '',
          milniky: [],
          navykDny: [],
          createdAt: new Date(ted).toISOString(),
          updatedAt: ted,
          deletedAt: null,
        }

        set((state) => ({ goals: [...state.goals, newGoal] }))

        // Skutečný bug: addGoal/updateGoal se svolení k notifikacím ptají
        // vždycky, když vzniká/upravuje se návyk — pridatZeSablony (např.
        // šablony "Cvičit 5× týdně"/"Meditovat každý den") ale tenhle krok
        // přeskakovala úplně, takže návyk založený ze šablony nikdy
        // nedostal svolení a checkHabitReminders pro něj tak nemohl nikdy
        // nic poslat, tiše a bez varování.
        if (sablona.typ === 'navyk') requestNotificationPermission()
      },

      oznacitNavykDnes: (id) => {
        let vyplatitXp = false

        set((state) => ({
          goals: state.goals.map((goal) => {
            if (goal.id !== id || goal.typ !== 'navyk') return goal
            const dny = goal.navykDny ?? []
            const uzOznaceno = jeNavykOznacenDnes(goal)
            const dnesniIso = dnesniDatum()
            // XP se vyplácí nejvýš jednou za kalendářní den na návyk —
            // ne podle toho, jestli je dnešek zrovna odškrtnutý (to by
            // šlo cyklem zaškrtnout/odškrtnout/zaškrtnout vydělávat
            // donekonečna). navykXpDny se proto při odškrtnutí NIKDY
            // nemaže, jen navykDny (viditelný, přepínatelný stav).
            vyplatitXp = !uzOznaceno && !bylaVyplacenaXpZaNavyk(goal, dnesniIso)
            return {
              ...goal,
              // Druhé klepnutí ve stejný den odškrtnutí zase zruší —
              // "splněno dnes" je přepínač, ne jen jednosměrné tlačítko.
              navykDny: uzOznaceno ? dny.filter((d) => d !== dnesniIso) : [...dny, dnesniIso],
              navykXpDny: vyplatitXp ? [...(goal.navykXpDny ?? []), dnesniIso] : goal.navykXpDny,
              updatedAt: Date.now(),
            }
          }),
        }))

        if (vyplatitXp) useGamificationStore.getState().recordAction('navyk', XP_PER_HABIT_CHECKIN)
      },

      // Vlastní, jednodušší akce místo volání updateGoal jen kvůli
      // poznámce — stejná "loose merge-by-id" zásada jako
      // updateKapitola/setPoznamkaPostavy jinde v appce: uloží se přesně
      // to jedno pole, beze zbytku validace celého formuláře cíle.
      nastavPoznamku: (goalId, poznamka) =>
        set((state) => ({
          goals: state.goals.map((g) => (g.id === goalId ? { ...g, poznamka, updatedAt: Date.now() } : g)),
        })),

      pridatMilnik: (goalId, text) => {
        if (!text.trim()) return
        const milnik: Milnik = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: text.trim(), done: false }
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId ? { ...g, milniky: [...(g.milniky ?? []), milnik], updatedAt: Date.now() } : g
          ),
        }))
      },

      prepnoutMilnik: (goalId, milnikId) =>
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  milniky: (g.milniky ?? []).map((m) => (m.id === milnikId ? { ...m, done: !m.done } : m)),
                  updatedAt: Date.now(),
                }
              : g
          ),
        })),

      smazatMilnik: (goalId, milnikId) =>
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId
              ? { ...g, milniky: (g.milniky ?? []).filter((m) => m.id !== milnikId), updatedAt: Date.now() }
              : g
          ),
        })),
    }),
    {
      name: 'schoolbuddy-goal-tracker-storage',

      // Ukázkové cíle leží v úložišti i uživatelům, kteří appku otevřeli dřív.
      // Poznáme je podle původního id i názvu zároveň, ať omylem nesmažeme
      // vlastní cíl, který se náhodou jmenuje stejně.
      merge: (persisted, current) => {
        const saved = persisted as Partial<GoalTrackerState> | undefined
        const goals = (saved?.goals ?? [])
          .filter((goal) => !(DEMO_GOAL_IDS.includes(goal.id) && DEMO_GOAL_TITLES.includes(goal.title)))
          // sanitizujCil doplňuje/opravuje completedAt i všechna nová pole
          // najednou — viz jeho vlastní komentář v types.ts pro to, jaký
          // reálný XP bug tahle jedna funkce zavírá.
          .map(sanitizujCil)
        return {
          ...current,
          ...saved,
          goals,
          lastReminderDate: saved?.lastReminderDate ?? null,
          lastHabitReminderDate: saved?.lastHabitReminderDate ?? null,
          lastDigestWeekKey: saved?.lastDigestWeekKey ?? null,
        }
      },
      storage: createJSONStorage(() => secureStorage),
    }
  )
)

// ==========================================
// Upozornění na termíny — stejný vzor jako Study Plannerovo
// setupStudyPlannerReminders (core/utils/registerSW.ts's "modulový"
// idiom). Volá se jednou z App.tsx, ne z komponenty GoalTracker.tsx,
// aby kontrola termínů fungovala i pro uživatele, co appku zrovna
// nemá otevřenou.
// ==========================================

let remindersStarted = false

const checkGoalReminders = () => {
  const state = useGoalTrackerStore.getState()
  const today = dnesniDatum()
  if (state.lastReminderDate === today) return

  const aktivni = state.goals.filter(
    (g) => !g.deletedAt && (g.typ ?? 'cil') === 'cil' && g.current < g.target && g.deadline
  )
  const overdue = aktivni.filter((g) => g.deadline! < today).length
  const dueToday = aktivni.filter((g) => g.deadline === today).length
  if (overdue === 0 && dueToday === 0) return

  useGoalTrackerStore.setState({ lastReminderDate: today })

  const parts: string[] = []
  if (overdue > 0) parts.push(`${overdue}× po termínu`)
  if (dueToday > 0) parts.push(`${dueToday}× dnes`)

  void showAppNotification('🎯 Termíny v Growth Roomu', parts.join(' · '), 'goal-tracker')
}

// Připomínka nesplněných návyků se schválně posílá až večer, ne hned
// při ranním otevření appky — v poledne by ještě mohla přijít pro
// návyk, co si uživatel plánuje odškrtnout až po večerním tréninku,
// stejné zdůvodnění jako fitnessReminders.ts's vlastní hodinová hranice.
const NAVYK_PRIPOMINKA_OD_HODINY = 18

const checkHabitReminders = () => {
  const state = useGoalTrackerStore.getState()
  const dnes = new Date()
  const today = dnesniDatum(dnes)
  if (state.lastHabitReminderDate === today) return
  if (dnes.getHours() < NAVYK_PRIPOMINKA_OD_HODINY) return

  const nedokoncene = state.goals.filter((g) => !g.deletedAt && g.typ === 'navyk' && !jeNavykOznacenDnes(g, dnes))
  if (nedokoncene.length === 0) return

  useGoalTrackerStore.setState({ lastHabitReminderDate: today })

  const zprava =
    nedokoncene.length === 1
      ? `Ještě jsi dnes neodškrtl(a) „${nedokoncene[0].title}“.`
      : `Máš ${nedokoncene.length} nesplněných návyků na dnešek.`

  void showAppNotification('🔁 Návyky čekají', zprava, 'goal-tracker-navyky')
}

// Stejný ISO týdenní algoritmus jako Fitness Roomovo tydenniKlic
// (fitnessStats.ts), zkopírovaný sem místo importu napříč vlajkovými
// appkami — stejná přijatá malá duplikace jako BARVY_UZLU jinde v appce.
const tydenniKlicGoalTracker = (datum: Date): string => {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()))
  const denVTydnu = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - denVTydnu)
  const rokZacatku = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const cisloTydne = Math.ceil(((d.getTime() - rokZacatku.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(cisloTydne).padStart(2, '0')}`
}

const checkWeeklyDigest = () => {
  const state = useGoalTrackerStore.getState()
  const dnes = new Date()
  const tydenKlic = tydenniKlicGoalTracker(dnes)
  if (state.lastDigestWeekKey === tydenKlic) return

  // Poprvé spuštěno — appka si jen zapamatuje aktuální týden jako
  // výchozí bod, ať se hned při první instalaci neposílá prázdný
  // souhrn se samými nulami.
  if (state.lastDigestWeekKey === null) {
    useGoalTrackerStore.setState({ lastDigestWeekKey: tydenKlic })
    return
  }

  useGoalTrackerStore.setState({ lastDigestWeekKey: tydenKlic })

  const { dokoncenoCilu, navykovychOdskrtnuti } = spocitejTydenniSouhrn(
    state.goals.filter((g) => !g.deletedAt),
    dnes
  )
  if (dokoncenoCilu === 0 && navykovychOdskrtnuti === 0) return

  const { streakDays } = useGamificationStore.getState()
  const casti: string[] = []
  if (dokoncenoCilu > 0) casti.push(`${dokoncenoCilu}× splněný cíl`)
  if (navykovychOdskrtnuti > 0) casti.push(`${navykovychOdskrtnuti}× odškrtnutý návyk`)
  casti.push(`${streakDays} ${plural(streakDays, 'den v řadě', 'dny v řadě', 'dní v řadě')}`)

  void showAppNotification('📊 Týdenní souhrn Growth Roomu', casti.join(' · '), 'growth-room-tydenni')
}

/** Zapne kontrolu termínů, nesplněných návyků a týdenního souhrnu.
 *  Volá se jednou ze startu aplikace (App.tsx). */
export const setupGoalTrackerReminders = (): void => {
  if (remindersStarted) return
  remindersStarted = true

  checkGoalReminders()
  checkHabitReminders()
  checkWeeklyDigest()

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkGoalReminders()
      checkHabitReminders()
      checkWeeklyDigest()
    }
  })
  window.addEventListener('focus', () => {
    checkGoalReminders()
    checkHabitReminders()
    checkWeeklyDigest()
  })
  window.addEventListener('online', () => {
    checkGoalReminders()
    checkHabitReminders()
    checkWeeklyDigest()
  })
}

// Syrový přístup ke storu pro cloudovou synchronizaci
// (goalTrackerSync.ts) — vidí i smazané (deletedAt) cíle, protože ty
// musí synchronizace umět poslat jako tombstone řádek. Stejná trojice
// jako u Writer's Roomových getRaw*State funkcí.
export const getRawGoalTrackerState = () => useGoalTrackerStore.getState()
export const setRawGoalTrackerState = (patch: Partial<{ goals: Goal[] }>) => useGoalTrackerStore.setState(patch)
export const subscribeGoalTrackerStore = (fn: () => void) => useGoalTrackerStore.subscribe(fn)

export const useGoalTracker = () => {
  const {
    goals: vsechnyGoals,
    changeProgress,
    addGoal,
    updateGoal,
    deleteGoal,
    pridatZeSablony,
    oznacitNavykDnes,
    nastavPoznamku,
    pridatMilnik,
    prepnoutMilnik,
    smazatMilnik,
  } = useGoalTrackerStore()
  const [filter, setFilter] = useState<string>(ALL_GOALS)

  // Smazané cíle appka drží v úložišti dál (viz Goal.deletedAt) jen
  // kvůli synchronizaci mezi zařízeními — kdokoli appku volá jako dřív
  // je nikdy nesmí vidět, stejná zásada jako Writer's Roomovy
  // useBookWriter()/useScreenplayWriter()/useComicWriter().
  const goals = useMemo(() => vsechnyGoals.filter((g) => !g.deletedAt), [vsechnyGoals])

  const filteredGoals = useMemo(() => {
    const filtered = goals.filter((goal) => filter === ALL_GOALS || goal.category === filter)
    return [...filtered].sort(compareGoals)
  }, [goals, filter])

  // Archiv splněných cílů — oddělené od aktivního seznamu, ne jen
  // seřazené na konec, ať appka nabídne skutečně sbalitelnou sekci
  // místo hlavního seznamu, co se navždy plní hotovými cíli.
  const activeGoals = useMemo(() => filteredGoals.filter((g) => !jeHotovyCil(g)), [filteredGoals])
  const archivedGoals = useMemo(() => filteredGoals.filter(jeHotovyCil), [filteredGoals])

  const doneCount = goals.filter(jeHotovyCil).length

  return {
    goals: filteredGoals,
    // Nefiltrovaný seznam napříč VŠEMI kategoriemi — export do CSV má
    // exportovat úplně všechno, ne jen to, na co je zrovna nastavený
    // filtr kategorií na obrazovce (stejná zásada jako Form Checkovo
    // CSV, co exportuje celou historii bez ohledu na aktuální náhled).
    allGoals: goals,
    activeGoals,
    archivedGoals,
    totalCount: goals.length,
    doneCount,
    filter,
    setFilter,
    changeProgress,
    addGoal,
    updateGoal,
    deleteGoal,
    pridatZeSablony,
    oznacitNavykDnes,
    nastavPoznamku,
    pridatMilnik,
    prepnoutMilnik,
    smazatMilnik,
  }
}
