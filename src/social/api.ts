import { supabase } from '@/core/supabase/client'
import type {
  Chat,
  NalezVysledek,
  DuvodNahlaseni,
  Hlaseni,
  StavHlaseni,
  MujProfil,
  Pritel,
  SocialProfil,
  Vysledek,
  Zadost,
  Zprava,
} from './types'

// ==========================================
// Jediné místo, kde Social mluví se Supabase.
//
// Komponenty odsud dostávají hotové tvary, ne surové řádky — díky tomu
// se dá schéma změnit, aniž by se sáhlo na UI.
//
// Nic z toho nechrání data: o tom, co uživatel smí, rozhodují pravidla
// v databázi. Tady se jen ptáme; kdyby se někdo pokusil obejít UI, RLS
// ho zastaví stejně.
// ==========================================

const NENI_CLOUD: Vysledek = { ok: false, chyba: 'Social potřebuje připojení k účtu.' }

/**
 * Vytáhne z chyby něco, co má uživateli co říct.
 *
 * Supabase nevrací `Error`, ale obyčejný objekt `{ message, code, hint }`.
 * Test na `instanceof Error` proto neplatil nikdy a každá chyba z databáze
 * skončila jako "Nepovedlo se to." — včetně těch, které přesně říkaly, co
 * je špatně. Na telefonu není konzole, takže tahle hláška byla jediné, co
 * se dalo zjistit, a nedalo se podle ní poznat vůbec nic.
 */
const chyba = (err: unknown): Vysledek => {
  if (err instanceof Error) return { ok: false, chyba: err.message }

  if (err && typeof err === 'object') {
    const o = err as { message?: unknown; hint?: unknown; code?: unknown }
    const text = typeof o.message === 'string' ? o.message.trim() : ''
    const rada = typeof o.hint === 'string' ? o.hint.trim() : ''
    if (text) return { ok: false, chyba: rada ? `${text} (${rada})` : text }
    if (typeof o.code === 'string' && o.code) {
      return { ok: false, chyba: `Nepovedlo se to (${o.code}).` }
    }
  }

  return { ok: false, chyba: 'Nepovedlo se to.' }
}

const profilZRadku = (r: {
  id: string
  display_name: string | null
  avatar_url: string | null
}): SocialProfil => ({
  id: r.id,
  displayName: r.display_name?.trim() || 'Student',
  avatarUrl: r.avatar_url,
})

// ---------- vlastní profil ----------

export const nactiMujProfil = async (): Promise<MujProfil | null> => {
  if (!supabase) return null

  const { data: relace } = await supabase.auth.getSession()
  const id = relace.session?.user?.id
  if (!id) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, friend_code')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null

  return { ...profilZRadku(data), friendCode: data.friend_code }
}

/** Kód se píše po čtveřicích, ať se dá nadiktovat bez chyb. */
export const formatujKod = (kod: string): string =>
  kod.replace(/(.{4})(?=.)/g, '$1-')

// ---------- hledání a žádosti ----------

/** Kód zbavený pomlček a mezer, velkými písmeny. */
export const ocistiKod = (kod: string): string =>
  kod.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

export const najdiPodleKodu = async (kod: string): Promise<NalezVysledek> => {
  if (!supabase) return { stav: 'chyba', chyba: 'Social potřebuje připojení k účtu.' }

  const ocisteny = ocistiKod(kod)
  if (ocisteny.length !== 8) return { stav: 'nenalezen' }

  // Hledání jde přes funkci v databázi, ne přes tabulku: běžné pravidlo
  // by muselo pustit čtení všech profilů a kdokoliv by si mohl stáhnout
  // seznam uživatelů.
  const { data, error } = await supabase.rpc('najdi_podle_kodu', { kod: ocisteny })

  // Nefunkční síť a neexistující kód se dřív hlásily stejně — uživatel pak
  // dokola přepisoval správný kód a nevěděl, že problém je jinde.
  if (error) return { stav: 'chyba', chyba: chyba(error).chyba ?? 'Nepovedlo se to.' }
  if (!data || data.length === 0) return { stav: 'nenalezen' }

  return { stav: 'nalezen', profil: profilZRadku(data[0]) }
}

