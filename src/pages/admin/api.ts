import { supabase } from '@/core/supabase/client'
import { AdminPrehled, AuditLogRadek } from './types'

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
