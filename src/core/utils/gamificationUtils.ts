// Každý level vyžaduje o něco více XP (progresivní křivka)
export const getLevelFromXp = (xp: number): number => {
  return Math.floor(Math.sqrt(xp / 50)) + 1
}

// Spočítá XP potřebné pro další level
export const getXpForNextLevel = (currentLevel: number): number => {
  return Math.pow(currentLevel, 2) * 50
}

// Spočítá % pokroku k dalšímu levelu (pro Progress Bar)
export const getLevelProgress = (xp: number): number => {
  const currentLevel = getLevelFromXp(xp)
  const currentLevelXp = Math.pow(currentLevel - 1, 2) * 50
  const nextLevelXp = getXpForNextLevel(currentLevel)
  
  const xpInCurrentLevel = xp - currentLevelXp
  const xpNeededForNext = nextLevelXp - currentLevelXp
  
  return Math.min(Math.round((xpInCurrentLevel / xpNeededForNext) * 100), 100)
}

// Zkontroluje a aktualizuje denní streak
export const checkStreak = (lastActiveDate: string | null, currentStreak: number): { newStreak: number; todayFormatted: string } => {
  const today = new Date().toISOString().slice(0, 10)
  
  if (!lastActiveDate) {
    return { newStreak: 1, todayFormatted: today }
  }

  if (lastActiveDate === today) {
    return { newStreak: currentStreak, todayFormatted: today }
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayFormatted = yesterday.toISOString().slice(0, 10)

  if (lastActiveDate === yesterdayFormatted) {
    return { newStreak: currentStreak + 1, todayFormatted: today }
  }

  // Uživatel vynechal den -> reset na 1
  return { newStreak: 1, todayFormatted: today }
}