/**
 * Vyhledávání podle jména — appka se přejmenovává na Buddy a necílí
 * jen na školáky, takže hledání jen podle kódu přestává být jedinou
 * cestou. Kód (najdiPodleKodu výš) zůstává v API beze změny, jen ho
 * Social v UI přestává nabízet — počítá se s ním pro budoucí secret chat.
 *
 * Stejně jako u kódu jde přes řízenou funkci v databázi (hledej_podle_
 * jmena), ne přes plain čtení tabulky profiles — ta by musela pustit
 * všechny řádky komukoli přihlášenému. Funkce sama omezí počet výsledků
 * a vynechá vzájemně blokované; kratší než dvouznakový dotaz vrátí
 * prázdno, ať appka nemůže dotazem "a" stáhnout kus celé appky.
 */
export const hledejPodleJmena = async (dotaz: string): Promise<SocialProfil[]> => {
  if (!supabase) return []
  if (dotaz.trim().length < 2) return []

  const { data, error } = await supabase.rpc('hledej_podle_jmena', { dotaz: dotaz.trim() })
  if (error || !data) return []

  return data.map(profilZRadku)
}

export const poslatZadost = async (komuId: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: ja, addressee_id: komuId })

  if (error) {
    // Jednoznačný index na dvojici hlídá, že mezi dvěma lidmi je vztah
    // jen jeden. Kolize tedy neznamená chybu, ale "už se to jednou stalo".
    if (error.code === '23505') return { ok: false, chyba: 'S tímhle člověkem už vztah máš.' }
    return chyba(error)
  }

  return { ok: true }
}

export const nactiZadosti = async (): Promise<Zadost[]> => {
  if (!supabase) return []

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return []

  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, created_at')
    .eq('status', 'pending')

  if (error || !data) return []

  const protejskyIds = data.map((r) => (r.requester_id === ja ? r.addressee_id : r.requester_id))
  const profily = await nactiProfily(protejskyIds)

  return data
    .map((r) => {
      const protejsekId = r.requester_id === ja ? r.addressee_id : r.requester_id
      const profil = profily.get(protejsekId)
      if (!profil) return null

      return {
        id: r.id,
        profil,
        smer: r.requester_id === ja ? ('odchozi' as const) : ('prichozi' as const),
        createdAt: r.created_at,
      }
    })
    .filter((z): z is Zadost => z !== null)
}

export const prijmoutZadost = async (id: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', id)

  return error ? chyba(error) : { ok: true }
}

/** Odmítnutí i zrušení přátelství je totéž — řádek zmizí. */
export const zrusitVazbu = async (id: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { error } = await supabase.from('friendships').delete().eq('id', id)
  return error ? chyba(error) : { ok: true }
}

// ---------- přátelé ----------

const nactiProfily = async (ids: string[]): Promise<Map<string, SocialProfil>> => {
  const mapa = new Map<string, SocialProfil>()
  if (!supabase || ids.length === 0) return mapa

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', [...new Set(ids)])

  for (const r of data ?? []) mapa.set(r.id, profilZRadku(r))
  return mapa
}

/** Jeden profil — používá ho inbox.ts, aby do notifikace o nové zprávě
 *  doplnil jméno odesílatele (živé doručování posílá jen syrový řádek
 *  zprávy, žádné jméno). */
export const nactiProfil = async (id: string): Promise<SocialProfil | null> =>
  (await nactiProfily([id])).get(id) ?? null

export const nactiPratele = async (): Promise<Pritel[]> => {
  if (!supabase) return []

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return []

  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id')
    .eq('status', 'accepted')

  if (error || !data) return []

  const ids = data.map((r) => (r.requester_id === ja ? r.addressee_id : r.requester_id))
  const profily = await nactiProfily(ids)

  return data
    .map((r) => {
      const profil = profily.get(r.requester_id === ja ? r.addressee_id : r.requester_id)
      return profil ? { vazbaId: r.id, profil } : null
    })
    .filter((p): p is Pritel => p !== null)
}

// ---------- blokování ----------

