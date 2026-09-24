import { vytvorZaznamovySync, naIso, zIso } from '@/core/supabase/recordSync'
import { getRawBookWriterState, setRawBookWriterState, subscribeBookWriterStore } from '@/miniapps/book-writer/useBookWriter'
import {
  getRawScreenplayWriterState,
  setRawScreenplayWriterState,
  subscribeScreenplayWriterStore,
} from '@/miniapps/screenplay-writer/useScreenplayWriter'
import { getRawComicWriterState, setRawComicWriterState, subscribeComicWriterStore } from '@/miniapps/comic-writer/useComicWriter'
import { Kniha } from '@/miniapps/book-writer/types'
import { Scenar } from '@/miniapps/screenplay-writer/types'
import { Komiks } from '@/miniapps/comic-writer/types'

// ==========================================
// Cloudová synchronizace Writer's Roomu — na rozdíl od Financí appka
// tady nerozkládá dokument na sloupce (kapitoly/sceny/strany jsou
// hluboko vnořené stromy, ne plochý seznam polí, jaký má transakce
// nebo peněženka), ale posílá celou knihu/scénář/komiks jako jeden
// JSONB blob. Tři oddělené tabulky (writer_knihy/scenare/komiksy),
// jeden sdílený kurzor pro celou doménu — stejný vzor jako u Financí,
// jen jinak tvarovaná data, proto sdílený core/supabase/recordSync.ts
// engine místo druhé, skoro identické kopie financeSync.ts.
//
// data sloupec drží CELÝ objekt (Kniha/Scenar/Komiks) jako JSONB —
// i pole, co appka jinak čte přímo ze sloupce (nazev), aby fromRow
// nemusel skládat objekt zpátky ze dvou různých zdrojů a aby se
// žádné pole nemuselo omylem zapomenout přenést.
// ==========================================

const toRowGeneric = <T extends Kniha | Scenar | Komiks>(userId: string, item: T) => ({
  id: item.id,
  user_id: userId,
  data: item,
  updated_at: naIso(item.updatedAt),
  deleted_at: item.deletedAt ? naIso(item.deletedAt) : null,
})

const fromRowGeneric = <T extends Kniha | Scenar | Komiks>(r: Record<string, any>): T => ({
  ...(r.data as T),
  id: r.id,
  updatedAt: zIso(r.updated_at),
  deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
})

const { useSyncStatus: useWriterSyncStatus, syncNow: syncWriterNow, start: startWriterSync } = vytvorZaznamovySync(
  'schoolbuddy-writer-sync-cursor',
  () => {
    const knihyState = getRawBookWriterState()
    const scenareState = getRawScreenplayWriterState()
    const komiksyState = getRawComicWriterState()

    return [
      {
        table: 'writer_knihy',
        getLocal: () => knihyState.knihy,
        setLocal: (items: Kniha[]) => setRawBookWriterState({ knihy: items }),
        toRow: toRowGeneric<Kniha>,
        fromRow: fromRowGeneric<Kniha>,
      },
      {
        table: 'writer_scenare',
        getLocal: () => scenareState.scenare,
        setLocal: (items: Scenar[]) => setRawScreenplayWriterState({ scenare: items }),
        toRow: toRowGeneric<Scenar>,
        fromRow: fromRowGeneric<Scenar>,
      },
      {
        table: 'writer_komiksy',
        getLocal: () => komiksyState.komiksy,
        setLocal: (items: Komiks[]) => setRawComicWriterState({ komiksy: items }),
        toRow: toRowGeneric<Komiks>,
        fromRow: fromRowGeneric<Komiks>,
      },
    ]
  },
  (posluchac) => {
    // Jedno společné zpožděné odeslání pro všechny tři appky Writer's
    // Roomu — psaní v jedné appce (třeba každý znak v Knize) by jinak
    // spustilo tři nezávislé odposlechy, co by se navzájem předbíhaly.
    subscribeBookWriterStore(posluchac)
    subscribeScreenplayWriterStore(posluchac)
    subscribeComicWriterStore(posluchac)
  }
)

export { useWriterSyncStatus, syncWriterNow, startWriterSync }
