import { vytvorZaznamovySync, naIso, zIso } from '@/core/supabase/recordSync'
import { useRozvrhStore } from '@/miniapps/rozvrh/useRozvrh'
import { DochazkaZaznam, HodinaRozvrhu } from '@/miniapps/rozvrh/types'
import { getRawZnamkyState, setRawZnamkyState, subscribeZnamkyStore } from '@/miniapps/znamky/useZnamky'
import { Predmet } from '@/miniapps/znamky/types'
import {
  getRawStudyPlannerState,
  setRawStudyPlannerState,
  subscribeStudyPlannerStore,
} from '@/miniapps/study-planner/useStudyPlanner'
import { StudyTask, TaskPriority } from '@/miniapps/study-planner/types'
import { useKalendarStore } from '@/miniapps/kalendar/useKalendar'
import { BarvaDne, BarvaDneZaznam, Opakovani, Udalost } from '@/miniapps/kalendar/types'

// ==========================================
// Cloudová synchronizace celé školní skupiny (Rozvrh + jeho docházka,
// Známky, Planer, Kalendář + jeho barvy dne) — JEDEN sdílený kurzor
// napříč šesti tabulkami, stejný "jeden kurzor, víc tabulek
// synchronizovaných najednou" tvar jako Finance (financeSync.ts), ne
// tři samostatné kurzory jako Writer's Room (tam každý dokument žije ve
// vlastní appce s vlastním kolem uživatelů, tady je to jedna
// souvisle propojená doména — School Room).
//
// Rozvrhova docházka a Kalendářovy barvy dne appka odjakživa ukládala
// jako Record<klic, hodnota>, ne pole záznamů — to samo o sobě nešlo
// synchronizovat záznam po záznamu (žádné vlastní id/updatedAt na
// jednu hodnotu). useRozvrh.ts/useKalendar.ts proto obě mapy převedly
// na pole soft-deletable záznamů (DochazkaZaznam/BarvaDneZaznam) uvnitř
// storu, s Record<> pohledem počítaným za běhu pro zbytek appky — tenhle
// soubor je první skutečný spotřebitel toho nového pole tvaru.
// ==========================================

const toRowHodina = (userId: string, h: HodinaRozvrhu) => ({
  id: h.id,
  user_id: userId,
  den: h.den,
  cas_od: h.casOd,
  cas_do: h.casDo,
  predmet: h.predmet,
  mistnost: h.mistnost,
  vyucujici: h.vyucujici,
  created_at: h.createdAt,
  updated_at: naIso(h.updatedAt),
  deleted_at: h.deletedAt ? naIso(h.deletedAt) : null,
})

const fromRowHodina = (r: Record<string, any>): HodinaRozvrhu => ({
  id: r.id,
  den: r.den as HodinaRozvrhu['den'],
  casOd: r.cas_od,
  casDo: r.cas_do,
  predmet: r.predmet,
  mistnost: r.mistnost ?? '',
  vyucujici: r.vyucujici ?? '',
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: zIso(r.updated_at),
  deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
})

const toRowDochazka = (userId: string, z: DochazkaZaznam) => ({
  id: z.id,
  user_id: userId,
  hodina_id: z.hodinaId,
  datum: z.datum,
  byl: z.byl,
  created_at: z.createdAt,
  updated_at: naIso(z.updatedAt),
  deleted_at: z.deletedAt ? naIso(z.deletedAt) : null,
})

const fromRowDochazka = (r: Record<string, any>): DochazkaZaznam => ({
  id: r.id,
  hodinaId: r.hodina_id,
  datum: r.datum,
  byl: r.byl,
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: zIso(r.updated_at),
  deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
})

const toRowPredmet = (userId: string, p: Predmet) => ({
  id: p.id,
  user_id: userId,
  nazev: p.nazev,
  kredity: p.kredity,
  znamky: p.znamky,
  cil: p.cil ?? null,
  created_at: p.createdAt,
  updated_at: naIso(p.updatedAt),
  deleted_at: p.deletedAt ? naIso(p.deletedAt) : null,
})

const fromRowPredmet = (r: Record<string, any>): Predmet => ({
  id: r.id,
  nazev: r.nazev,
  kredity: r.kredity ?? 0,
  znamky: Array.isArray(r.znamky) ? r.znamky : [],
  cil: r.cil ?? null,
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: zIso(r.updated_at),
  deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
})