export const nactiBloky = async (): Promise<SocialProfil[]> => {
  if (!supabase) return []

  const { data } = await supabase.from('blocks').select('blocked_id')
  const ids = (data ?? []).map((r) => r.blocked_id)
  if (ids.length === 0) return []

  // Zablokovaný přestává být přítel, takže na jeho profil už nevidíme.
  // Zbývá aspoň id — jméno vypíšeme jako neznámé, ať jde odblokovat.
  const profily = await nactiProfily(ids)
  return ids.map(
    (id) => profily.get(id) ?? { id, displayName: 'Neznámý uživatel', avatarUrl: null }
  )
}

export const zablokovat = async (kohoId: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: ja, blocked_id: kohoId })

  if (error && error.code !== '23505') return chyba(error)

  // Blok a přátelství vedle sebe nedávají smysl. Kdyby vazba zůstala,
  // viděl by zablokovaný dál jméno i profil.
  await supabase
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${ja},addressee_id.eq.${kohoId}),` +
        `and(requester_id.eq.${kohoId},addressee_id.eq.${ja})`
    )

  return { ok: true }
}

export const odblokovat = async (kohoId: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', ja)
    .eq('blocked_id', kohoId)

  return error ? chyba(error) : { ok: true }
}

// ---------- chaty ----------

export const nactiChaty = async (): Promise<Chat[]> => {
  if (!supabase) return []

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return []

  const { data: clenstvi } = await supabase
    .from('chat_members')
    .select('chat_id, last_read_at')
    .eq('user_id', ja)

  const chatIds = (clenstvi ?? []).map((c) => c.chat_id)
  if (chatIds.length === 0) return []

  const precteno = new Map((clenstvi ?? []).map((c) => [c.chat_id, c.last_read_at]))

  const [{ data: chaty }, { data: vsichniClenove }, { data: zpravy }] = await Promise.all([
    supabase.from('chats').select('id, is_group, name, created_by, icon').in('id', chatIds),
    supabase.from('chat_members').select('chat_id, user_id').in('chat_id', chatIds),
    supabase
      .from('messages')
      .select('chat_id, body, created_at, deleted_at, sender_id')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false }),
  ])

  const profily = await nactiProfily(
    (vsichniClenove ?? []).map((c) => c.user_id).filter((id) => id !== ja)
  )

  return (chaty ?? [])
    .map((ch) => {
      const ucastnici = (vsichniClenove ?? [])
        .filter((c) => c.chat_id === ch.id && c.user_id !== ja)
        .map((c) => profily.get(c.user_id))
        .filter((p): p is SocialProfil => p !== undefined)

      const chatZpravy = (zpravy ?? []).filter((z) => z.chat_id === ch.id)
      const posledni = chatZpravy[0]
      const od = precteno.get(ch.id)

      return {
        id: ch.id,
        jeSkupina: ch.is_group,
        // Dvojice nemá vlastní název, bere si jméno protějšku
        nazev: ch.is_group
          ? ch.name?.trim() || 'Skupina'
          : ucastnici[0]?.displayName ?? 'Neznámý uživatel',
        ucastnici,
        posledniZprava: posledni ? (posledni.deleted_at ? 'Zpráva smazána' : posledni.body) : null,
        posledniCas: posledni?.created_at ?? null,
        neprectene: chatZpravy.filter(
          (z) => z.sender_id !== ja && od !== undefined && z.created_at > od
        ).length,
        zakladatelId: ch.created_by,
        ikona: ch.icon,
      }
    })
    .sort((a, b) => (b.posledniCas ?? '').localeCompare(a.posledniCas ?? ''))
}

/**
 * Chat s jedním člověkem. Když už spolu chat mají, vrátí ten stávající —
 * jinak by po každém otevření vznikl další a rozhovor by se roztříštil.
 * O to i o všechno ostatní se stará `zaloz_chat` v databázi.
 */
export const otevritChatSPritelem = async (
  pritelId: string
): Promise<{ chatId: string | null } & Vysledek> => zalozitChat([pritelId], false)

/**
 * Zakládání běží celé v databázi, jedním voláním.
 *
 * Dřív to klient skládal ze tří dotazů. První z nich vkládal chat a rovnou
 * si nechal vrátit jeho id, jenže pravidlo pro čtení chatů zní „jsem jeho
 * členem“ a zakladatel se členem stával až tím druhým dotazem — Postgres
 * proto celý příkaz odmítl a chat nešlo založit vůbec. Navíc kdyby některý
 * z dalších dvou dotazů selhal, zbyl by po něm chat bez členů, který už
 * nikdo neuvidí ani nesmaže. Takhle vznikne buď chat i s členy, nebo nic.
 */
export const zalozitChat = async (
  ucastniciIds: string[],
  jeSkupina: boolean,
  nazev?: string
): Promise<{ chatId: string | null } & Vysledek> => {
  if (!supabase) return { ...NENI_CLOUD, chatId: null }

  const { data, error } = await supabase.rpc('zaloz_chat', {
    ucastnici: ucastniciIds,
    je_skupina: jeSkupina,
    nazev: nazev ?? null,
  })

  if (error) return { ...chyba(error), chatId: null }
  if (typeof data !== 'string') {
    return { ok: false, chyba: 'Chat se založil, ale nevrátilo se jeho id.', chatId: null }
  }

  return { ok: true, chatId: data }
}

export const opustitChat = async (chatId: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  const { error } = await supabase
    .from('chat_members')
    .delete()
    .eq('chat_id', chatId)
    .eq('user_id', ja)

  return error ? chyba(error) : { ok: true }
}

/**
 * Přejmenování skupiny — plain UPDATE, žádná zvláštní funkce netřeba.
 * RLS už dřív pouštělo "přejmenovat skupinu smí její člen", jen to klient
 * nikdy nevolal.
 */
export const prejmenovatSkupinu = async (chatId: string, novyNazev: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const orezany = novyNazev.trim()
  if (!orezany) return { ok: false, chyba: 'Název nemůže být prázdný.' }
  if (orezany.length > 40) return { ok: false, chyba: 'Název je moc dlouhý (nejvýš 40 znaků).' }

  const { error } = await supabase.from('chats').update({ name: orezany }).eq('id', chatId)
  return error ? chyba(error) : { ok: true }
}

/** Ikona skupiny — plain UPDATE, stejná RLS jako přejmenování (sloupcově
 *  neomezená). `ikona: null` vrátí skupinu na výchozí "#". */
export const nastavIkonuSkupiny = async (chatId: string, ikona: string | null): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { error } = await supabase.from('chats').update({ icon: ikona }).eq('id', chatId)
  return error ? chyba(error) : { ok: true }
}

/**
 * Přidání člena do existující skupiny — plain INSERT. RLS na chat_members
 * ("přidat člena smí zakladatel nebo člen") sama ověří, že přidávaný je
 * přítel toho, kdo ho přidává, a že není zablokovaný.
 */
export const pridatDoSkupiny = async (chatId: string, uzivatelId: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { error } = await supabase
    .from('chat_members')
    .insert({ chat_id: chatId, user_id: uzivatelId })

  if (error) {
    if (error.code === '23505') return { ok: false, chyba: 'Tenhle člověk už ve skupině je.' }
    return chyba(error)
  }

  return { ok: true }
}

/**
 * Odebrání někoho JINÉHO ze skupiny — na rozdíl od přejmenování/přidání
 * tohle plain RLS nezvládne (žádné pravidlo bezpečně nepustí "smaž
 * členství někoho jiného"). Jde přes odebrat_ze_skupiny(), která uvnitř
 * ověří, že voláme jako zakladatel skupiny.
 */
export const odebratZeSkupiny = async (chatId: string, uzivatelId: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { error } = await supabase.rpc('odebrat_ze_skupiny', {
    p_chat_id: chatId,
    p_cil: uzivatelId,
  })

  return error ? chyba(error) : { ok: true }
}

// ---------- zprávy ----------

const zpravaZRadku = (r: {
  id: string
  chat_id: string
  sender_id: string
  body: string
  created_at: string
  deleted_at: string | null
}): Zprava => ({
  id: r.id,
  chatId: r.chat_id,
  odesilatelId: r.sender_id,
  text: r.body,
  createdAt: r.created_at,
  smazanoAt: r.deleted_at,
})

// Kolik zpráv se načte na jedno zavolání nactiZpravy — první stránka
// i každá další přes "Načíst starší".
export const ZPRAV_NA_STRANKU = 50

/**
 * Načte jednu stránku zpráv, seřazenou od nejstarší po nejnovější (tak
 * je appka zobrazuje). Bez `pred` vrátí nejnovější stránku — dřív se tu
 * řadilo vzestupně A ROVNOU omezovalo limitem, což u chatu s víc než
 * 200 zprávami vracelo 200 NEJSTARŠÍCH, ne nejnovějších: po znovuotevření
 * appky by nešly vidět žádné aktuální zprávy, jen dávná historie. Proto
 * se řadí sestupně (nejnovější napřed), omezí limitem, a teprve výsledek
 * se otočí do pořadí pro zobrazení.
 *
 * `pred` (ISO čas nejstarší už načtené zprávy) posune okno dál do
 * historie — volá ho "Načíst starší zprávy" v ChatView.tsx.
 */
export const nactiZpravy = async (chatId: string, pred?: string): Promise<Zprava[]> => {
  if (!supabase) return []

  let dotaz = supabase
    .from('messages')
    .select('id, chat_id, sender_id, body, created_at, deleted_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(ZPRAV_NA_STRANKU)

  if (pred) dotaz = dotaz.lt('created_at', pred)

  const { data, error } = await dotaz
  if (error || !data) return []
  return data.map(zpravaZRadku).reverse()
}

/**
 * Vrací i vloženou zprávu, ne jen ok/chyba — ChatView.tsx ji potřebuje
 * rovnou přidat do zobrazeného seznamu. Dřív se po odeslání celý seznam
 * znovu načítal přes nactiZpravy(chatId) bez `pred`, což po opravě
 * stránkování (viz výš) vrací jen nejnovější stránku — kdyby uživatel
 * měl načtenou i starší historii přes "Načíst starší", tenhle refetch
 * by ji zahodil. INSERT ... RETURNING tu na rozdíl od zakládání chatu
 * (viz CLAUDE.md) projde bez potíží: SELECT politika zpráv žádá jen
 * členství v chatu a "sender mě neblokuje", což o vlastní zprávě
 * neplatí nikdy.
 */
export const poslatZpravu = async (
  chatId: string,
  text: string
): Promise<{ zprava: Zprava | null } & Vysledek> => {
  if (!supabase) return { ...NENI_CLOUD, zprava: null }

  const orezany = text.trim()
  if (!orezany) return { ok: false, chyba: 'Prázdnou zprávu poslat nejde.', zprava: null }
  if (orezany.length > 4000) return { ok: false, chyba: 'Zpráva je moc dlouhá.', zprava: null }

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return { ...NENI_CLOUD, zprava: null }

  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, sender_id: ja, body: orezany })
    .select('id, chat_id, sender_id, body, created_at, deleted_at')
    .single()

  if (error || !data) return { ...chyba(error), zprava: null }
  return { ok: true, zprava: zpravaZRadku(data) }
}

/**
 * Smazání je měkké: text se přepíše a doplní čas smazání. Druhá strana
 * má vidět, že tu zpráva byla — jinak by z rozhovoru beze stopy zmizel
 * kus a nedalo by se pochopit, na co navazuje odpověď.
 */
export const smazatZpravu = async (id: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { error } = await supabase
    .from('messages')
    .update({ body: 'Zpráva smazána', deleted_at: new Date().toISOString() })
    .eq('id', id)

  return error ? chyba(error) : { ok: true }
}

export const oznacitPrecteno = async (chatId: string): Promise<void> => {
  if (!supabase) return

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return

  await supabase
    .from('chat_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .eq('user_id', ja)
}

/**
 * Živé doručování. Vrací funkci, kterou se odběr zruší — bez jejího
 * zavolání by po odchodu z chatu zůstal viset otevřený kanál.
 */
// Pořadové číslo kanálu.
//
// Supabase vrací pro stejné jméno tentýž kanál. Když si o odběr řeknou
// dvě části aplikace naráz (schránka na pozadí a otevřený Social), druhá
// dostane kanál, který už běží, a pokus přidat k němu posluchač skončí
// výjimkou — ta shodí celé vykreslení a zůstane prázdná obrazovka.
// Každý odběr proto dostane vlastní jméno.
let poradiKanalu = 0

export const sledovatChat = (chatId: string, prisla: (z: Zprava) => void): (() => void) => {
  // Do místní proměnné, aby si TypeScript udržel jistotu i uvnitř
  // funkce, která se zavolá až později
  const klient = supabase
  if (!klient) return () => {}

  const kanal = klient
    .channel(`chat:${chatId}:${++poradiKanalu}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (payload) => {
        const radek = payload.new as Parameters<typeof zpravaZRadku>[0] | null
        if (radek?.id) prisla(zpravaZRadku(radek))
      }
    )
    .subscribe()

  return () => {
    void klient.removeChannel(kanal)
  }
}

