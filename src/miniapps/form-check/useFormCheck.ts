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

const PLATNE_CVIKY: TypCviku[] = ['dřep', 'klik']
const PLATNE_NAROCNOSTI: Narocnost[] = ['lehka', 'stredni', 'tezka']

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
    }))
}

interface FormCheckState {
  sezeni: Sezeni[]
  ulozitSezeni: (pocetOpakovani: number, trvaniSekund: number, cvik: TypCviku) => string
  nastavPoznamkuSezeni: (id: string, poznamka: string, narocnost: Narocnost | null) => void
}

const useFormCheckStore = create<FormCheckState>()(
  persist(
    (set) => ({
      sezeni: [],

      ulozitSezeni: (pocetOpakovani, trvaniSekund, cvik) => {
        if (pocetOpakovani <= 0) return ''

        const id = noveId()
        set((state) => ({
          sezeni: [
            ...state.sezeni,
            { id, cvik, pocetOpakovani, trvaniSekund, createdAt: new Date().toISOString() },
          ],
        }))

        // recordAction, ne bare addXp — počítadlo dokončených sezení
        // a XP se tak nemůžou rozejít, stejně jako u ostatních miniapek.
        useGamificationStore
          .getState()
          .recordAction('workout', Math.min(XP_STROP, pocetOpakovani * XP_ZA_OPAKOVANI))

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
    }),
    {
      name: 'schoolbuddy-form-check-storage',
      storage: createJSONStorage(() => secureStorage),
      merge: (persisted, current) => {
        const saved = persisted as Partial<FormCheckState> | undefined
        return { ...current, ...saved, sezeni: sanitizujSezeni(saved?.sezeni) }
      },
    }
  )
)

export const useFormCheck = () => {
  const { sezeni, ulozitSezeni, nastavPoznamkuSezeni } = useFormCheckStore()

  const celkemOpakovani = sezeni.reduce((s, z) => s + z.pocetOpakovani, 0)
  const nejlepsiSezeni = sezeni.reduce((max, z) => Math.max(max, z.pocetOpakovani), 0)

  return {
    sezeni: [...sezeni].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    pocetSezeni: sezeni.length,
    celkemOpakovani,
    nejlepsiSezeni,
    ulozitSezeni,
    nastavPoznamkuSezeni,
  }
}
