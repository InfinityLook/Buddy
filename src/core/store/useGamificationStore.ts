import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { UserStats, Badge } from '../types/gamification.types'
import { getLevelFromXp, checkStreak } from '../utils/gamificationUtils'
import { validateGamificationData } from '../utils/gamificationValidation'

// Druhy činností, za které se počítají odznaky vázané na počet.
// Miniaplikace hlásí činnost přes recordAction, ne přes holé addXp,
// aby se počítadlo a XP nikdy nerozešly.
export type ActivityKind =
  | 'flashcard'
  | 'note'
  | 'mindNode'
  | 'document'
  | 'file'
  | 'calculation'
  | 'transaction'
  | 'workout'
  | 'battle'
  | 'boss'
  | 'task'
  | 'goal'
  | 'pomodoro'
  | 'souboj'
  | 'kalendar'
  | 'music'
  | 'book'
  | 'screenplay'
  | 'comic'

interface GamificationState extends UserStats {
  // Kolikrát uživatel danou činnost udělal (klíč = ActivityKind)
  counters: Record<string, number>

  addXp: (amount: number) => void
  recordActivity: () => void
  unlockBadge: (badgeId: string) => void
  recordAction: (kind: ActivityKind, xpAmount: number) => void
  // Převezme stav sloučený s cloudem. Volá se jen z cloudové
  // synchronizace, která už rozhodla, co je novější — viz core/supabase.
  applyCloudSnapshot: (snapshot: {
    xp: number
    level: number
    streakDays: number
    lastActiveDate: string | null
    badges: Record<string, string>
    counters: Record<string, number>
  }) => void
}

// Exportováno i pro čtení mimo tenhle store — Admin panel jím v analytice
// (AnalytikaPanel.tsx) mapuje badge_id z databáze na čitelný název a ikonu.
export const DEFAULT_BADGES: Badge[] = [
  { id: 'first_step', title: 'První krok', description: 'Splň svůj první studijní úkol nebo otázku.', icon: '🌱', unlockedAt: null },
  { id: 'streak_3', title: 'Vybroušená rutina', description: 'Udržuj studijní streak 3 dny v řadě.', icon: '🔥', unlockedAt: null },
  { id: 'exam_master', title: 'Maturitní Mašina', description: 'Projdi a ohodnoť 20 maturitních otázek.', icon: '🎓', unlockedAt: null },
  { id: 'night_owl', title: 'Noční sova', description: 'Uč se po 22:00 hodině.', icon: '🦉', unlockedAt: null },
  { id: 'card_creator', title: 'Tvůrce kartiček', description: 'Vytvoř 10 vlastních kartiček ve Flashcards.', icon: '🃏', unlockedAt: null },
  { id: 'note_taker', title: 'Zapisovatel', description: 'Ulož 10 poznámek v Quick Notes.', icon: '📝', unlockedAt: null },
  { id: 'mind_mapper', title: 'Kartograf myšlenek', description: 'Přidej 10 uzlů do myšlenkové mapy.', icon: '🗺️', unlockedAt: null },
  { id: 'writer', title: 'Spisovatel', description: 'Ulož 5 dokumentů v textovém editoru.', icon: '✍️', unlockedAt: null },
  { id: 'streak_7', title: 'Týden v kuse', description: 'Udržuj studijní streak 7 dní v řadě.', icon: '📅', unlockedAt: null },
  { id: 'budget_master', title: 'Rozpočtář', description: 'Zaznamenej 15 příjmů nebo výdajů ve Financích.', icon: '💰', unlockedAt: null },
  { id: 'fitness_starter', title: 'Rozcvička', description: 'Dokonči 5 tréninkových sezení ve Form Checku.', icon: '🏋️', unlockedAt: null },
  { id: 'level_5', title: 'Zkušený', description: 'Dostaň se na úroveň 5.', icon: '⭐', unlockedAt: null },
  { id: 'xp_1000', title: 'Tisícovka', description: 'Nasbírej celkem 1000 XP.', icon: '💎', unlockedAt: null },
  { id: 'arena_champion', title: 'Šampion arény', description: 'Vyhraj 5 soubojů v Aréně.', icon: '⚔️', unlockedAt: null },
  { id: 'boss_slayer', title: 'Přemožitel strážce', description: 'Poraz svého prvního bosse.', icon: '👑', unlockedAt: null },
  { id: 'task_planner', title: 'Plánovač', description: 'Splň 10 úkolů ve Studijním plánovači.', icon: '📋', unlockedAt: null },
  { id: 'goal_getter', title: 'Cílevědomý', description: 'Splň 5 cílů v Goal Trackeru.', icon: '🎯', unlockedAt: null },
  { id: 'focus_master', title: 'Mistr soustředění', description: 'Dokonči 10 soustředění v Pomodoru.', icon: '⏳', unlockedAt: null },
  { id: 'ring_mistr', title: 'Mistr ringu', description: 'Vyhraj 5 zápasů v Souboji.', icon: '🥊', unlockedAt: null },
  { id: 'planovac_udalosti', title: 'Plánovač událostí', description: 'Přidej 10 událostí do Kalendáře.', icon: '🗓️', unlockedAt: null },
  { id: 'sound_mage', title: 'Zvukový mág', description: 'Vytvoř 10 beatů, nahrávek nebo skladeb v Music Roomu.', icon: '🎵', unlockedAt: null },
  // Writer's Room — na rozdíl od Music Roomu tři samostatné odznaky,
  // ne jeden sdílený: appky jsou tři oddělené, ne tři záložky jedné
  // appky, takže i odznak sleduje každou zvlášť. 'writer'/'Spisovatel'
  // už existovalo pro Textový editor (viz COUNT_BADGES's document níž),
  // takže tyhle tři musely dostat vlastní jména, ne tenhle už obsazený.
  { id: 'romanopisec', title: 'Romanopisec', description: 'Napiš 10 kapitol v Knize.', icon: '📖', unlockedAt: null },
  { id: 'scenarista', title: 'Scenárista', description: 'Napiš 10 scén ve Scénáři.', icon: '🎬', unlockedAt: null },
  { id: 'komiksovy_kreslir', title: 'Komiksový tvůrce', description: 'Vytvoř 10 panelů v Komiksu.', icon: '💥', unlockedAt: null },
]

