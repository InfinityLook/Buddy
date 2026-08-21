import { supabase } from '@/core/supabase/client'
import { AdminPrehled, AktivitaPodleDruhu, AuditLogRadek, ChybaAplikace, NastavitelnaRole, RustovyDen, TopOdznak, UcetRadek } from './types'

interface Vysledek {
  ok: boolean
  chyba?: string
}

// Supabase vrací chybu jako obyčejný objekt, ne Error — viz komentář
// u stejnojmenné funkce v social/api.ts. `instanceof Error` by tu
// selhalo úplně stejně, kdyby to sem zkopírovalo jen tvar bez obsahu.
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

// ==========================================
// Jediné místo, kde Admin panel mluví se Supabase — stejný princip jako
// social/api.ts. Přístup hlídá databáze (jsem_admin()), tenhle soubor
// jen volá RPC a formátuje odpověď.
// ==========================================

export const nactiPrehled = async (): Promise<AdminPrehled | null> => {
  if (!supabase) return null

  // admin_prehled() je "returns table(...)" — PostgREST ho vrací jako
  // pole (i když vždycky s jedním řádkem), stejně jako najdi_podle_kodu
  // o kus výš v Socialu. Bereme první a jediný prvek, ne .maybeSingle().
  const { data, error } = await supabase.rpc('admin_prehled')
  const radek = data?.[0]
  if (error || !radek) return null

  return {
    pocetUctu: radek.pocet_uctu,
    pocetHlaseniCelkem: radek.pocet_hlaseni_celkem,
    pocetNevyrizenychHlaseni: radek.pocet_nevyrizenych_hlaseni,
    pocetZprav24h: radek.pocet_zprav_24h,
    pocetChatu: radek.pocet_chatu,
    pocetPratelstvi: radek.pocet_pratelstvi,
  }
}

// ---------- ban ze Socialu ----------
//
// social_bans nemá žádnou SELECT politiku (viz migrace) — čte se přes
// nacti_social_bany(), admin-gated stejně jako admin_prehled(). Zápis
// jde přes zabanuj_ze_social(), která si roli ověřuje sama v databázi,
// takže spoofnutá role v prohlížeči by tu neprošla o nic dál, než
// prošla u kteréhokoli jiného admin volání.

export const nactiSocialBany = async (): Promise<Set<string>> => {
  if (!supabase) return new Set()

  const { data, error } = await supabase.rpc('nacti_social_bany')
  if (error || !data) return new Set()

  return new Set(data.map((r: { user_id: string }) => r.user_id))
}

export const zabanujZeSocial = async (uzivatelId: string, zabanovat: boolean): Promise<Vysledek> => {
  if (!supabase) return { ok: false, chyba: 'Admin panel potřebuje přihlášený účet.' }

  const { error } = await supabase.rpc('zabanuj_ze_social', {
    cil: uzivatelId,
    zabanovat,
  })

  return error ? chyba(error) : { ok: true }
}

// ---------- ban z celé aplikace ----------
//
// Jde přes api/admin-ban.ts, ne přímo do Supabase — přihlašování nejde
// zablokovat pravidlem RLS (to chrání řádky, ne samotné auth), potřebuje
// to Supabase service role klíč, a ten nesmí ležet v prohlížeči. Server
// si roli volajícího ověřuje sám, spoofnutá role v localStorage by tu
// neprošla o nic dál než u ostatních admin volání.

const hlavickaAutorizace = async (): Promise<HeadersInit | null> => {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : null
}

export const nactiAppBanStavy = async (ids: string[]): Promise<Record<string, boolean>> => {
  const hlavicka = await hlavickaAutorizace()
  if (!hlavicka || ids.length === 0) return {}

  try {
    const odpoved = await fetch(`/api/admin-ban?ids=${encodeURIComponent(ids.join(','))}`, {
      headers: hlavicka,
    })
    const telo = await odpoved.json().catch(() => null)
    return odpoved.ok ? telo?.zabanovani ?? {} : {}
  } catch {
    return {}
  }
}

export const zabanujCelouAppku = async (uzivatelId: string, zabanovat: boolean): Promise<Vysledek> => {
  const hlavicka = await hlavickaAutorizace()
  if (!hlavicka) return { ok: false, chyba: 'Admin panel potřebuje přihlášený účet.' }

  try {
    const odpoved = await fetch('/api/admin-ban', {
      method: 'POST',
      headers: { ...hlavicka, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cilId: uzivatelId, zabanovat }),
    })
    const telo = await odpoved.json().catch(() => null)
    return odpoved.ok ? { ok: true } : { ok: false, chyba: telo?.chyba ?? 'Nepovedlo se to.' }
  } catch {
    return { ok: false, chyba: 'Nejde se připojit. Zkontroluj internet.' }
  }
}

// ---------- audit log ----------
//
// audit_log nemá SELECT politiku pro nikoho než jsem_admin() (viz
// migrace audit_log_admin_akci) — čte se přes nacti_audit_log(), stejně
// admin-gated jako admin_prehled()/nacti_social_bany(). Zápisy do
// tabulky nejdou přes tenhle soubor vůbec: dělá je buď databáze sama
// (SECURITY DEFINER funkce/triggery na existujících admin akcích), nebo
// api/admin-ban.ts pro tu jedinou akci, která není zápisem do databáze
// (Auth Admin API volání).

