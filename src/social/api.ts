import { supabase } from '@/core/supabase/client'
import type {
  Chat,
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

const chyba = (err: unknown): Vysledek => ({
  ok: false,
  chyba: err instanceof Error ? err.message : 'Nepovedlo se to.',
})

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

export const najdiPodleKodu = async (kod: string): Promise<SocialProfil | null> => {
  if (!supabase) return null

  const ocisteny = kod.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (ocisteny.length !== 8) return null

  // Hledání jde přes funkci v databázi, ne přes tabulku: běžné pravidlo
  // by muselo pustit čtení všech profilů a kdokoliv by si mohl stáhnout
  // seznam uživatelů.
  const { data, error } = await supabase.rpc('najdi_podle_kodu', { kod: ocisteny })
  if (error || !data || data.length === 0) return null

  return profilZRadku(data[0])
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
    supabase.from('chats').select('id, is_group, name').in('id', chatIds),
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
      }
    })
    .sort((a, b) => (b.posledniCas ?? '').localeCompare(a.posledniCas ?? ''))
}

/**
 * Chat s jedním člověkem. Když už spolu chat mají, vrátí ten stávající —
 * jinak by po každém otevření vznikl další a rozhovor by se roztříštil.
 */
export const otevritChatSPritelem = async (
  pritelId: string
): Promise<{ chatId: string | null } & Vysledek> => {
  if (!supabase) return { ...NENI_CLOUD, chatId: null }

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return { ...NENI_CLOUD, chatId: null }

  const { data: moje } = await supabase.from('chat_members').select('chat_id').eq('user_id', ja)
  const mojeIds = (moje ?? []).map((c) => c.chat_id)

  if (mojeIds.length > 0) {
    const { data: spolecne } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', pritelId)
      .in('chat_id', mojeIds)

    const kandidati = (spolecne ?? []).map((c) => c.chat_id)
    if (kandidati.length > 0) {
      const { data: dvojice } = await supabase
        .from('chats')
        .select('id')
        .in('id', kandidati)
        .eq('is_group', false)
        .limit(1)

      if (dvojice && dvojice.length > 0) return { ok: true, chatId: dvojice[0].id }
    }
  }

  return zalozitChat([pritelId], false)
}

export const zalozitChat = async (
  ucastniciIds: string[],
  jeSkupina: boolean,
  nazev?: string
): Promise<{ chatId: string | null } & Vysledek> => {
  if (!supabase) return { ...NENI_CLOUD, chatId: null }

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return { ...NENI_CLOUD, chatId: null }

  const { data: chat, error } = await supabase
    .from('chats')
    .insert({ is_group: jeSkupina, name: jeSkupina ? nazev ?? null : null, created_by: ja })
    .select('id')
    .single()

  if (error || !chat) return { ...chyba(error), chatId: null }

  // Zakladatel musí být členem dřív než ostatní: pravidlo pro přidání
  // dalších se ptá, jestli je přidávající členem.
  const { error: chybaClena } = await supabase
    .from('chat_members')
    .insert({ chat_id: chat.id, user_id: ja })

  if (chybaClena) return { ...chyba(chybaClena), chatId: null }

  const { error: chybaOstatnich } = await supabase
    .from('chat_members')
    .insert(ucastniciIds.map((id) => ({ chat_id: chat.id, user_id: id })))

  if (chybaOstatnich) return { ...chyba(chybaOstatnich), chatId: null }

  return { ok: true, chatId: chat.id }
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

export const nactiZpravy = async (chatId: string): Promise<Zprava[]> => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('messages')
    .select('id, chat_id, sender_id, body, created_at, deleted_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error || !data) return []
  return data.map(zpravaZRadku)
}

export const poslatZpravu = async (chatId: string, text: string): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const orezany = text.trim()
  if (!orezany) return { ok: false, chyba: 'Prázdnou zprávu poslat nejde.' }
  if (orezany.length > 4000) return { ok: false, chyba: 'Zpráva je moc dlouhá.' }

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  const { error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, sender_id: ja, body: orezany })

  return error ? chyba(error) : { ok: true }
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
