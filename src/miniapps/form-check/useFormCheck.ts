import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { Narocnost, Sezeni, TypCviku } from './types'

// ==========================================
// Historie odcvičených sezení. Samotný běžící přenos z kamery je
// perzistovat zbytečné (a nechtěné) — ukládá se jen výsledek: kolik
// opakování a kdy, stejně jako Pomodoro ukládá dokončené bloky,
// ne rozeběhnutý časovač.
// ==========================================

// XP roste s počtem opakování, ale s víčkem — jinak by šlo body sbírat
// donekonečna tím, že se cvičící postaví před kameru a nechá si počítat
// falešná opakování hodinu v kuse.
const XP_ZA_OPAKOVANI = 1
const XP_STROP = 30

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const PLATNE_CVIKY: TypCviku[] = ['dřep', 'klik', 'výpad', 'prkno']
const PLATNE_NAROCNOSTI: Narocnost[] = ['lehka', 'stredni', 'tezka']

/** Malá vlastní kopie stejné "série po sobě jdoucích tréninkových dní"
 *  logiky jako Fitness Roomovo spocitejSeriiTreninku (fitnessStats.ts)
 *  — ne import odtamtud, appka nesmí dovolit miniapce importovat
 *  z vlajkové appky (jen naopak), takže tahle drobná duplikace je
 *  přijatá, stejná jako u BARVY_UZLU jinde v appce. Potřebná jen tady,
 *  pro odznak "Tréninkový bojovník" níž. */
const spocitejTreninkovouSerii = (sezeni: Sezeni[]): number => {
  const dny = new Set(sezeni.map((s) => new Date(s.createdAt).toDateString()))
  const kurzor = new Date()
  if (!dny.has(kurzor.toDateString())) kurzor.setDate(kurzor.getDate() - 1)
  let serie = 0
  while (dny.has(kurzor.toDateString())) {
    serie++
    kurzor.setDate(kurzor.getDate() - 1)
  }
  return serie
}

/** Poškozená položka historie se tiše vyřadí, ne celý seznam — stejné
 *  pravidlo jako u každého jiného perzistovaného pole v týhle appce.
 *  cvik/narocnost mimo platnou sadu spadnou na bezpečnou výchozí
 *  hodnotu, ne že by shodily celou položku — starší sezení (před
 *  přidáním kliku/poznámky) se tak pořád validně načtou. */
export const sanitizujSezeni = (raw: unknown): Sezeni[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (s): s is Sezeni =>
        !!s && typeof s.id === 'string' && typeof s.pocetOpakovani === 'number'
    )
    .map((s) => ({
      ...s,
      cvik: PLATNE_CVIKY.includes(s.cvik) ? s.cvik : 'dřep',
      poznamka: typeof s.poznamka === 'string' ? s.poznamka : '',
      narocnost: PLATNE_NAROCNOSTI.includes(s.narocnost as Narocnost) ? s.narocnost : null,
      okruhId: typeof s.okruhId === 'string' ? s.okruhId : undefined,
    }))
}

interface FormCheckState {
  sezeni: Sezeni[]
  // Preference pro hlasové hlášení opakování (FormCheck.tsx/hlaseni.ts)
  // — přijatý stav appky, ne jen lokální React state, ať se volba
  // pamatuje mezi sezeními stejně jako Pomodorovo soundEnabled.
  hlasoveHlaseni: boolean
  // Poslední den, kdy appka poslala připomenutí tréninku (viz
  // fitnessReminders.ts) — žije tady, ne v samostatném poli, aby
  // fitnessReminders.ts mohl číst i zapisovat přes .getState()/
  // .setState() bez toho, aby tenhle soubor musel importovat
  // core/utils/notify.ts (to by kontaminovalo testovatelnost
  // sanitizujSezeni níž, viz stejná past popsaná u Financí/Goal
  // Trackeru jinde v appce).
  lastReminderDate: string | null
  ulozitSezeni: (pocetOpakovani: number, trvaniSekund: number, cvik: TypCviku, okruhId?: string) => string
  nastavPoznamkuSezeni: (id: string, poznamka: string, narocnost: Narocnost | null) => void
  setHlasoveHlaseni: (zapnuto: boolean) => void
}

