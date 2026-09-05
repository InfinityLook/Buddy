import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateAppsData } from '@/core/utils/validation'

export type AppColor = 'purple' | 'cyan' | 'orange' | 'green' | 'pink'

// Jak se dlaždice řadí v přehledu. Volba je perzistentní, ať si ji
// uživatel nemusí nastavovat po každém spuštění aplikace.
export type SortMode = 'favorites' | 'name' | 'category' | 'recent'
export type ViewMode = 'grid' | 'list'

export const SORT_LABELS: Record<SortMode, string> = {
  favorites: 'Oblíbené první',
  name: 'Podle názvu (A–Z)',
  category: 'Podle kategorie',
  recent: 'Naposledy použité',
}

export interface AppItem {
  id: string
  title: string
  category: string
  icon: string
  color: AppColor
  // false = uživatel si dlaždici schoval z přehledu. Miniaplikace tím
  // nemizí ani nepřichází o data, jen se nezobrazuje, dokud si skryté
  // nevyvolá zpátky.
  active: boolean
  favorite: boolean
  // Čas posledního otevření. Podklad pro řazení "naposledy použité"
  // a pro nabídku "pokračuj tam, kde jsi skončil" v banneru.
  lastOpenedAt?: number | null
  // Vlajková appka (School Room a další, viz src/flagships/) — klepnutí
  // na dlaždici v AppModule.tsx pak nejde přes MINI_APP_REGISTRY/
  // setActiveAppId jako u obyčejné miniaplikace, ale přímo navigate() na
  // tuhle cestu, protože vlajková appka je vlastní stránka s vlastní
  // hlavičkou a spodní lištou, ne obsah do obecného fullscreen wrapperu.
  // Nepovinné a nikdy se neukládá/nečte z existing při mergeApps níž —
  // patří appce, ne uživatelovu uloženému stavu, stejně jako
  // title/category/icon/color.
  route?: string
}

interface AppState {
  apps: AppItem[]
  activeAppId: string | null
  // Cesta, na kterou se má vrátit tlačítko "Zpět" v otevřené miniaplikaci —
  // nastavuje se jen u deep-linků (Hub, Profil), aby uživatel skončil tam,
  // odkud přišel, a ne vždy jen v seznamu aplikací.
  returnPath: string | null
  sortMode: SortMode
  viewMode: ViewMode

  setActiveAppId: (id: string | null, returnPath?: string | null) => void
  toggleFavorite: (id: string) => void
  toggleAppVisible: (id: string) => void
  setSortMode: (mode: SortMode) => void
  setViewMode: (mode: ViewMode) => void
}

const DEFAULT_APPS: AppItem[] = [
  // Přesunuté do School Roomu (viz CLAUDE.md, src/flagships/school-room/)
  // — active: false je schválně jediná změna, appka samotná (kód,
  // registrace v MINI_APP_REGISTRY, uložená data) zůstává úplně beze
  // změny. "Skryté" tu neznamená smazané: setActiveAppId pořád najde
  // dlaždici přes apps.find() bez ohledu na active (jen výchozí mřížka
  // v /apps je filtruje ven), takže School Roomovy dlaždice, co na ně
  // deep-linkují (setActiveAppId(id, '/skola')), fungují úplně stejně,
  // jako když je otvírala rovnou hlavní mřížka. Kdo si je i tak
  // z /apps vyvolá zpátky přes "Zobrazit skryté", nic mu v tom nebrání.
  { id: 'study-planner', title: 'Planer', category: 'Produktivita', icon: 'study-planner', color: 'purple', active: false, favorite: false },
  { id: 'flashcards', title: 'Flashcards', category: 'Vzdělávání', icon: 'flashcards', color: 'cyan', active: true, favorite: true },
  { id: 'pomodoro', title: 'Pomodoro', category: 'Produktivita', icon: 'pomodoro', color: 'orange', active: false, favorite: false },
  { id: 'math-solver', title: 'Math Solver', category: 'Nástroje', icon: 'math-solver', color: 'green', active: true, favorite: false },
  { id: 'quick-notes', title: 'Quick Notes', category: 'Produktivita', icon: 'quick-notes', color: 'pink', active: false, favorite: true },
  { id: 'goal-tracker', title: 'Goal Tracker', category: 'Produktivita', icon: 'goal-tracker', color: 'purple', active: true, favorite: false },
  { id: 'mind-map', title: 'Mind Map', category: 'Vzdělávání', icon: 'mind-map', color: 'cyan', active: true, favorite: false },
  { id: 'file-manager', title: 'File Manager', category: 'Nástroje', icon: 'file-manager', color: 'orange', active: false, favorite: false },
  { id: 'exam-prep', title: 'Maturitní centrum', category: 'Vzdělávání', icon: 'exam-prep', color: 'pink', active: true, favorite: true },
  { id: 'document-editor', title: 'Textový editor', category: 'Produktivita', icon: 'document-editor', color: 'green', active: true, favorite: false },
  { id: 'finance', title: 'Finance', category: 'Nástroje', icon: 'finance', color: 'green', active: true, favorite: false },
  { id: 'form-check', title: 'Form Check', category: 'Nástroje', icon: 'form-check', color: 'orange', active: true, favorite: false },
  // Nová, School Roomu vlastní (appka do teď neměla vůbec) — stejné
  // "active: false, jen deep-linkem ze School Roomu" zacházení jako
  // s přesunutými čtyřmi výš.
  { id: 'kalendar', title: 'Kalendář', category: 'Produktivita', icon: 'calendar', color: 'cyan', active: false, favorite: false },
  // Vlajková appka — viz AppItem.route výš a FlagshipShell.tsx. Zůstává
  // active: true, protože tohle JE ta dlaždice, přes kterou se do
  // School Roomu chodí; schovat by ji šlo úplně stejně jako kteroukoli
  // jinou (toggleAppVisible), appka jí v tom nijak nebrání.
  { id: 'school-room', title: 'School Room', category: 'Vzdělávání', icon: 'layers', color: 'cyan', active: true, favorite: false, route: '/skola' },
]

