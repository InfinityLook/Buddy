export interface Badge {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt: string | null // ISO date or null
}

// Krok 14g (Hub's "Týdenní souhrn") — jeden záznam appčiny krátké
// historie přírůstků XP. Appka ji NEsynchronizuje do cloudu (viz
// useGamificationStore.ts's vlastní komentář u xpLog) — proto žije
// mimo UserStats, co je přesně ten cloudový podsoubor polí.
export interface XpLogEntry {
  datum: string // YYYY-MM-DD, místní čas (mistniDatum)
  castka: number
}

export interface UserStats {
  xp: number
  level: number
  streakDays: number
  lastActiveDate: string | null // ISO date YYYY-MM-DD
  badges: Badge[]
  // Součet XP jen z fitness ActivityKindů (workout/behani/posilovna/
  // mobilita) — samostatný běžící součet vedle celkového xp výš, viz
  // useGamificationStore.ts's FITNESS_KINDY. Existuje jen kvůli
  // Fitness Roomovu žebříčku (Fáze 4) — appka bez toho nemá jak
  // spočítat "kolik XP je jen z fitness", protože Form Checkovo
  // 'workout' dává proměnlivou částku podle počtu opakování, ne
  // pevnou.
  fitnessXp: number
}