// Odznaky, které se odemykají počtem opakování dané činnosti. 'souboj'
// dostal vlastní kind, ne sdílení s Buddyheimovým 'battle' — jsou to
// dvě různé hry (RPG karetní souboj vs. Souboj samotný), stejná
// "dvě různé věci se dvěma různými účely, ne jeden sdílený počítadlo"
// zásada jako u Pomodora's completedSessions vs. counters.pomodoro.
const COUNT_BADGES: Partial<Record<ActivityKind, { badgeId: string; needed: number }>> = {
  flashcard: { badgeId: 'card_creator', needed: 10 },
  note: { badgeId: 'note_taker', needed: 10 },
  mindNode: { badgeId: 'mind_mapper', needed: 10 },
  document: { badgeId: 'writer', needed: 5 },
  transaction: { badgeId: 'budget_master', needed: 15 },
  workout: { badgeId: 'fitness_starter', needed: 5 },
  battle: { badgeId: 'arena_champion', needed: 5 },
  boss: { badgeId: 'boss_slayer', needed: 1 },
  task: { badgeId: 'task_planner', needed: 10 },
  goal: { badgeId: 'goal_getter', needed: 5 },
  pomodoro: { badgeId: 'focus_master', needed: 10 },
  souboj: { badgeId: 'ring_mistr', needed: 5 },
  kalendar: { badgeId: 'planovac_udalosti', needed: 10 },
  // Jeden počítadlo pro všechny tři tvůrčí akce Music Roomu (uložený
  // beat, hotová nahrávka, sestavená skladba) — sčítá se, kolikrát
  // uživatel v appce vůbec něco vytvořil, ne tři samostatné odznaky
  // za tři různé, menší prahy.
  music: { badgeId: 'sound_mage', needed: 10 },
  // Writer's Room — tři oddělené appky (Kniha/Scénář/Komiks), tři
  // oddělené počítadla, na rozdíl od Music Roomova jednoho sdíleného.
  book: { badgeId: 'romanopisec', needed: 10 },
  screenplay: { badgeId: 'scenarista', needed: 10 },
  comic: { badgeId: 'komiksovy_kreslir', needed: 10 },
}

// Označí odznak za odemčený, pokud ještě odemčený není
const unlock = (badges: Badge[], badgeId: string): Badge[] =>
  badges.map((b) => (b.id === badgeId && !b.unlockedAt ? { ...b, unlockedAt: new Date().toISOString() } : b))