// Katalog dlaždic patří kódu, uživateli jen jeho příznaky (oblíbené,
// skryté, čas otevření). Dřív se uložený seznam bral celý, takže nově
// přidaná miniaplikace se nikdy neukázala nikomu, kdo appku už jednou
// spustil — a oprava překlepu v názvu se taky nikam nepropsala.
const mergeApps = (saved: AppItem[] | undefined): AppItem[] => {
  if (!saved || saved.length === 0) return DEFAULT_APPS

  return DEFAULT_APPS.map((def) => {
    const existing = saved.find((app) => app.id === def.id)
    if (!existing) return def

    return {
      ...def,
      favorite: existing.favorite ?? def.favorite,
      active: existing.active ?? def.active,
      lastOpenedAt: existing.lastOpenedAt ?? null,
    }
  })
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apps: DEFAULT_APPS,
      activeAppId: null,
      returnPath: null,
      sortMode: 'favorites',
      viewMode: 'grid',

      // Zavření miniaplikace (id === null) vždy vynuluje i returnPath,
      // ať příští otevření z mřížky nezdědí cizí "zpět" cíl.
      setActiveAppId: (id, returnPath = null) =>
        set((state) => ({
          activeAppId: id,
          returnPath: id ? returnPath : null,
          // Otevření si poznamenáme, ať jde řadit podle posledního použití
          apps: id
            ? state.apps.map((app) =>
                app.id === id ? { ...app, lastOpenedAt: Date.now() } : app
              )
            : state.apps,
        })),

      toggleFavorite: (id) =>
        set((state) => ({
          apps: state.apps.map((app) =>
            app.id === id ? { ...app, favorite: !app.favorite } : app
          ),
        })),

      toggleAppVisible: (id) =>
        set((state) => ({
          apps: state.apps.map((app) =>
            app.id === id ? { ...app, active: !app.active } : app
          ),
        })),

      setSortMode: (mode) => set({ sortMode: mode }),
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'schoolbuddy-app-storage',
      version: 1,
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        apps: state.apps,
        sortMode: state.sortMode,
        viewMode: state.viewMode,
      }),

      // Sesouhlasí uložené dlaždice s aktuálním katalogem v kódu.
      merge: (persisted, current) => {
        const saved = persisted as Partial<AppState> | undefined
        return { ...current, ...saved, apps: mergeApps(saved?.apps) }
      },

      // Validace dat načítaných ze secureStorage
      migrate: (persistedState: any) => {
        if (persistedState && persistedState.apps) {
          const validation = validateAppsData(persistedState.apps)
          if (!validation.success) {
            console.error('Data v LocalStorage byla poškozena. Obnovuji výchozí stav.')
            return { apps: DEFAULT_APPS, activeAppId: null } as AppState
          }
        }
        return persistedState as AppState
      },
    }
  )
)
