import { supabase } from '@/core/supabase/client'
import { fileToResizedBlob } from '@/utils/image'
import type {
  Chat,
  NalezVysledek,
  DuvodNahlaseni,
  Hlaseni,
  PratelskyNavrh,
  Prispevek,
  Reakce,
  StavHlaseni,
  MujProfil,
  Pritel,
  SocialProfil,
  Story,
  StorySkupina,
  StoryZhlednuti,
  TajnaZprava,
  TajnyChat,
  VerejnyProfil,
  Vysledek,
  VztahSledovani,
  Zadost,
  Zprava,
} from './types'
import { VYCHOZI_POPISEK_MEDIA } from './types'

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
  displayName: r.display_name?.trim() || 'Uživatel',
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

/**
 * Žádosti o sledování, které čekají na schválení — jen u soukromého
 * cíle (viz Sledování níž), veřejné sledování se rovnou stane 'prijato'
 * a sem se vůbec nedostane. Plain čtení `follows` stačí: RLS pustí obě
 * strany vztahu, appka jen rozliší směr podle toho, kdo je `follower_id`.
 */
export const nactiZadosti = async (): Promise<Zadost[]> => {
  if (!supabase) return []

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return []

  const { data, error } = await supabase
    .from('follows')
    .select('follower_id, following_id, created_at')
    .eq('stav', 'cekajici')

  if (error || !data) return []

  const protejskyIds = data.map((r) => (r.follower_id === ja ? r.following_id : r.follower_id))
  const profily = await nactiProfily(protejskyIds)

  return data
    .map((r) => {
      const protejsekId = r.follower_id === ja ? r.following_id : r.follower_id
      const profil = profily.get(protejsekId)
      if (!profil) return null

      return {
        profil,
        smer: r.follower_id === ja ? ('odchozi' as const) : ('prichozi' as const),
        createdAt: r.created_at,
      }
    })
    .filter((z): z is Zadost => z !== null)
}

/** Schválení příchozí žádosti — přes funkci na databázi
 *  (schvalit_sledovani), ne přímý UPDATE: ten by šel zneužít ke změně
 *  follower_id/following_id, funkce si oboje ohlídá sama. */
export const schvalitZadost = async (odKoho: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { error } = await supabase.rpc('schvalit_sledovani', { sledujici: odKoho })
  return error ? chyba(error) : { ok: true }
}

/**
 * Odmítnutí příchozí žádosti i zrušení vlastní odchozí — obojí je
 * "smaž vztah k téhle osobě, ať je v jakémkoli stavu", jen z jiné
 * strany dvojice. RLS na `follows` to hlídá dvěma politikami zvlášť
 * (follower ruší vlastní řádek, cíl odebírá/odmítá ten druhý), appka
 * to řeší jedním dotazem přes `.or()`.
 */
export const zrusitVazbu = async (druhaStrana: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  const { error } = await supabase
    .from('follows')
    .delete()
    .or(
      `and(follower_id.eq.${ja},following_id.eq.${druhaStrana}),` +
        `and(follower_id.eq.${druhaStrana},following_id.eq.${ja})`
    )

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

/**
 * Cizí profil k zobrazení v dialogu (VerejnyProfilDialog.tsx) — jde přes
 * řízenou funkci (precti_verejny_profil), ne přímé čtení profiles: to by
 * pokrylo přátele a spoluúčastníky chatu (viz jeho RLS politika), ale ne
 * někoho z výsledků hledání, se kterým ještě žádný vztah neexistuje.
 * Stejná funkce se použije ze všech tří vstupních bodů, ne dvě různé
 * cesty podle toho, odkud se profil otevřel.
 */
export const nactiVerejnyProfil = async (id: string): Promise<VerejnyProfil | null> => {
  if (!supabase) return null

  const { data, error } = await supabase.rpc('precti_verejny_profil', { cil: id })
  if (error || !data || data.length === 0) return null

  const r = data[0]
  return {
    id,
    displayName: r.display_name?.trim() || 'Uživatel',
    avatarUrl: r.avatar_url,
    xp: r.xp,
    level: r.level,
    streakDays: r.streak_days,
    roleId: r.role,
    motto: r.motto?.trim() ?? '',
    bannerUrl: r.banner_url,
    bio: r.bio?.trim() ?? '',
    frameId: r.frame_id,
    pinnedBadges: r.pinned_badges ?? [],
    soukromy: r.soukromy,
  }
}

/** Počet společných přátel s cílem — jen číslo, appka schválně nikdy
 *  neukazuje seznam cizích přátelství (viz komentář u pocet_spolecnych_pratel
 *  v migraci). */
export const nactiPocetSpolecnychPratel = async (cilId: string): Promise<number> => {
  if (!supabase) return 0

  const { data, error } = await supabase.rpc('pocet_spolecnych_pratel', { cil: cilId })
  return error || typeof data !== 'number' ? 0 : data
}

/**
 * Návrhy nových přátel podle společných přátel — capped na 8 na
 * databázi (navrhy_pratel()), appka to číslo nijak nenavyšuje.
 */
export const nactiNavrhyPratel = async (): Promise<PratelskyNavrh[]> => {
  if (!supabase) return []

  const { data, error } = await supabase.rpc('navrhy_pratel')
  if (error || !data) return []

  return (data as { id: string; display_name: string; avatar_url: string | null; spolecni: number }[]).map(
    (r) => ({
      id: r.id,
      displayName: r.display_name?.trim() || 'Uživatel',
      avatarUrl: r.avatar_url,
      spolecni: r.spolecni,
    })
  )
}

/** Vzájemné sledování (viz je_muj_pritel na databázi) — přes funkci
 *  (moji_pratele), ne přímé čtení `follows`: to by appka musela sama
 *  spárovat dva řádky na dvojici, funkce vrací rovnou hotový seznam. */
export const nactiPratele = async (): Promise<Pritel[]> => {
  if (!supabase) return []

  const { data, error } = await supabase.rpc('moji_pratele')
  if (error || !data) return []

  return (data as { id: string; display_name: string; avatar_url: string | null }[]).map((r) => ({
    profil: profilZRadku(r),
  }))
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

  // Blok a sledování vedle sebe nedávají smysl. Kdyby vazba zůstala
  // (v obou směrech — i ta, kterou má nad mnou zablokovaný jako
  // sledující), viděl by zablokovaný dál jméno i profil přes
  // je_muj_pritel/pending-žádost výjimku v RLS na profiles.
  await supabase
    .from('follows')
    .delete()
    .or(
      `and(follower_id.eq.${ja},following_id.eq.${kohoId}),` +
        `and(follower_id.eq.${kohoId},following_id.eq.${ja})`
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
    .select('chat_id, last_read_at, muted')
    .eq('user_id', ja)

  const chatIds = (clenstvi ?? []).map((c) => c.chat_id)
  if (chatIds.length === 0) return []

  const precteno = new Map((clenstvi ?? []).map((c) => [c.chat_id, c.last_read_at]))
  const ztlumeno = new Map((clenstvi ?? []).map((c) => [c.chat_id, c.muted]))

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
        mujMuted: ztlumeno.get(ch.id) ?? false,
      }
    })
    .sort((a, b) => (b.posledniCas ?? '').localeCompare(a.posledniCas ?? ''))
}