// Doplní odznaky, které v uloženém stavu ještě nebyly (po přidání nových
// do DEFAULT_BADGES), a zachová u těch stávajících datum odemčení.
const mergeBadges = (saved: Badge[] | undefined): Badge[] => {
  if (!saved || saved.length === 0) return DEFAULT_BADGES
  return DEFAULT_BADGES.map((def) => {
    const existing = saved.find((b) => b.id === def.id)
    // Text a ikona se berou z definice, ať se opravy popisků propíšou;
    // z uloženého stavu si necháme jen to, co patří uživateli.
    return existing ? { ...def, unlockedAt: existing.unlockedAt ?? null } : def
  })
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      xp: 0,
      level: 1,
      streakDays: 0,
      lastActiveDate: null,
      badges: DEFAULT_BADGES,
      counters: {},

      // Přidá XP a automaticky přepočítá Level
      addXp: (amount: number) => {
        get().recordActivity() // Automaticky aktualizuje streak při získání XP

        set((state) => {
          const newXp = state.xp + amount
          const newLevel = getLevelFromXp(newXp)

          let updatedBadges = state.badges
          if (newXp > 0) updatedBadges = unlock(updatedBadges, 'first_step')
          if (newLevel >= 5) updatedBadges = unlock(updatedBadges, 'level_5')
          if (newXp >= 1000) updatedBadges = unlock(updatedBadges, 'xp_1000')

          return {
            xp: newXp,
            level: newLevel,
            badges: updatedBadges,
          }
        })
      },

      // Zaznamená aktivitu a přepočítá Streak
      recordActivity: () => {
        const { lastActiveDate, streakDays, badges } = get()
        const { newStreak, todayFormatted } = checkStreak(lastActiveDate, streakDays)

        let updatedBadges = badges
        if (newStreak >= 3) updatedBadges = unlock(updatedBadges, 'streak_3')
        if (newStreak >= 7) updatedBadges = unlock(updatedBadges, 'streak_7')

        // Odznak "Noční sova" — jakákoli studijní aktivita zaznamenaná po 22:00
        if (new Date().getHours() >= 22) updatedBadges = unlock(updatedBadges, 'night_owl')

        set({
          streakDays: newStreak,
          lastActiveDate: todayFormatted,
          badges: updatedBadges,
        })
      },

      // Odemkne konkrétní odznak
      unlockBadge: (badgeId: string) => {
        set((state) => ({ badges: unlock(state.badges, badgeId) }))
      },

      // Zaznamená jednu činnost v miniaplikaci: připočte XP, zvýší počítadlo
      // a zkontroluje odznak navázaný na počet opakování.
      recordAction: (kind, xpAmount) => {
        set((state) => ({
          counters: { ...state.counters, [kind]: (state.counters[kind] ?? 0) + 1 },
        }))

        get().addXp(xpAmount)

        const rule = COUNT_BADGES[kind]
        if (rule && (get().counters[kind] ?? 0) >= rule.needed) {
          get().unlockBadge(rule.badgeId)
        }
      },

      applyCloudSnapshot: (snapshot) =>
        set((state) => ({
          xp: snapshot.xp,
          level: snapshot.level,
          streakDays: snapshot.streakDays,
          lastActiveDate: snapshot.lastActiveDate,
          counters: snapshot.counters,
          // Popisky a ikony zůstávají z definic v kódu, z cloudu se bere
          // jen datum odemčení — stejný princip jako v mergeBadges.
          badges: state.badges.map((badge) =>
            snapshot.badges[badge.id]
              ? { ...badge, unlockedAt: snapshot.badges[badge.id] }
              : badge
          ),
        })),
    }),
    {
      name: 'schoolbuddy-gamification-storage',
      version: 2,
      storage: createJSONStorage(() => secureStorage),

      // Běží při každém načtení — doplní nově přidané odznaky i chybějící
      // počítadla, aby stávající uživatelé o novinky nepřišli.
      merge: (persisted, current) => {
        const saved = persisted as Partial<GamificationState> | undefined
        return {
          ...current,
          ...saved,
          badges: mergeBadges(saved?.badges),
          counters: saved?.counters ?? {},
        }
      },

      // Validace dat načítaných ze secureStorage — stejný vzorec jako u useAppStore
      migrate: (persistedState: any, _version: number) => {
        const validation = validateGamificationData(persistedState)
        if (!validation.success) {
          console.error('Gamifikační data v LocalStorage byla poškozena. Obnovuji výchozí stav.')
          return {
            xp: 0,
            level: 1,
            streakDays: 0,
            lastActiveDate: null,
            badges: DEFAULT_BADGES,
            counters: {},
          } as GamificationState
        }
        return persistedState as GamificationState
      },
    }
  )
)