// ---------- nahlášení ----------

export const nahlasit = async (
  kohoId: string,
  duvod: DuvodNahlaseni,
  poznamka: string,
  zpravaId?: string
): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  const { error } = await supabase.from('reports').insert({
    reporter_id: ja,
    target_user_id: kohoId,
    message_id: zpravaId ?? null,
    reason: duvod,
    note: poznamka.trim() || null,
  })

  return error ? chyba(error) : { ok: true }
}

// ==========================================
// Moderace
//
// Kdo je moderátor, rozhoduje databáze (tabulka user_roles, do které
// zvenčí nikdo nezapíše). Aplikace se jen ptá — kdyby si někdo přepsal
// stav v prohlížeči, pravidla ho stejně k cizím hlášením nepustí.
// ==========================================

export const jsemModerator = async (): Promise<boolean> => {
  if (!supabase) return false

  const { data, error } = await supabase.rpc('jsem_moderator')
  return !error && data === true
}

const DUVOD_POPIS: Record<string, string> = {
  spam: 'Spam nebo reklama',
  obtezovani: 'Obtěžování',
  nevhodny_obsah: 'Nevhodný obsah',
  jine: 'Jiné',
}

export const popisDuvodu = (duvod: string): string => DUVOD_POPIS[duvod] ?? duvod