/** Ztlumí/zapne zpátky notifikace pro tenhle chat — jen na mém vlastním
 *  řádku v chat_members, stejná "jen svoje" UPDATE politika jako
 *  u last_read_at (viz oznacitPrecteno). Neopouští chat, jen umlčí
 *  schránku (inbox.ts) — historie a odznak přímo v ChatyPanel.tsx
 *  zůstávají beze změny. */
export const ztlumitChat = async (chatId: string, ztlumit: boolean): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  const { error } = await supabase
    .from('chat_members')
    .update({ muted: ztlumit })
    .eq('chat_id', chatId)
    .eq('user_id', ja)

  return error ? chyba(error) : { ok: true }
}

/**
 * Kdy naposled kdo z chatu četl — jednorázové načtení při otevření
 * chatu, doplněné živě přes sledovatPrectenost níž. Vrací last_read_at
 * úplně všech členů chatu, ne jen protějšku — u dvojice (1:1) z toho
 * ChatView.tsx čte jen tu jednu položku, u skupiny spočítá "přečteno
 * N z M" nad stejnými daty, žádný druhý dotaz.
 */
export const nactiPrectenost = async (chatId: string): Promise<Record<string, string>> => {
  if (!supabase) return {}

  const { data, error } = await supabase
    .from('chat_members')
    .select('user_id, last_read_at')
    .eq('chat_id', chatId)

  if (error || !data) return {}
  return Object.fromEntries(data.map((r) => [r.user_id, r.last_read_at]))
}

/** Živě sleduje last_read_at ostatních členů — "Přečteno" se tak objeví
 *  bez nutnosti chat zavřít a znovu otevřít. */
