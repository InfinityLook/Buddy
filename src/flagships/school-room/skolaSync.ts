import { vytvorZaznamovySync, naIso, zIso } from '@/core/supabase/recordSync'
import { useRozvrhStore } from '@/miniapps/rozvrh/useRozvrh'
import { DochazkaZaznam, HodinaRozvrhu, Prazdniny, Presun, Semestr, TydenCyklus, ZrusenaHodina } from '@/miniapps/rozvrh/types'
import { getRawZnamkyState, setRawZnamkyState, subscribeZnamkyStore } from '@/miniapps/znamky/useZnamky'
import { Predmet } from '@/miniapps/znamky/types'
import {
  getRawStudyPlannerState,
  setRawStudyPlannerState,
  subscribeStudyPlannerStore,
} from '@/miniapps/study-planner/useStudyPlanner'
import { StudyTask } from '@/miniapps/study-planner/types'
import { toPlannerRow as toRowUkol, fromPlannerRow as fromRowUkol } from '@/miniapps/study-planner/plannerSync'
import { useKalendarStore } from '@/miniapps/kalendar/useKalendar'
import { BarvaDne, BarvaDneZaznam, Opakovani, Udalost } from '@/miniapps/kalendar/types'

// ==========================================
// Cloudová synchronizace celé školní skupiny (Rozvrh + jeho docházka,
// prázdniny, zrušené výskyty, přesuny a semestry; Známky; Planer;
// Kalendář + jeho barvy dne) — JEDEN sdílený kurzor napříč deseti
// tabulkami, stejný "jeden kurzor, víc tabulek synchronizovaných
// najednou" tvar jako Finance (financeSync.ts), ne tři samostatné
// kurzory jako Writer's Room (tam každý dokument žije ve vlastní
// appce s vlastním kolem uživatelů, tady je to jedna souvisle
// propojená doména — School Room).
//
// Rozvrhova docházka a Kalendářovy barvy dne appka odjakživa ukládala
// jako Record<klic, hodnota>, ne pole záznamů — to samo o sobě nešlo
// synchronizovat záznam po záznamu (žádné vlastní id/updatedAt na
// jednu hodnotu). useRozvrh.ts/useKalendar.ts proto obě mapy převedly
// na pole soft-deletable záznamů (DochazkaZaznam/BarvaDneZaznam) uvnitř
// storu, s Record<> pohledem počítaným za běhu pro zbytek appky — tenhle
// soubor je první skutečný spotřebitel toho nového pole tvaru.
//
// Parita týdne (HodinaRozvrhu.tyden) žila od svého vzniku (Fáze 3)
// jen lokálně — appka ji nikdy neposílala do žádného sloupce, takže
// se při cross-device merge ztrácela zpátky na 'kazdy'. Migrace
// rozvrh_faze3_prazdniny_zruseni_presuny_semestry dodala chybějící
// sloupec; toRow/fromRowHodina ho teď čtou a zapisují jako kteroukoli
// jinou hodnotu.
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
  // Parita týdne (Fáze 3) žila dřív jen lokálně — appka ji posílala do
  // žádné tabulky vůbec, takže se při cross-device merge ztrácela.
  // Výchozí 'kazdy' na sloupci samotném (viz migrace) dělá fromRow
  // bezpečným i pro řádek zapsaný ještě starší verzí appky.
  tyden: h.tyden ?? 'kazdy',
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
  tyden: (r.tyden ?? 'kazdy') as TydenCyklus,
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: zIso(r.updated_at),
  deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
})

const toRowPrazdniny = (userId: string, p: Prazdniny) => ({
  id: p.id,
  user_id: userId,
  nazev: p.nazev,
  datum_od: p.datumOd,
  datum_do: p.datumDo,
  created_at: p.createdAt,
  updated_at: naIso(p.updatedAt),
  deleted_at: p.deletedAt ? naIso(p.deletedAt) : null,
})

const fromRowPrazdniny = (r: Record<string, any>): Prazdniny => ({
  id: r.id,
  nazev: r.nazev,
  datumOd: r.datum_od,
  datumDo: r.datum_do,
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: zIso(r.updated_at),
  deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
})

const toRowZruseni = (userId: string, z: ZrusenaHodina) => ({
  id: z.id,
  user_id: userId,
  hodina_id: z.hodinaId,
  datum: z.datum,
  created_at: z.createdAt,
  updated_at: naIso(z.updatedAt),
  deleted_at: z.deletedAt ? naIso(z.deletedAt) : null,
})

const fromRowZruseni = (r: Record<string, any>): ZrusenaHodina => ({
  id: r.id,
  hodinaId: r.hodina_id,
  datum: r.datum,
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: zIso(r.updated_at),
  deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
})

const toRowPresun = (userId: string, p: Presun) => ({
  id: p.id,
  user_id: userId,
  hodina_id: p.hodinaId,
  puvodni_datum: p.puvodniDatum,
  novy_datum: p.novyDatum,
  novy_cas_od: p.novyCasOd,
  novy_cas_do: p.novyCasDo,
  created_at: p.createdAt,
  updated_at: naIso(p.updatedAt),
  deleted_at: p.deletedAt ? naIso(p.deletedAt) : null,
})

const fromRowPresun = (r: Record<string, any>): Presun => ({
  id: r.id,
  hodinaId: r.hodina_id,
  puvodniDatum: r.puvodni_datum,
  novyDatum: r.novy_datum,
  novyCasOd: r.novy_cas_od,
  novyCasDo: r.novy_cas_do,
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: zIso(r.updated_at),
  deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
})