/**
 * Načte hlášení. Moderátor dostane všechna, běžný uživatel jen svoje —
 * rozhoduje o tom pravidlo v databázi, ne tenhle dotaz.
 */
export const nactiHlaseni = async (): Promise<Hlaseni[]> => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('reports')
    .select('id, reporter_id, target_user_id, message_id, reason, note, created_at, resolved_at, resolution')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error || !data) return []

  const profily = await nactiProfily(
    data.flatMap((r) => [r.reporter_id, r.target_user_id])
  )

  // Texty nahlášených zpráv jedním dotazem, ne jedním na hlášení
  const zpravyIds = data.map((r) => r.message_id).filter((id): id is string => id !== null)
  const texty = new Map<string, string>()

  if (zpravyIds.length > 0) {
    const { data: zpravy } = await supabase
      .from('messages')
      .select('id, body, deleted_at')
      .in('id', zpravyIds)

    for (const z of zpravy ?? []) {
      texty.set(z.id, z.deleted_at ? '(zpráva byla smazána)' : z.body)
    }
  }

  return data.map((r) => ({
    id: r.id,
    duvod: r.reason as DuvodNahlaseni,
    poznamka: r.note,
    createdAt: r.created_at,
    hlasil: profily.get(r.reporter_id) ?? null,
    nahlaseny: profily.get(r.target_user_id) ?? null,
    zprava: r.message_id ? texty.get(r.message_id) ?? '(zpráva už neexistuje)' : null,
    zpravaId: r.message_id,
    stav: r.resolved_at === null ? 'nevyrizeno' : (r.resolution as StavHlaseni) ?? 'vyreseno',
    vyrizenoAt: r.resolved_at,
  }))
}

