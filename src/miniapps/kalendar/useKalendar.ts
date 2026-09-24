import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateKalendarData } from '@/core/utils/kalendarValidation'
import { BarvaDne, BarvaDneZaznam, Opakovani, Udalost, barvyDniJakoRecord, udalostSeVyskytujeVDen } from './types'

const XP_ZA_UDALOST = 5

interface KalendarState {
  udalosti: Udalost[]
  // Pole záznamů barvy dne, ne Record — viz types.ts's vlastní komentář
  // u BarvaDneZaznam, proč je to vlastní pole se soft-delete, ne mapa.
  barvyDniZaznamy: BarvaDneZaznam[]
  pridatUdalost: (datum: string, nazev: string, popis: string, opakovani: Opakovani) => void
  smazatUdalost: (id: string) => void
  /** null smaže barvu dne (návrat na "bez barvy"). */
  nastavBarvuDne: (datum: string, barva: BarvaDne | null) => void
}

/** Vrátí 'YYYY-MM-DD' z místního data (ne UTC — Date.toISOString() by
 *  po půlnoci ve špatném časovém pásmu posunulo den o jeden zpátky). */
export const naFormatDatumu = (rok: number, mesic: number, den: number): string =>
  `${rok}-${String(mesic + 1).padStart(2, '0')}-${String(den).padStart(2, '0')}`

const dnesniDatum = (): string => {
  const d = new Date()
  return naFormatDatumu(d.getFullYear(), d.getMonth(), d.getDate())
}