const toRowUkol = (userId: string, t: StudyTask) => ({
  id: t.id,
  user_id: userId,
  subject: t.subject,
  topic: t.topic,
  due_date: t.dueDate,
  priority: t.priority,
  completed: t.completed,
  podukoly: t.podukoly ?? [],
  created_at: t.createdAt,
  updated_at: naIso(t.updatedAt),
  deleted_at: t.deletedAt ? naIso(t.deletedAt) : null,
})

const fromRowUkol = (r: Record<string, any>): StudyTask => ({
  id: r.id,
  subject: r.subject,
  topic: r.topic,
  dueDate: r.due_date,
  priority: (r.priority ?? 'Střední') as TaskPriority,
  completed: !!r.completed,
  podukoly: Array.isArray(r.podukoly) ? r.podukoly : [],
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: zIso(r.updated_at),
  deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
})

const toRowUdalost = (userId: string, u: Udalost) => ({
  id: u.id,
  user_id: userId,
  datum: u.datum,
  nazev: u.nazev,
  popis: u.popis,
  opakovani: u.opakovani,
  created_at: naIso(u.createdAt),
  updated_at: naIso(u.updatedAt),
  deleted_at: u.deletedAt ? naIso(u.deletedAt) : null,
})

const fromRowUdalost = (r: Record<string, any>): Udalost => ({
  id: r.id,
  datum: r.datum,
  nazev: r.nazev,
  popis: r.popis ?? '',
  opakovani: (r.opakovani ?? 'zadne') as Opakovani,
  createdAt: zIso(r.created_at),
  updatedAt: zIso(r.updated_at),
  deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
})

const toRowBarvaDne = (userId: string, z: BarvaDneZaznam) => ({
  id: z.id,
  user_id: userId,
  datum: z.datum,
  barva: z.barva,
  updated_at: naIso(z.updatedAt),
  deleted_at: z.deletedAt ? naIso(z.deletedAt) : null,
})

const fromRowBarvaDne = (r: Record<string, any>): BarvaDneZaznam => ({
  id: r.id,
  datum: r.datum,
  barva: r.barva as BarvaDne,
  updatedAt: zIso(r.updated_at),
  deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
})

const { useSyncStatus: useSkolaSyncStatus, syncNow: syncSkolaNow, start: startSkolaSync } = vytvorZaznamovySync(
  'schoolbuddy-skola-sync-cursor',
  () => {
    const rozvrhState = useRozvrhStore.getState()
    const znamkyState = getRawZnamkyState()
    const planerState = getRawStudyPlannerState()
    const kalendarState = useKalendarStore.getState()

    return [
      {
        table: 'rozvrh_hodiny',
        getLocal: () => rozvrhState.hodiny,
        setLocal: (items: HodinaRozvrhu[]) => useRozvrhStore.setState({ hodiny: items }),
        toRow: toRowHodina,
        fromRow: fromRowHodina,
      },
      {
        table: 'rozvrh_dochazka',
        getLocal: () => rozvrhState.dochazkaZaznamy,
        setLocal: (items: DochazkaZaznam[]) => useRozvrhStore.setState({ dochazkaZaznamy: items }),
        toRow: toRowDochazka,
        fromRow: fromRowDochazka,
      },
      {
        table: 'znamky_predmety',
        getLocal: () => znamkyState.predmety,
        setLocal: (items: Predmet[]) => setRawZnamkyState({ predmety: items }),
        toRow: toRowPredmet,
        fromRow: fromRowPredmet,
      },
      {
        table: 'planer_ukoly',
        getLocal: () => planerState.tasks,
        setLocal: (items: StudyTask[]) => setRawStudyPlannerState({ tasks: items }),
        toRow: toRowUkol,
        fromRow: fromRowUkol,
      },
      {
        table: 'kalendar_udalosti',
        getLocal: () => kalendarState.udalosti,
        setLocal: (items: Udalost[]) => useKalendarStore.setState({ udalosti: items }),
        toRow: toRowUdalost,
        fromRow: fromRowUdalost,
      },
      {
        table: 'kalendar_barvy_dne',
        getLocal: () => kalendarState.barvyDniZaznamy,
        setLocal: (items: BarvaDneZaznam[]) => useKalendarStore.setState({ barvyDniZaznamy: items }),
        toRow: toRowBarvaDne,
        fromRow: fromRowBarvaDne,
      },
    ]
  },
  (posluchac) => {
    useRozvrhStore.subscribe(posluchac)
    subscribeZnamkyStore(posluchac)
    subscribeStudyPlannerStore(posluchac)
    useKalendarStore.subscribe(posluchac)
  }
)

export { useSkolaSyncStatus, syncSkolaNow, startSkolaSync }