export const vyriditHlaseni = async (
  id: string,
  vysledek: 'vyreseno' | 'zamitnuto'
): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  const { error } = await supabase
    .from('reports')
    .update({ resolved_at: new Date().toISOString(), resolved_by: ja, resolution: vysledek })
    .eq('id', id)

  return error ? chyba(error) : { ok: true }
}

// ==========================================
// Živé doručování napříč všemi chaty
//
// Odběr uvnitř otevřeného rozhovoru nestačí: kdo je jinde v aplikaci,
// se o nové zprávě nedozví. Tenhle odběr běží po celou dobu, co je
// uživatel přihlášený.
//
// Filtr na konkrétní chat se schválně nenastavuje. Realtime v Supabase
// uplatňuje stejná pravidla jako běžné čtení, takže se ke klientovi
// dostanou jen zprávy z chatů, kterých je členem — a jen ty, které smí
// vidět (blokovaní se nepočítají).
// ==========================================

/**
 * Živé žádosti o přátelství.
 *
 * Bez tohohle se příchozí žádost objevila až po ručním znovuotevření
 * Socialu — druhé zařízení do té doby ukazovalo prázdný seznam a vypadalo
 * to, že se žádost neodeslala. Odběr nic nefiltruje: Realtime pouští jen
 * řádky, které dotyčný smí přečíst i normálně, a to jsou právě jeho dvojice.
 */