export const sledovatPrectenost = (
  chatId: string,
  zmena: (userId: string, lastReadAt: string) => void
): (() => void) => {
  const klient = supabase
  if (!klient) return () => {}

  const kanal = klient
    .channel(`chat-prectenost:${chatId}:${++poradiKanalu}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_members', filter: `chat_id=eq.${chatId}` },
      (payload) => {
        const r = payload.new as { user_id?: string; last_read_at?: string } | null
        if (r?.user_id && r.last_read_at) zmena(r.user_id, r.last_read_at)
      }
    )
    .subscribe()

  return () => void klient.removeChannel(kanal)
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
  reply_to_id?: string | null
  media_path?: string | null
  media_type?: string | null
  edited_at?: string | null
}): Zprava => ({
  id: r.id,
  chatId: r.chat_id,
  odesilatelId: r.sender_id,
  text: r.body,
  createdAt: r.created_at,
  smazanoAt: r.deleted_at,
  replyToId: r.reply_to_id ?? null,
  mediaPath: r.media_path ?? null,
  mediaType:
    r.media_type === 'image' || r.media_type === 'video' || r.media_type === 'audio'
      ? r.media_type
      : null,
  editedAt: r.edited_at ?? null,
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
    .select('id, chat_id, sender_id, body, created_at, deleted_at, reply_to_id, media_path, media_type, edited_at')
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
  text: string,
  replyToId?: string | null,
  medium?: { path: string; type: 'image' | 'video' | 'audio' } | null
): Promise<{ zprava: Zprava | null } & Vysledek> => {
  if (!supabase) return { ...NENI_CLOUD, zprava: null }

  const orezany = text.trim()
  // Prázdný text jde poslat jedině s médiem — pak je to popisek, ne
  // celá zpráva. Bez média platí stará podmínka beze změny.
  if (!medium && !orezany) return { ok: false, chyba: 'Prázdnou zprávu poslat nejde.', zprava: null }
  if (orezany.length > 4000) return { ok: false, chyba: 'Zpráva je moc dlouhá.', zprava: null }

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return { ...NENI_CLOUD, zprava: null }

  // messages.body má CHECK length(body) >= 1 — médium bez popisku
  // dostane čitelnou náhradu, ne prázdný řetězec, který by sloupec
  // stejně odmítl.
  const telo = orezany || (medium ? VYCHOZI_POPISEK_MEDIA[medium.type] : '')

  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: ja,
      body: telo,
      reply_to_id: replyToId ?? null,
      media_path: medium?.path ?? null,
      media_type: medium?.type ?? null,
    })
    .select('id, chat_id, sender_id, body, created_at, deleted_at, reply_to_id, media_path, media_type, edited_at')
    .single()

  if (error || !data) return { ...chyba(error), zprava: null }
  return { ok: true, zprava: zpravaZRadku(data) }
}

/**
 * Upraví text vlastní zprávy — RLS ("upravit vlastní zprávu", viz
 * migrace pridej_editaci_zpravy) pustí update jen odesílateli. Appka
 * nedrží historii předchozích verzí, jen aktuální text + `edited_at`
 * (appka podle něj vedle zprávy ukáže "(upraveno)") — stejná
 * jednoduchost jako smazání beze stopy po předchozím obsahu.
 *
 * `mediaType` je jen pro médium bez vlastního popisku (stejný důvod
 * jako u poslatZpravu) — appka jinak nemá odkud vzít náhradní text,
 * kdyby uživatel při editaci smazal popisek úplně.
 */
export const upravitZpravu = async (
  id: string,
  novyText: string,
  mediaType?: 'image' | 'video' | 'audio' | null
): Promise<{ zprava: Zprava | null } & Vysledek> => {
  if (!supabase) return { ...NENI_CLOUD, zprava: null }

  const orezany = novyText.trim()
  if (!mediaType && !orezany) return { ok: false, chyba: 'Prázdnou zprávu poslat nejde.', zprava: null }
  if (orezany.length > 4000) return { ok: false, chyba: 'Zpráva je moc dlouhá.', zprava: null }

  const telo = orezany || (mediaType ? VYCHOZI_POPISEK_MEDIA[mediaType] : '')

  const { data, error } = await supabase
    .from('messages')
    .update({ body: telo, edited_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, chat_id, sender_id, body, created_at, deleted_at, reply_to_id, media_path, media_type, edited_at')
    .single()

  if (error || !data) return { ...chyba(error), zprava: null }
  return { ok: true, zprava: zpravaZRadku(data) }
}

// Bucket 'chat-media' je privátní (na rozdíl od 'avatary') — chat je
// soukromý mezi svými členy, ne veřejný jako profilová fotka. Appka
// proto nikdy neukládá plnou URL, jen cestu (media_path výš); k zobrazení
// slouží ziskejUrlMedia() níž, RLS na storage.objects (migrace
// pridej_media_zpravy_v_chatu) žádost o podepsaný odkaz stejně pustí
// jen členovi daného chatu.
const CHAT_MEDIA_BUCKET = 'chat-media'
// Shodné s file_size_limit bucketu — kontrola na klientovi jen ušetří
// uživateli čekání na upload, který by server stejně odmítl. Platí i pro
// hlasovky (výrazně menší v praxi, ale appka jim nedává zvláštní, nižší
// limit — jeden strop je jednodušší než dva).
const MAX_VIDEO_BYTES = 25 * 1024 * 1024

export interface NahraneMedium {
  path: string
  type: 'image' | 'video' | 'audio'
}

/** Nahraje vybraný soubor (nebo z ChatView.tsx's nahrávání hlasu
 *  poskládaný Blob zabalený do File) do složky daného chatu. Obrázek se
 *  předtím zmenší (stejná cesta jako avatar/banner v avatarStorage.ts) —
 *  video a hlasovku appka zmenšit nedokáže, jen ohlídá limit velikosti. */
export const nahratChatMedium = async (chatId: string, file: File): Promise<NahraneMedium | null> => {
  if (!supabase) return null

  const jeObrazek = file.type.startsWith('image/')
  const jeVideo = file.type.startsWith('video/')
  const jeAudio = file.type.startsWith('audio/')
  if (!jeObrazek && !jeVideo && !jeAudio) return null
  if ((jeVideo || jeAudio) && file.size > MAX_VIDEO_BYTES) return null

  try {
    const blob: Blob = jeObrazek ? await fileToResizedBlob(file, 1600, 0.85) : file
    const vychoziPripona = jeAudio ? 'webm' : 'mp4'
    const pripona = jeObrazek ? 'jpg' : file.name.split('.').pop() || vychoziPripona
    const cesta = `${chatId}/${crypto.randomUUID()}.${pripona}`
    const typ: NahraneMedium['type'] = jeObrazek ? 'image' : jeAudio ? 'audio' : 'video'

    const { error } = await supabase.storage
      .from(CHAT_MEDIA_BUCKET)
      .upload(cesta, blob, { contentType: jeObrazek ? 'image/jpeg' : file.type || 'video/mp4' })
    if (error) throw error

    return { path: cesta, type: typ }
  } catch {
    return null
  }
}

// Podepsané URL mají omezenou platnost (1 h) — appka si je nevyžádá
// znovu při každém vykreslení, jen drží krátkou paměťovou cache podle
// cesty, ať scrollování historií nezpůsobí zbytečnou dávku dotazů na
// Storage. Modulová proměnná záměrně — sdílená napříč všemi otevřenými
// bublinami, ne znovu vytvářená v každé komponentě. Klíč cache je
// "bucket/cesta", ne jen cesta — od Stories přibyl druhý privátní bucket
// (viz níž) a bez bucketu v klíči by dvě různé věci se stejným řetězcem
// cesty (nepravděpodobné, ale ne nemožné — obě cesty začínají uuid)
// sdílely jeden záznam v cache.
const mediaUrlCache = new Map<string, { url: string; platnaDo: number }>()
const PODEPSANE_URL_PLATNOST_S = 3600

const ziskejPodepsanouUrl = async (bucket: string, path: string): Promise<string | null> => {
  if (!supabase) return null

  const ted = Date.now()
  const klic = `${bucket}/${path}`
  const zCache = mediaUrlCache.get(klic)
  if (zCache && zCache.platnaDo > ted) return zCache.url

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, PODEPSANE_URL_PLATNOST_S)
  // Kontrola i na skutečný obsah signedUrl, ne jen na to, že `data`
  // je pravdivé — bez ní by prázdná/neúplná odpověď (žádná chyba, ale
  // taky žádný použitelný odkaz) prošla jako úspěch a appka by pak
  // vykreslila <img>/<video> s nesmyslným src místo hlášky o chybě.
  if (error || !data?.signedUrl) return null

  // O minutu dřív než skutečné vypršení, ať appka nikdy nenabídne odkaz,
  // který server mezitím stihl odmítnout jako prošlý.
  mediaUrlCache.set(klic, {
    url: data.signedUrl,
    platnaDo: ted + (PODEPSANE_URL_PLATNOST_S - 60) * 1000,
  })
  return data.signedUrl
}

/** Vyžádá krátkodobě platný odkaz na médium v chatu — appka ho nikdy
 *  neukládá natrvalo, jen si ho drží pár minut v paměti pro rychlé
 *  znovupoužití. */
export const ziskejUrlMedia = (path: string): Promise<string | null> =>
  ziskejPodepsanouUrl(CHAT_MEDIA_BUCKET, path)

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

// ---------- reakce na zprávy ----------

const reakceZRadku = (r: { id: string; message_id: string; user_id: string; emoji: string }): Reakce => ({
  id: r.id,
  messageId: r.message_id,
  userId: r.user_id,
  emoji: r.emoji,
})

/** Načte všechny reakce celého chatu naráz, ne po jedné za zprávu —
 *  chat_id je na message_reactions schválně denormalizovaný (viz
 *  migrace), díky čemu stačí jeden dotaz při otevření chatu. */
export const nactiReakce = async (chatId: string): Promise<Reakce[]> => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('message_reactions')
    .select('id, message_id, user_id, emoji')
    .eq('chat_id', chatId)

  if (error || !data) return []
  return data.map(reakceZRadku)
}

/**
 * Přidá reakci. Unikátní (message_id, user_id, emoji) na databázi
 * znamená, že druhé klepnutí na stejné emoji vrátí 23505 (porušení
 * unikátnosti), ne skutečnou chybu — appka to bere jako no-op úspěch,
 * ne jako "nepovedlo se to".
 */
export const pridatReakci = async (
  messageId: string,
  emoji: string
): Promise<{ reakce: Reakce | null } & Vysledek> => {
  if (!supabase) return { ...NENI_CLOUD, reakce: null }

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return { ...NENI_CLOUD, reakce: null }

  const { data, error } = await supabase
    .from('message_reactions')
    .insert({ message_id: messageId, user_id: ja, emoji })
    .select('id, message_id, user_id, emoji')
    .single()

  if (!error && data) return { ok: true, reakce: reakceZRadku(data) }
  if ((error as { code?: string } | null)?.code === '23505') return { ok: true, reakce: null }
  return { ...chyba(error), reakce: null }
}

/** Odebere vlastní reakci — id v databázi zná až po vložení (viz výš),
 *  takže se maže podle trojice sloupců, na kterou je i unikátní index. */
export const odebratReakci = async (messageId: string, emoji: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  const { error } = await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', ja)
    .eq('emoji', emoji)

  return error ? chyba(error) : { ok: true }
}

/** Živé doručování reakcí — INSERT i DELETE, filtrované na chat přes
 *  denormalizovaný chat_id (viz migrace). */
export const sledovatReakce = (
  chatId: string,
  pridana: (r: Reakce) => void,
  smazana: (id: string) => void
): (() => void) => {
  const klient = supabase
  if (!klient) return () => {}

  const kanal = klient
    .channel(`chat-reakce:${chatId}:${++poradiKanalu}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'message_reactions', filter: `chat_id=eq.${chatId}` },
      (payload) => {
        const r = payload.new as Parameters<typeof reakceZRadku>[0] | null
        if (r?.id) pridana(reakceZRadku(r))
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'message_reactions', filter: `chat_id=eq.${chatId}` },
      (payload) => {
        // REPLICA IDENTITY DEFAULT: DELETE posílá v "old" jen primární
        // klíč smazané řádky, ne celou řádku — proto se maže podle id,
        // ne podle trojice message_id/user_id/emoji (viz Reakce v types.ts).
        const stara = payload.old as { id?: string } | null
        if (stara?.id) smazana(stara.id)
      }
    )
    .subscribe()

  return () => void klient.removeChannel(kanal)
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
  nevhodne_foto: 'Nevhodná profilová fotka',
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
 * Živé sledování — nová/schválená/zrušená vazba (přítel, nebo jen
 * žádost čekající na schválení u soukromého účtu).
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, () => zmena())
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
// Schválně bez globálního "kdo je online" Realtime Presence kanálu —
// to by ukazovalo online tečku i lidem, které jsi třeba jen jednou
// odmítl, protože jednou viděli tvoje id. Přítomnost se drží jen
// uvnitř konkrétního chatu: vidí ji jen ten, s kým už chat sdílíš,
// přes stejnou hranici (id chatu), jakou už dodržuje živé doručování
// zpráv. (Appka od téhle chvíle má i druhý, samostatný druh
// "online" — appka-wide, ale jen mezi přáteli, viz sekce Přítomnost
// mezi přáteli níž; ta záměrně nejde přes tenhle Presence kanál ani
// ho nenahrazuje, řeší jinou otázku — "má appku vůbec otevřenou", ne
// "má otevřený zrovna tenhle chat".)
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