// Exportovaný přímo — skolaSync.ts (cloudová synchronizace) potřebuje
// .getState()/.setState()/.subscribe() mimo React, stejný důvod jako
// Rozvrhovo useRozvrhStore.
export const useKalendarStore = create<KalendarState>()(
  persist(
    (set) => ({
      udalosti: [],
      barvyDniZaznamy: [],

      nastavBarvuDne: (datum, barva) =>
        set((state) => {
          const ted = Date.now()
          const existujici = state.barvyDniZaznamy.find((z) => z.id === datum)

          if (barva === null) {
            // Zpět na "bez barvy" — měkké smazání, ne fyzické odstranění,
            // ať appka umí zrcadlit i tohle "✕ bez barvy" na druhé zařízení.
            if (!existujici || existujici.deletedAt) return {}
            return {
              barvyDniZaznamy: state.barvyDniZaznamy.map((z) =>
                z.id === datum ? { ...z, deletedAt: ted, updatedAt: ted } : z
              ),
            }
          }

          if (existujici) {
            return {
              barvyDniZaznamy: state.barvyDniZaznamy.map((z) =>
                z.id === datum ? { ...z, barva, deletedAt: null, updatedAt: ted } : z
              ),
            }
          }

          const novy: BarvaDneZaznam = { id: datum, datum, barva, updatedAt: ted, deletedAt: null }
          return { barvyDniZaznamy: [...state.barvyDniZaznamy, novy] }
        }),

      pridatUdalost: (datum, nazev, popis, opakovani) => {
        if (!nazev.trim()) return

        const ted = Date.now()
        const nova: Udalost = {
          id: `${ted}-${Math.random().toString(36).slice(2, 7)}`,
          datum,
          nazev: nazev.trim(),
          popis: popis.trim(),
          createdAt: ted,
          opakovani,
          updatedAt: ted,
          deletedAt: null,
        }

        set((state) => ({ udalosti: [...state.udalosti, nova] }))
        useGamificationStore.getState().recordAction('kalendar', XP_ZA_UDALOST)
      },

      // Měkké smazání — appka událost nikdy fyzicky neodstraní z pole,
      // jen ji označí deletedAt (viz Udalost.deletedAt v types.ts).
      smazatUdalost: (id) =>
        set((state) => {
          const ted = Date.now()
          return { udalosti: state.udalosti.map((u) => (u.id === id ? { ...u, deletedAt: ted, updatedAt: ted } : u)) }
        }),
    }),
    {
      name: 'schoolbuddy-kalendar-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateKalendarData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)

/** Čistá pomocná funkce (žádný store, žádné React state) — kolik dní má
 *  daný měsíc a na jaký den v týdnu (0 = pondělí) padne jeho první den.
 *  Vytažené mimo hook, ať jde otestovat bez komponenty, stejný důvod
 *  jako combat/leveling.ts. */
export const rozlozeniMesice = (rok: number, mesic: number) => {
  const prvniDen = new Date(rok, mesic, 1).getDay()
  // JS getDay() vrací 0 = neděle — appka počítá týden od pondělí, proto
  // posun o jedno místo doleva s obtočením neděle na konec.
  const posunOdPondeli = prvniDen === 0 ? 6 : prvniDen - 1
  const pocetDni = new Date(rok, mesic + 1, 0).getDate()
  return { posunOdPondeli, pocetDni }
}

export const NAZVY_MESICU = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
]

export const useKalendar = () => {
  const { udalosti: vsechnyUdalosti, barvyDniZaznamy, pridatUdalost, smazatUdalost, nastavBarvuDne } = useKalendarStore()
  const dnes = useMemo(() => new Date(), [])
  const [rok, setRok] = useState(dnes.getFullYear())
  const [mesic, setMesic] = useState(dnes.getMonth())
  const [vybranyDen, setVybranyDen] = useState<string | null>(dnesniDatum())

  // Smazané události/barvy dní appka drží v úložišti dál (viz
  // Udalost.deletedAt/BarvaDneZaznam.deletedAt) jen kvůli synchronizaci
  // mezi zařízeními — kdokoli appku volá jako dřív je nikdy nesmí vidět.
  const udalosti = useMemo(() => vsechnyUdalosti.filter((u) => !u.deletedAt), [vsechnyUdalosti])
  const barvyDni = useMemo(() => barvyDniJakoRecord(barvyDniZaznamy), [barvyDniZaznamy])

  const jitMesicem = (smer: -1 | 1) => {
    setVybranyDen(null)
    const novy = new Date(rok, mesic + smer, 1)
    setRok(novy.getFullYear())
    setMesic(novy.getMonth())
  }

  // Množina dní ZOBRAZOVANÉHO měsíce s alespoň jedním výskytem události
  // (jednorázové i opakující se) — appka ji počítá jen pro dny, co grid
  // vůbec vykresluje (rok/mesic), ne pro celou historii/budoucnost, což
  // by u opakující se události ani nešlo (nekonečně mnoho výskytů).
  const dnySUdalosti = useMemo(() => {
    const mnozina = new Set<string>()
    const { pocetDni } = rozlozeniMesice(rok, mesic)
    for (let den = 1; den <= pocetDni; den++) {
      const datumStr = naFormatDatumu(rok, mesic, den)
      if (udalosti.some((u) => udalostSeVyskytujeVDen(u, datumStr))) mnozina.add(datumStr)
    }
    return mnozina
  }, [udalosti, rok, mesic])

  const udalostiDne = useMemo(
    () =>
      vybranyDen
        ? udalosti.filter((u) => udalostSeVyskytujeVDen(u, vybranyDen)).sort((a, b) => a.createdAt - b.createdAt)
        : [],
    [udalosti, vybranyDen]
  )

  return {
    rok,
    mesic,
    dnes,
    vybranyDen,
    setVybranyDen,
    jitMesicem,
    dnySUdalosti,
    udalostiDne,
    // Syrové pole — School Roomovo "Moje přehled" z něj počítá
    // nadcházející události vlastním, pravidelně obnovovaným "teď"
    // (viz CLAUDE.md), ne appčiným dnes tady, co se počítá jen jednou
    // při prvním vykreslení a School Room se dlouho neodmountuje.
    udalosti,
    barvyDni,
    nastavBarvuDne,
    pocetUdalostiCelkem: udalosti.length,
    pridatUdalost,
    smazatUdalost,
  }
}