export const useFormCheckStore = create<FormCheckState>()(
  persist(
    (set) => ({
      sezeni: [],
      hlasoveHlaseni: true,
      lastReminderDate: null,

      ulozitSezeni: (pocetOpakovani, trvaniSekund, cvik, okruhId) => {
        if (pocetOpakovani <= 0) return ''

        const id = noveId()
        let noveSezeniSeznam: Sezeni[] = []
        set((state) => {
          noveSezeniSeznam = [
            ...state.sezeni,
            { id, cvik, pocetOpakovani, trvaniSekund, createdAt: new Date().toISOString(), okruhId },
          ]
          return { sezeni: noveSezeniSeznam }
        })

        // recordAction, ne bare addXp — počítadlo dokončených sezení
        // a XP se tak nemůžou rozejít, stejně jako u ostatních miniapek.
        useGamificationStore
          .getState()
          .recordAction('workout', Math.min(XP_STROP, pocetOpakovani * XP_ZA_OPAKOVANI))

        // Tři odznaky, co se nevejdou do COUNT_BADGES's jednoduchého
        // "počet stejných volání" tvaru (stejný důvod jako u Exam
        // Prepova exam_master jinde v appce) — ruční kontrola po
        // každém uloženém sezení, nad čerstvě aktualizovanou historií.
        const gamifikace = useGamificationStore.getState()
        const celkemOpakovaniCelkem = noveSezeniSeznam.reduce((s, z) => s + z.pocetOpakovani, 0)
        if (celkemOpakovaniCelkem >= 100) gamifikace.unlockBadge('stovkar')

        const pouziteCviky = new Set(noveSezeniSeznam.map((z) => z.cvik))
        if (pouziteCviky.size >= PLATNE_CVIKY.length) gamifikace.unlockBadge('vsestranny')

        if (spocitejTreninkovouSerii(noveSezeniSeznam) >= 7) {
          gamifikace.unlockBadge('treninkovy_bojovnik')
        }

        return id
      },

      // Poznámka a náročnost se přidávají až po skončení sezení (viz
      // FormCheck.tsx) — loose merge podle id, stejný tvar jako
      // updateKapitola/nastavPoznamku v ostatních miniapkách, ať editace
      // téhle jedné položky nemůže náhodou rozhodit zbytek historie.
      nastavPoznamkuSezeni: (id, poznamka, narocnost) => {
        set((state) => ({
          sezeni: state.sezeni.map((s) => (s.id === id ? { ...s, poznamka, narocnost } : s)),
        }))
      },

      setHlasoveHlaseni: (zapnuto) => set({ hlasoveHlaseni: zapnuto }),
    }),
    {
      name: 'schoolbuddy-form-check-storage',
      storage: createJSONStorage(() => secureStorage),
      merge: (persisted, current) => {
        const saved = persisted as Partial<FormCheckState> | undefined
        return {
          ...current,
          ...saved,
          sezeni: sanitizujSezeni(saved?.sezeni),
          hlasoveHlaseni: typeof saved?.hlasoveHlaseni === 'boolean' ? saved.hlasoveHlaseni : true,
          lastReminderDate: typeof saved?.lastReminderDate === 'string' ? saved.lastReminderDate : null,
        }
      },
    }
  )
)

/** Nejlepší jedno sezení PRO DANÝ CVIK — na rozdíl od nejlepsiSezeni níž
 *  (max napříč úplně všemi cviky, což se nedá smysluplně srovnávat mezi
 *  dřepem a klikem) je tohle to, s čím se má porovnávat živé počítadlo
 *  během běžícího sezení (viz FormCheck.tsx's "Živá oslava osobního
 *  rekordu"). Exportováno jako čistá funkce, ať jde otestovat bez
 *  komponenty i bez Zustand storu. */
export const nejlepsiOpakovaniProCvik = (sezeni: Sezeni[], cvik: TypCviku): number =>
  sezeni.filter((s) => s.cvik === cvik).reduce((max, s) => Math.max(max, s.pocetOpakovani), 0)

/** Návrh cíle na příště — jednoduchá progresivní zátěž (progressive
 *  overload): appka vezme POSLEDNÍ sezení daného cviku a navrhne o
 *  jedno opakování/vteřinu výdrže víc, ne nejlepší dosavadní výsledek —
 *  cíl má být dosažitelný krok od toho, co uživatel dělal naposledy, ne
 *  skok na jeho životní maximum. Bez dosavadní historie daného cviku
 *  vrací null (žádný vymyšlený cíl, stejná poctivost jako u appčiných
 *  "zatím nesledujeme" hlášek jinde). */
export const navrhniCilNaPriste = (sezeni: Sezeni[], cvik: TypCviku): number | null => {
  const proCvik = sezeni.filter((s) => s.cvik === cvik)
  if (proCvik.length === 0) return null
  const posledni = [...proCvik].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  return posledni.pocetOpakovani + 1
}

export const useFormCheck = () => {
  const { sezeni, hlasoveHlaseni, ulozitSezeni, nastavPoznamkuSezeni, setHlasoveHlaseni } = useFormCheckStore()

  const celkemOpakovani = sezeni.reduce((s, z) => s + z.pocetOpakovani, 0)
  const nejlepsiSezeni = sezeni.reduce((max, z) => Math.max(max, z.pocetOpakovani), 0)

  return {
    sezeni: [...sezeni].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    pocetSezeni: sezeni.length,
    celkemOpakovani,
    nejlepsiSezeni,
    hlasoveHlaseni,
    ulozitSezeni,
    nastavPoznamkuSezeni,
    setHlasoveHlaseni,
  }
}