// ==========================================
// Přítomnost mezi přáteli — appka-wide "má appku otevřenou vůbec",
// ne "má otevřený zrovna tenhle chat" (to řeší sledovatPritomnost
// výš). Schválně jen mezi přáteli, ne globální kanál pro kohokoli —
// stejná zdrženlivost, jen tentokrát rozšířená na "přátelům ano",
// ne "nikomu", protože appka to takhle explicitně chtěla. Plain
// tabulka (`presence`) s `last_seen_at`, ne skutečný Realtime
// Presence kanál — appka "online" odvozuje na klientovi z toho, jak
// čerstvý je poslední záznam (viz JE_ONLINE_PRAH_MS v presence.ts),
// stejná "absolutní čas, ne countdown" logika jako Pomodoro/
// registerSW.ts jinde v týhle appce.
// ==========================================

/** Zapíše "jsem tu" — volá ho jen presence.ts's heartbeat, appka jinde
 *  přítomnost nezapisuje. Upsert, ne insert: appka vlastní řádek má
 *  nejvýš jeden na účet, druhé volání jen posune čas. */
export const zaznamenejPritomnost = async (): Promise<void> => {
  if (!supabase) return

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return

  await supabase
    .from('presence')
    .upsert({ user_id: ja, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id' })
}

/** Poslední známá přítomnost všech přátel najednou — RLS na `presence`
 *  stejně vrátí jen ty, se kterými je appka doopravdy přátelská a kdo
 *  ji neblokuje, takže appka se tu neptá na přátelství znovu. */
export const nactiPritomnostPratel = async (): Promise<Map<string, string>> => {
  const mapa = new Map<string, string>()
  if (!supabase) return mapa

  const { data, error } = await supabase.from('presence').select('user_id, last_seen_at')
  if (error || !data) return mapa

  for (const r of data) mapa.set(r.user_id as string, r.last_seen_at as string)
  return mapa
}

/** Živé změny přítomnosti — nový záznam i posunutý čas dorazí stejnou
 *  cestou (INSERT i UPDATE), appka je nerozlišuje, jen si přepíše
 *  poslední známý čas pro daného uživatele. Bez filtru schválně:
 *  Realtime uplatňuje stejná pravidla jako běžné čtení (viz SELECT
 *  politika na presence), takže sem dorazí jen přátelé. */
export const sledovatPritomnostPratel = (zmena: (userId: string, lastSeenAt: string) => void): (() => void) => {
  const klient = supabase
  if (!klient) return () => {}

  const kanal = klient
    .channel(`pratelska-pritomnost:${++poradiKanalu}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, (payload) => {
      const radek = payload.new as { user_id?: string; last_seen_at?: string } | null
      if (radek?.user_id && radek.last_seen_at) zmena(radek.user_id, radek.last_seen_at)
    })
    .subscribe()

  return () => {
    void klient.removeChannel(kanal)
  }
}

// ==========================================
// Tajný chat
//
// Jen pro VIP/moderátory/admina navzájem, mizící zprávy, bez
// moderátorského dohledu (na rozdíl od Hlášení výš je vidí jen admin).
// Založení i odeslání jde přes SECURITY DEFINER funkce v databázi
// (zaloz_tajny_chat/potvrd_tajny_chat/posli_tajnou_zpravu) — ne přes
// plain insert jako u messages/support_zpravy, protože ověření "má
// tenhle účet pořád VIP/moderátora/admina" nejde bezpečně schovat do
// RLS WITH CHECK bez grantnutí pomocné funkce, kterou by pak šlo volat
// napřímo a zjišťovat roli kohokoli (viz komentář u ma_pravo_na_tajny_
// chat v migraci). Tenhle soubor jen volá RPC a mapuje výsledek — kdo
// smí co, rozhoduje výhradně databáze, tlačítko v UI je jen pohodlí.
// ==========================================

/**
 * Založí (nebo najde už existující) tajný chat s cílem — druhá strana
 * ho musí potvrdit přes potvrdTajnyChat, než se dá do něj psát. Cíl se
 * hledá stejně jako dřív přátelství přes kód (najdiPodleKodu) — tady se
 * to konečně hodí, jak bylo od začátku plánováno.
 */
export const zalozTajnyChat = async (cilId: string): Promise<{ chatId: string | null } & Vysledek> => {
  if (!supabase) return { ...NENI_CLOUD, chatId: null }

  const { data, error } = await supabase.rpc('zaloz_tajny_chat', { cil: cilId })
  if (error || !data) return { ...chyba(error), chatId: null }

  return { ok: true, chatId: data as string }
}

export const potvrdTajnyChat = async (chatId: string, prijmout: boolean): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { error } = await supabase.rpc('potvrd_tajny_chat', {
    p_chat_id: chatId,
    p_prijmout: prijmout,
  })

  return error ? chyba(error) : { ok: true }
}

/**
 * Vlastní tajné chaty — čekající pozvánky (odeslané i přijaté) i aktivní.
 * Na rozdíl od nactiChaty() žádné stránkování ani poslední zpráva v
 * náhledu — mizící obsah se do náhledu v seznamu záměrně nedává, ať se
 * text zprávy neobjeví o víc míst, než je nutné.
 */
export const nactiTajneChaty = async (): Promise<TajnyChat[]> => {
  if (!supabase) return []

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return []

  const { data, error } = await supabase
    .from('tajne_chaty')
    .select('id, ucastnik_a, ucastnik_b, zalozil, stav, created_at, expirace_sekund')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  const druheIdy = data.map((r) => (r.ucastnik_a === ja ? r.ucastnik_b : r.ucastnik_a))
  const profily = await nactiProfily(druheIdy)

  return data
    .map((r) => {
      const druheId = r.ucastnik_a === ja ? r.ucastnik_b : r.ucastnik_a
      const druhy = profily.get(druheId)
      if (!druhy) return null

      return {
        id: r.id,
        druhy,
        zalozilJa: r.zalozil === ja,
        stav: r.stav as TajnyChat['stav'],
        createdAt: r.created_at,
        expiraceSekund: r.expirace_sekund,
      }
    })
    .filter((c): c is TajnyChat => c !== null)
}

/** Kdo smí kdy sáhnout na chat, hlídá zaloz_tajny_chat/potvrd_tajny_chat
 *  (viz migrace); tohle je jen řízené volání téhle jedné funkce. */
export const nastavExpiraciTajnehoChatu = async (chatId: string, sekund: number): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { error } = await supabase.rpc('nastav_expiraci_tajneho_chatu', {
    p_chat_id: chatId,
    p_sekund: sekund,
  })

  return error ? chyba(error) : { ok: true }
}

const tajnaZpravaZRadku = (r: {
  id: string
  chat_id: string
  odesilatel: string
  text: string
  iv: string
  created_at: string
}): TajnaZprava => ({
  id: r.id,
  chatId: r.chat_id,
  odesilatelId: r.odesilatel,
  cifra: r.text,
  iv: r.iv,
  createdAt: r.created_at,
})

/** Bez stránkování — mizící obsah se nehromadí do stovek zpráv jako
 *  běžný chat, malý jednorázový select stačí. Vrací šifru (viz
 *  TajnaZprava v types.ts) — dešifruje ji až volající, který zná klíč
 *  konkrétního chatu (TajnyChatView.tsx). */
export const nactiTajneZpravy = async (chatId: string): Promise<TajnaZprava[]> => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('tajne_zpravy')
    .select('id, chat_id, odesilatel, text, iv, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data.map(tajnaZpravaZRadku)
}

/** `cifra`/`iv` musí být už zašifrované na volající straně
 *  (tajnyChatCrypto.ts) — api.ts sám nešifruje ani nedešifruje nic,
 *  jen přenáší, co dostal. */
export const posliTajnouZpravu = async (
  chatId: string,
  cifra: string,
  iv: string
): Promise<{ zprava: TajnaZprava | null } & Vysledek> => {
  if (!supabase) return { ...NENI_CLOUD, zprava: null }
  if (!cifra || !iv) return { ok: false, chyba: 'Prázdnou zprávu poslat nejde.', zprava: null }

  const { data, error } = await supabase.rpc('posli_tajnou_zpravu', {
    p_chat_id: chatId,
    p_text: cifra,
    p_iv: iv,
  })

  if (error || !data) return { ...chyba(error), zprava: null }
  return { ok: true, zprava: tajnaZpravaZRadku(data) }
}

// ---------- E2E klíče ----------
//
// Veřejné klíče jen — soukromý nikdy neopustí zařízení (viz
// tajnyChatCrypto.ts). Nahrání je plain upsert (RLS pouští jen zápis
// vlastního user_id, žádné riziko zneužití cizí identity), čtení jde
// přes stejnou tabulku chráněnou RLS, co pustí jen účastníka společného
// tajného chatu — viz migrace tajny_chat_e2e_a_casovac.

export const nahrajVerejnyKlic = async (base64: string): Promise<void> => {
  if (!supabase) return

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return

  await supabase
    .from('tajne_klice')
    .upsert({ user_id: ja, verejny_klic: base64 }, { onConflict: 'user_id' })
}

export const nactiVerejnyKlic = async (userId: string): Promise<string | null> => {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('tajne_klice')
    .select('verejny_klic')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return data.verejny_klic
}

/** Líné mazání expirovaných zpráv — volá se příležitostně (otevření
 *  panelu, odeslání zprávy). Chyba se schválně ignoruje: SELECT politika
 *  expirované skryje i bez fyzického smazání, takže selhání úklidu nikdy
 *  neprozradí něco, co by se jinak neukázalo. */
export const vycistiExpirovaneTajneZpravy = async (): Promise<void> => {
  if (!supabase) return
  await supabase.rpc('smaz_expirovane_tajne_zpravy')
}

export const sledovatTajneChaty = (zmena: () => void): (() => void) => {
  const klient = supabase
  if (!klient) return () => {}

  const kanal = klient
    .channel(`tajne-chaty:${++poradiKanalu}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tajne_chaty' }, () => zmena())
    .subscribe()

  return () => {
    void klient.removeChannel(kanal)
  }
}

export const sledovatTajnyChat = (
  chatId: string,
  prisla: (z: TajnaZprava) => void
): (() => void) => {
  const klient = supabase
  if (!klient) return () => {}

  const kanal = klient
    .channel(`tajny-chat:${chatId}:${++poradiKanalu}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'tajne_zpravy', filter: `chat_id=eq.${chatId}` },
      (payload) => {
        const radek = payload.new as Parameters<typeof tajnaZpravaZRadku>[0] | null
        if (radek?.id) prisla(tajnaZpravaZRadku(radek))
      }
    )
    .subscribe()

  return () => {
    void klient.removeChannel(kanal)
  }
}

/**
 * Živé doručování napříč všemi tajnými chaty najednou — obdoba
 * sledovatVsechnyZpravy pro messages, jen bez filtru na jeden chat.
 * Používá se pro systémovou notifikaci (useTajnyChat.ts), ne pro
 * zobrazení uvnitř otevřeného chatu (to řeší sledovatTajnyChat výš).
 * Bez filtru schválně — Realtime uplatňuje stejná pravidla jako běžné
 * čtení (viz SELECT politika na tajne_zpravy), takže sem dorazí jen
 * zprávy z chatů, kde je uživatel účastníkem.
 */
export const sledovatVsechnyTajneZpravy = (prisla: (z: TajnaZprava) => void): (() => void) => {
  const klient = supabase
  if (!klient) return () => {}

  const kanal = klient
    .channel(`vsechny-tajne-zpravy:${++poradiKanalu}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'tajne_zpravy' },
      (payload) => {
        const radek = payload.new as Parameters<typeof tajnaZpravaZRadku>[0] | null
        if (radek?.id) prisla(tajnaZpravaZRadku(radek))
      }
    )
    .subscribe()

  return () => {
    void klient.removeChannel(kanal)
  }
}

// ==========================================
// Sledování (follow) — od sjednocení jediný vztahový model appky (viz
// types.ts). U veřejného cíle appka rovnou vloží 'prijato', u
// soukromého ho databázový trigger (nastav_stav_sledovani) sám přepíše
// na 'cekajici' — appka stav sama nikdy neposílá, jen se dozví, co z
// toho vzniklo. Seznam sledujících/sledovaných appka nikdy nečte přímo
// (RLS na `follows` to ani nedovolí pro cizí dvojici) — jen svůj
// vlastní vztah k jednomu účtu a veřejné počty přes
// pocet_sledujicich()/pocet_sledovanych().
// ==========================================

export const sledovatUcet = async (cil: string): Promise<Vysledek & { stav?: 'cekajici' | 'prijato' }> => {
  if (!supabase) return NENI_CLOUD

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  const { data, error } = await supabase
    .from('follows')
    .insert({ follower_id: ja, following_id: cil })
    .select('stav')
    .single()

  // follows_no_self/unikátní primární klíč — dvojí klepnutí na "Sledovat"
  // narazí na kolizi (23505), ne na skutečnou chybu (stejné "no-op
  // úspěch" jako u pridatReakci/oznacitZhlednuti výš).
  if (error) {
    if ((error as { code?: string }).code === '23505') return { ok: true }
    return chyba(error)
  }
  return { ok: true, stav: data?.stav as 'cekajici' | 'prijato' | undefined }
}

export const prestatSledovatUcet = async (cil: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  const { error } = await supabase.from('follows').delete().eq('follower_id', ja).eq('following_id', cil)
  return error ? chyba(error) : { ok: true }
}

/**
 * Vztah k jednomu konkrétnímu účtu — "v jakém jsem k němu stavu?" plus
 * jeho veřejné počty (sledujících/sledovaných), vždycky pro cíl `cil`,
 * ne pro přihlášeného. `stavSledovani` čte přímo z `follows` (RLS
 * pustí vlastní řádek), počty jdou přes dvě SECURITY DEFINER funkce,
 * protože plain SELECT na `follows` cizí dvojice nevidí vůbec.
 */
export const nactiVztahSledovani = async (cil: string): Promise<VztahSledovani> => {
  const prazdny: VztahSledovani = { stavSledovani: 'nesleduje', sledujiciCelkem: 0, sledovaniCelkem: 0 }
  if (!supabase) return prazdny

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return prazdny

  const [vazba, sledujici, sledovani] = await Promise.all([
    supabase.from('follows').select('stav').eq('follower_id', ja).eq('following_id', cil).maybeSingle(),
    supabase.rpc('pocet_sledujicich', { cil }),
    supabase.rpc('pocet_sledovanych', { cil }),
  ])

  return {
    stavSledovani: (vazba.data?.stav as 'cekajici' | 'prijato' | undefined) ?? 'nesleduje',
    sledujiciCelkem: typeof sledujici.data === 'number' ? sledujici.data : 0,
    sledovaniCelkem: typeof sledovani.data === 'number' ? sledovani.data : 0,
  }
}

/**
 * Soukromý/veřejný účet — čte a zapisuje SettingsModule.tsx (řádek
 * "Soukromý účet"). Plain sloupec na vlastním řádku profiles, žádná
 * zvláštní funkce nepotřeba (stejné právo jako u jména/motta).
 */
export const nactiSoukromy = async (): Promise<boolean> => {
  if (!supabase) return false

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return false

  const { data } = await supabase.from('profiles').select('soukromy').eq('id', ja).maybeSingle()
  return data?.soukromy ?? false
}

export const nastavSoukromy = async (hodnota: boolean): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  const { error } = await supabase.from('profiles').update({ soukromy: hodnota }).eq('id', ja)
  return error ? chyba(error) : { ok: true }
}

// ==========================================
// Trvalé příspěvky na profilu (Posts | Videos) — na rozdíl od Stories
// nemizí, na rozdíl od chatového média patří profilu, ne chatu. Bucket
// 'posts' je veřejný jako 'avatary', takže appka na rozdíl od
// ziskejUrlMedia/ziskejUrlStory nikdy nežádá o podepsaný odkaz —
// getPublicUrl() je čistě lokální skládání řetězce, žádný síťový dotaz.
// ==========================================

const POSTS_BUCKET = 'posts'
const MAX_POST_VIDEO_BYTES = 25 * 1024 * 1024

const prispevekZRadku = (
  klient: NonNullable<typeof supabase>,
  r: {
    id: string
    user_id: string
    media_path: string
    media_type: 'image' | 'video'
    caption: string | null
    created_at: string
  }
): Prispevek => ({
  id: r.id,
  autorId: r.user_id,
  mediaPath: r.media_path,
  mediaUrl: klient.storage.from(POSTS_BUCKET).getPublicUrl(r.media_path).data.publicUrl,
  mediaType: r.media_type,
  caption: r.caption,
  createdAt: r.created_at,
})

/** Nahraje fotku/video do vlastní složky veřejného bucketu a založí
 *  řádek — stejné "jedno volání, žádný orphan-row hazard" zdůvodnění
 *  jako u pridatStory(): žádná druhá tabulka na příspěvek needukazuje. */
export const nahratPrispevek = async (file: File, caption?: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const jeObrazek = file.type.startsWith('image/')
  const jeVideo = file.type.startsWith('video/')
  if (!jeObrazek && !jeVideo) return { ok: false, chyba: 'Příspěvek může být jen fotka nebo video.' }
  if (jeVideo && file.size > MAX_POST_VIDEO_BYTES) return { ok: false, chyba: 'Video je moc velké.' }

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  try {
    const blob: Blob = jeObrazek ? await fileToResizedBlob(file, 1600, 0.85) : file
    const pripona = jeObrazek ? 'jpg' : file.name.split('.').pop() || 'mp4'
    const cesta = `${ja}/${crypto.randomUUID()}.${pripona}`

    const { error: chybaNahrani } = await supabase.storage
      .from(POSTS_BUCKET)
      .upload(cesta, blob, { contentType: jeObrazek ? 'image/jpeg' : file.type || 'video/mp4' })
    if (chybaNahrani) throw chybaNahrani

    const { error } = await supabase.from('posts').insert({
      user_id: ja,
      media_path: cesta,
      media_type: jeObrazek ? 'image' : 'video',
      caption: caption?.trim() || null,
    })
    if (error) throw error

    return { ok: true }
  } catch (e) {
    return chyba(e)
  }
}

/** Příspěvky jednoho účtu, nejnovější první — přes nacti_prispevky(),
 *  ne přímé čtení `posts` (žádná plain SELECT politika na tabulce
 *  neexistuje schválně, viz migrace pridej_prispevky). */
export const nactiPrispevky = async (cil: string): Promise<Prispevek[]> => {
  if (!supabase) return []

  const { data, error } = await supabase.rpc('nacti_prispevky', { cil })
  if (error || !data) return []

  const klient = supabase
  return (
    data as {
      id: string
      user_id: string
      media_path: string
      media_type: 'image' | 'video'
      caption: string | null
      created_at: string
    }[]
  ).map((r) => prispevekZRadku(klient, r))
}

export const smazatPrispevek = async (id: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { error } = await supabase.from('posts').delete().eq('id', id)
  return error ? chyba(error) : { ok: true }
}

// ==========================================
// Stories — 24hodinové příspěvky viditelné přátelům.
//
// Bucket 'stories' je privátní stejně jako 'chat-media', ne veřejný jako
// 'avatary' — story je adresovaná přátelům, ne komukoli s odkazem, takže
// appka zase nikdy neukládá plnou URL, jen cestu (Story.mediaPath),
// a odkaz si vyžádá až při zobrazení (ziskejUrlStory níž).
// ==========================================

const STORIES_BUCKET = 'stories'

const storyZRadku = (r: {
  id: string
  user_id: string
  media_path: string
  caption: string | null
  created_at: string
  expiruje_at: string
}): Story => ({
  id: r.id,
  autorId: r.user_id,
  mediaPath: r.media_path,
  caption: r.caption,
  createdAt: r.created_at,
  expiruje: r.expiruje_at,
})

/** Vyžádá krátkodobě platný odkaz na fotku story — stejná cache
 *  a stejné pravidlo jako u chatových médií (ziskejUrlMedia výš), jen
 *  jiný bucket. */
export const ziskejUrlStory = (path: string): Promise<string | null> =>
  ziskejPodepsanouUrl(STORIES_BUCKET, path)

/**
 * Nahraje fotku do vlastní složky privátního bucketu a založí řádek
 * v jednom volání — na rozdíl od chatového média tu není žádná zpráva,
 * ke které by se médium připojovalo, takže žádná druhá tabulka ani
 * orphan-row hazard, na který by bylo potřeba dávat pozor.
 */
export const pridatStory = async (file: File, caption?: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD
  if (!file.type.startsWith('image/')) return { ok: false, chyba: 'Story může být jen fotka.' }

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  try {
    const blob = await fileToResizedBlob(file, 1600, 0.85)
    const cesta = `${ja}/${crypto.randomUUID()}.jpg`

    const { error: chybaNahrani } = await supabase.storage
      .from(STORIES_BUCKET)
      .upload(cesta, blob, { contentType: 'image/jpeg' })
    if (chybaNahrani) throw chybaNahrani

    const oreznuty = caption?.trim().slice(0, 200) || null
    const { error } = await supabase.from('stories').insert({ user_id: ja, media_path: cesta, caption: oreznuty })
    if (error) throw error

    return { ok: true }
  } catch (e) {
    return chyba(e)
  }
}

/**
 * Vlastní i přátelské aktivní stories, seskupené po autorech pro pruh
 * v MujProfilPanel.tsx. RLS na `stories` už samo omezuje na "moje nebo
 * od přítele, co mě neblokuje a koho neblokuju já", takže appka se tu
 * neptá na přátelství znovu — jen se ptá, co jí databáze vůbec ukáže.
 *
 * Úklid prošlých řádků (smaz_expirovane_stories) se volá stejně
 * "na dobré slovo" jako u tajných zpráv — chyba appce nevadí, RLS
 * beztak skryje prošlou story hned, i kdyby fyzicky ještě existovala.
 */
export const nactiStories = async (): Promise<StorySkupina[]> => {
  if (!supabase) return []

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return []

  await supabase.rpc('smaz_expirovane_stories').then(
    () => {},
    () => {}
  )

  const { data, error } = await supabase
    .from('stories')
    .select('id, user_id, media_path, caption, created_at, expiruje_at')
    .order('created_at', { ascending: true })

  if (error || !data || data.length === 0) return []

  const ids = Array.from(new Set(data.map((r) => r.user_id)))
  const profily = await nactiProfily(ids)

  const { data: zhlednute } = await supabase
    .from('story_views')
    .select('story_id')
    .eq('viewer_id', ja)
    .in(
      'story_id',
      data.map((r) => r.id)
    )
  const zhledId = new Set((zhlednute ?? []).map((r) => r.story_id as string))

  const podleAutora = new Map<string, Story[]>()
  for (const r of data) {
    const seznam = podleAutora.get(r.user_id) ?? []
    seznam.push(storyZRadku(r))
    podleAutora.set(r.user_id, seznam)
  }

  const skupiny: StorySkupina[] = []
  for (const [autorId, stories] of podleAutora) {
    const autor = profily.get(autorId)
    if (!autor) continue
    skupiny.push({ autor, stories, vsechnyZhlednute: stories.every((s) => zhledId.has(s.id)) })
  }

  // Vlastní pruh vždycky první, ostatní podle nejnovějšího příspěvku —
  // stejné pořadí, jaké má "Váš příběh" v Instagramu/TikToku.
  skupiny.sort((a, b) => {
    if (a.autor.id === ja) return -1
    if (b.autor.id === ja) return 1
    return b.stories[b.stories.length - 1].createdAt.localeCompare(a.stories[a.stories.length - 1].createdAt)
  })

  return skupiny
}

/** Zaznamená zhlédnutí — druhé zhlédnutí stejné story tou samou osobou
 *  narazí na primární klíč (story_id, viewer_id), ne na skutečnou
 *  chybu (stejné "23505 = no-op úspěch" jako u pridatReakci výš). */
export const oznacitZhlednuti = async (storyId: string): Promise<void> => {
  if (!supabase) return

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return

  await supabase.from('story_views').insert({ story_id: storyId, viewer_id: ja })
}

/** Kdo si přečetl moji story — jen autor tohle podle RLS vůbec dostane
 *  (story_views SELECT politika), pro cizí story vrátí appka jen prázdno. */
export const nactiZhlednuti = async (storyId: string): Promise<StoryZhlednuti[]> => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('story_views')
    .select('viewer_id, zhlednuto_at')
    .eq('story_id', storyId)
    .order('zhlednuto_at', { ascending: false })

  if (error || !data || data.length === 0) return []

  const profily = await nactiProfily(data.map((r) => r.viewer_id))
  return data
    .map((r) => {
      const viewer = profily.get(r.viewer_id)
      return viewer ? { viewer, zhlednutoAt: r.zhlednuto_at } : null
    })
    .filter((z): z is StoryZhlednuti => z !== null)
}

/** Smazání je natvrdo, ne měkké jako u zpráv — story nemá odpovědi,
 *  na které by se něco odkazovalo, takže tu není co zachovávat jako
 *  kontext. RLS dovolí smazat jen vlastní (`user_id = auth.uid()`). */
export const smazatStory = async (id: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { error } = await supabase.from('stories').delete().eq('id', id)
  return error ? chyba(error) : { ok: true }
}

/**
 * Živé objevení nové story — obdoba sledovatVazby výš, jen nad tabulkou
 * stories. Bez filtru schválně: Realtime uplatňuje stejná pravidla jako
 * běžné čtení (viz SELECT politika na stories), takže sem dorazí jen
 * příspěvky, které by uživatel uviděl i obyčejným dotazem.
 */
export const sledovatStories = (zmena: () => void): (() => void) => {
  const klient = supabase
  if (!klient) return () => {}

  const kanal = klient
    .channel(`moje-stories:${++poradiKanalu}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => zmena())
    .subscribe()

  return () => {
    void klient.removeChannel(kanal)
  }
}