export const nactiAuditLog = async (pocet = 50, posun = 0): Promise<AuditLogRadek[]> => {
  if (!supabase) return []

  const { data, error } = await supabase.rpc('nacti_audit_log', { pocet, posun })
  if (error || !data) return []

  return data.map(
    (r: {
      id: string
      admin_id: string | null
      admin_jmeno: string | null
      akce: string
      cil_id: string | null
      cil_jmeno: string | null
      detail: Record<string, unknown> | null
      vytvoreno_v: string
    }) => ({
      id: r.id,
      adminId: r.admin_id,
      adminJmeno: r.admin_jmeno,
      akce: r.akce,
      cilId: r.cil_id,
      cilJmeno: r.cil_jmeno,
      detail: r.detail,
      vytvorenoV: r.vytvoreno_v,
    })
  )
}

// ---------- detailní analytika (rozšíření Přehledu) ----------
//
// Tři samostatné admin-gated RPC místo jednoho, protože každá vrací
// jiný tvar tabulky — SQL "returns table" nejde míchat řádky s různým
// počtem sloupců do jedné odpovědi. Všechny tři čtou jen agregáty
// (součty/počty), nikdy syrové řádky jednotlivých uživatelů.

export const nactiRustovyGraf = async (dny = 14): Promise<RustovyDen[]> => {
  if (!supabase) return []

  const { data, error } = await supabase.rpc('admin_rustovy_graf', { dny })
  if (error || !data) return []

  return data.map((r: { den: string; novych_uctu: number; novych_zprav: number }) => ({
    den: r.den,
    novychUctu: r.novych_uctu,
    novychZprav: r.novych_zprav,
  }))
}

export const nactiAktivituPodleDruhu = async (): Promise<AktivitaPodleDruhu[]> => {
  if (!supabase) return []

  const { data, error } = await supabase.rpc('admin_aktivita_podle_druhu')
  if (error || !data) return []

  return data.map((r: { kind: string; celkem: number }) => ({ kind: r.kind, celkem: r.celkem }))
}

export const nactiTopOdznaky = async (pocet = 5): Promise<TopOdznak[]> => {
  if (!supabase) return []

  const { data, error } = await supabase.rpc('admin_top_odznaky', { pocet })
  if (error || !data) return []

  return data.map((r: { badge_id: string; celkem: number }) => ({ badgeId: r.badge_id, celkem: r.celkem }))
}

// ---------- Uživatelé (procházení účtů, změna role) ----------
//
// admin_seznam_uctu() je admin-gated stejně jako zbytek panelu; hledání
// je jen ILIKE na display_name nebo přesná shoda friend_code/id, žádný
// fulltextový index navíc — tabulka profiles má řádově stovky řádků,
// ne miliony. Změna role jde přes admin_nastav_roli(), která si sama
// zakazuje cíl == volající (viz komentář v migraci) a zapisuje do
// audit_log stejně jako každá jiná privilegovaná akce v tomhle souboru.

export const nactiUcty = async (hledat = '', pocet = 30, posun = 0): Promise<UcetRadek[]> => {
  if (!supabase) return []

  const { data, error } = await supabase.rpc('admin_seznam_uctu', {
    hledat: hledat.trim() || null,
    pocet,
    posun,
  })
  if (error || !data) return []

  return data.map(
    (r: {
      id: string
      display_name: string
      friend_code: string
      xp: number
      level: number
      streak_days: number
      role: NastavitelnaRole
      valid_until: string | null
    }) => ({
      id: r.id,
      displayName: r.display_name,
      friendCode: r.friend_code,
      xp: r.xp,
      level: r.level,
      streakDays: r.streak_days,
      role: r.role,
      validUntil: r.valid_until,
    })
  )
}

// ---------- Systém (chyby zachycené v prohlížeči) ----------
//
// client_errors nemá SELECT politiku pro nikoho než jsem_admin() —
// stejný "server rozhoduje, klient jen čte" tvar jako audit_log.
// Zápisy sem nejdou přes tenhle soubor vůbec, jen přes
// core/utils/errorReporting.ts, které je jediné volá při běhu appky.

export const nactiChybyAplikace = async (pocet = 50, posun = 0): Promise<ChybaAplikace[]> => {
  if (!supabase) return []

  const { data, error } = await supabase.rpc('nacti_client_errors', { pocet, posun })
  if (error || !data) return []

  return data.map(
    (r: {
      id: string
      user_id: string | null
      uzivatel_jmeno: string | null
      message: string
      stack: string | null
      url: string | null
      build_id: string | null
      created_at: string
    }) => ({
      id: r.id,
      userId: r.user_id,
      uzivatelJmeno: r.uzivatel_jmeno,
      message: r.message,
      stack: r.stack,
      url: r.url,
      buildId: r.build_id,
      createdAt: r.created_at,
    })
  )
}

export const nastavRoli = async (
  uzivatelId: string,
  novaRole: NastavitelnaRole,
  platiDo: string | null = null
): Promise<Vysledek> => {
  if (!supabase) return { ok: false, chyba: 'Admin panel potřebuje přihlášený účet.' }

  const { error } = await supabase.rpc('admin_nastav_roli', {
    cil: uzivatelId,
    nova_role: novaRole,
    plati_do: platiDo,
  })

  return error ? chyba(error) : { ok: true }
}