export const sledovatVazby = (zmena: () => void): (() => void) => {
  const klient = supabase
  if (!klient) return () => {}

  const kanal = klient
    .channel(`moje-vazby:${++poradiKanalu}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => zmena())
    .subscribe()

  return () => {
    void klient.removeChannel(kanal)
  }
}

export const sledovatVsechnyZpravy = (prisla: (z: Zprava) => void): (() => void) => {
  const klient = supabase
  if (!klient) return () => {}

  const kanal = klient
    .channel(`moje-zpravy:${++poradiKanalu}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const radek = payload.new as Parameters<typeof zpravaZRadku>[0] | null
        if (radek?.id) prisla(zpravaZRadku(radek))
      }
    )
    .subscribe()

  return () => {
    void klient.removeChannel(kanal)
  }
}

// ==========================================
// Kdo je v chatu právě teď a kdo píše.
//
// Schválně bez globálního "kdo je online" kanálu — to by ukazovalo
// online tečku i lidem, které jsi třeba jen jednou odmítl, protože
// jednou viděli tvoje id. Přítomnost se drží jen uvnitř konkrétního
// chatu: vidí ji jen ten, s kým už chat sdílíš, přes stejnou hranici
// (id chatu), jakou už dodržuje živé doručování zpráv.
//
// Presence i psaní jedou na jednom kanálu — obojí platí jen pro lidi,
// co mají tenhle chat zrovna otevřený, není důvod pro dva kanály.
// ==========================================

export const sledovatPritomnost = (
  chatId: string,
  mujId: string,
  zmenaOnline: (onlineIds: string[]) => void,
  prislaPsani: (kdoId: string) => void
): { zrusit: () => void; oznamPsani: () => void } => {
  const klient = supabase
  if (!klient) return { zrusit: () => {}, oznamPsani: () => {} }

  const kanal = klient.channel(`chat-pritomnost:${chatId}:${++poradiKanalu}`, {
    config: { presence: { key: mujId } },
  })

  kanal
    .on('presence', { event: 'sync' }, () => {
      const stav = kanal.presenceState()
      zmenaOnline(Object.keys(stav).filter((id) => id !== mujId))
    })
    .on('broadcast', { event: 'psani' }, (payload) => {
      const kdoId = (payload.payload as { userId?: string } | undefined)?.userId
      if (kdoId && kdoId !== mujId) prislaPsani(kdoId)
    })
    .subscribe((status) => {
      // track() jde zavolat, až kanál doopravdy naváže spojení — dřív
      // by tichá selhala, přítomnost by se nikdy neprojevila.
      if (status === 'SUBSCRIBED') void kanal.track({ online_at: new Date().toISOString() })
    })

  return {
    zrusit: () => void klient.removeChannel(kanal),
    oznamPsani: () => void kanal.send({ type: 'broadcast', event: 'psani', payload: { userId: mujId } }),
  }
}
