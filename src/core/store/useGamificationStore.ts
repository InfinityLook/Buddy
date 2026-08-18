import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { UserStats, Badge } from '../types/gamification.types'
import { getLevelFromXp, checkStreak } from '../utils/gamificationUtils'
import { validateGamificationData } from '../utils/gamificationValidation'

interface GamificationState extends UserStats {
  addXp: (amount: number) => void
  recordActivity: () => void
  unlockBadge: (badgeId: string) => void
}

const DEFAULT_BADGES: Badge[] = [
  { id: 'first_step', title: 'První krok', description: 'Splň svůj první studijní úkol nebo otázku.', icon: '🌱', unlockedAt: null },
  { id: 'streak_3', title: 'Vybroušená rutina', description: 'Udržuj studijní streak 3 dny v řadě.', icon: '🔥', unlockedAt: null },
  { id: 'exam_master', title: 'Maturitní Mašina', description: 'Projdi a ohodnoť 20 maturitních otázek.', icon: '🎓', unlockedAt: null },
  { id: 'night_owl', title: 'Noční sova', description: 'Uč se po 22:00 hodině.', icon: '🦉', unlockedAt: null },
]

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      xp: 0,
      level: 1,
      streakDays: 0,
      lastActiveDate: null,
      badges: DEFAULT_BADGES,

      // Přidá XP a automaticky přepočítá Level
      addXp: (amount: number) => {
        get().recordActivity() // Automaticky aktualizuje streak při získání XP
        
        set((state) => {
          const newXp = state.xp + amount
          const newLevel = getLevelFromXp(newXp)
          
          // Kontrola odznaku "První krok"
          let updatedBadges = state.badges
          if (newXp > 0) {
            updatedBadges = updatedBadges.map((b) =>
              b.id === 'first_step' && !b.unlockedAt
                ? { ...b, unlockedAt: new Date().toISOString() }
                : b
            )
          }

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
        if (newStreak >= 3) {
          updatedBadges = updatedBadges.map((b) =>
            b.id === 'streak_3' && !b.unlockedAt
              ? { ...b, unlockedAt: new Date().toISOString() }
              : b
          )
        }

        // Odznak "Noční sova" — jakákoli studijní aktivita zaznamenaná po 22:00
        if (new Date().getHours() >= 22) {
          updatedBadges = updatedBadges.map((b) =>
            b.id === 'night_owl' && !b.unlockedAt
              ? { ...b, unlockedAt: new Date().toISOString() }
              : b
          )
        }

        set({
          streakDays: newStreak,
          lastActiveDate: todayFormatted,
          badges: updatedBadges,
        })
      },

      // Odemkne konkrétní odznak
      unlockBadge: (badgeId: string) => {
        set((state) => ({
          badges: state.badges.map((b) =>
            b.id === badgeId && !b.unlockedAt
              ? { ...b, unlockedAt: new Date().toISOString() }
              : b
          ),
        }))
      },
    }),
    {
      name: 'schoolbuddy-gamification-storage',
      version: 1,
      storage: createJSONStorage(() => secureStorage),

      // Validace dat načítaných ze secureStorage — stejný vzorec jako u useAppStore
      migrate: (persistedState: any, version: number) => {
        const validation = validateGamificationData(persistedState)
        if (!validation.success) {
          console.error('Gamifikační data v LocalStorage byla poškozena. Obnovuji výchozí stav.')
          return {
            xp: 0,
            level: 1,
            streakDays: 0,
            lastActiveDate: null,
            badges: DEFAULT_BADGES,
          } as GamificationState
        }
        return persistedState as GamificationState
      },
    }
  )
)
                                   