// Semestr.hodiny je vnořené pole celých HodinaRozvrhu — hluboký strom,
// ne plochý seznam polí jako prázdniny/zrušení/přesuny výš. Stejný
// "celý dokument jako jeden JSONB sloupec" tvar jako Writer's Room
// (writer_knihy/scenare/komiksy, viz writerSync.ts) — data nese CELÝ
// objekt včetně nazev/datumOd/datumDo/hodiny/createdAt, aby fromRow
// nemusel skládat objekt zpátky ze dvou zdrojů.
const toRowSemestr = (userId: string, s: Semestr) => ({
  id: s.id,
  user_id: userId,
  data: s,
  updated_at: naIso(s.updatedAt),
  deleted_at: s.deletedAt ? naIso(s.deletedAt) : null,
})

const fromRowSemestr = (r: Record<string, any>): Semestr => ({
  ...(r.data as Semestr),
  id: r.id,
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

const toRowUdalost = (userId: string, u: Udalost) => ({
  id: u.id,
  user_id: userId,
  datum: u.datum,
  nazev: u.nazev,
  popis: u.popis,
  opakovani: u.opakovani,
  // --- Fáze 2 (profesionální rozšíření) — stejných 6 sloupců, co
  // migrace kalendar_udalosti_profi_rozsireni přidala na tabulku.
  cas_od: u.casOd ?? null,
  cas_do: u.casDo ?? null,
  celodenni: u.celodenni,
  datum_do: u.datumDo ?? null,
  vyjimky: u.vyjimky,
  pripominka_minut: u.pripominkaMinut,
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
  celodenni: r.celodenni ?? true,
  casOd: r.cas_od ?? undefined,
  casDo: r.cas_do ?? undefined,
  datumDo: r.datum_do ?? undefined,
  vyjimky: Array.isArray(r.vyjimky) ? r.vyjimky : [],
  pripominkaMinut: r.pripominka_minut ?? null,
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
  // `getLocal` čte `.getState()`/`getRawXState()` ČERSTVĚ při každém
  // volání, ne jednou zachycenou kopii pro celý šestitabulkový průchod
  // — jinak by `recordSync.ts`'s `syncOneTable` nad druhou až šestou
  // tabulkou dostávalo zmrazený stav z chvíle, kdy tahle funkce sama
  // proběhla, ne aktuální obsah storu v okamžiku, kdy se na tu tabulku
  // skutečně dostala řada.
  () => [
    {
      table: 'rozvrh_hodiny',
      getLocal: () => useRozvrhStore.getState().hodiny,
      setLocal: (items: HodinaRozvrhu[]) => useRozvrhStore.setState({ hodiny: items }),
      toRow: toRowHodina,
      fromRow: fromRowHodina,
    },
    {
      table: 'rozvrh_dochazka',
      getLocal: () => useRozvrhStore.getState().dochazkaZaznamy,
      setLocal: (items: DochazkaZaznam[]) => useRozvrhStore.setState({ dochazkaZaznamy: items }),
      toRow: toRowDochazka,
      fromRow: fromRowDochazka,
    },
    {
      table: 'rozvrh_prazdniny',
      getLocal: () => useRozvrhStore.getState().prazdniny,
      setLocal: (items: Prazdniny[]) => useRozvrhStore.setState({ prazdniny: items }),
      toRow: toRowPrazdniny,
      fromRow: fromRowPrazdniny,
    },
    {
      table: 'rozvrh_zrusene_hodiny',
      getLocal: () => useRozvrhStore.getState().zruseneHodiny,
      setLocal: (items: ZrusenaHodina[]) => useRozvrhStore.setState({ zruseneHodiny: items }),
      toRow: toRowZruseni,
      fromRow: fromRowZruseni,
    },
    {
      table: 'rozvrh_presuny',
      getLocal: () => useRozvrhStore.getState().presuny,
      setLocal: (items: Presun[]) => useRozvrhStore.setState({ presuny: items }),
      toRow: toRowPresun,
      fromRow: fromRowPresun,
    },
    {
      table: 'rozvrh_semestry',
      getLocal: () => useRozvrhStore.getState().semestry,
      setLocal: (items: Semestr[]) => useRozvrhStore.setState({ semestry: items }),
      toRow: toRowSemestr,
      fromRow: fromRowSemestr,
    },
    {
      table: 'znamky_predmety',
      getLocal: () => getRawZnamkyState().predmety,
      setLocal: (items: Predmet[]) => setRawZnamkyState({ predmety: items }),
      toRow: toRowPredmet,
      fromRow: fromRowPredmet,
    },
    {
      table: 'planer_ukoly',
      getLocal: () => getRawStudyPlannerState().tasks,
      setLocal: (items: StudyTask[]) => setRawStudyPlannerState({ tasks: items }),
      toRow: toRowUkol,
      fromRow: fromRowUkol,
    },
    {
      table: 'kalendar_udalosti',
      getLocal: () => useKalendarStore.getState().udalosti,
      setLocal: (items: Udalost[]) => useKalendarStore.setState({ udalosti: items }),
      toRow: toRowUdalost,
      fromRow: fromRowUdalost,
    },
    {
      table: 'kalendar_barvy_dne',
      getLocal: () => useKalendarStore.getState().barvyDniZaznamy,
      setLocal: (items: BarvaDneZaznam[]) => useKalendarStore.setState({ barvyDniZaznamy: items }),
      toRow: toRowBarvaDne,
      fromRow: fromRowBarvaDne,
    },
  ],
  (posluchac) => {
    useRozvrhStore.subscribe(posluchac)
    subscribeZnamkyStore(posluchac)
    subscribeStudyPlannerStore(posluchac)
    useKalendarStore.subscribe(posluchac)
  }
)

export { useSkolaSyncStatus, syncSkolaNow, startSkolaSync }
