import { supabase } from '@/core/supabase/client'
import { StavTiketu, Tiket, ZpravaTiketu } from './types'

interface Vysledek {
  ok: boolean
  chyba?: string
}

// Supabase vrací chybu jako obyčejný objekt, ne Error — stejný důvod
// jako u stejnojmenné funkce v social/api.ts a pages/admin/api.ts.
const chyba = (err: unknown): Vysledek => {
  if (err instanceof Error) return { ok: false, chyba: err.message }

  if (err && typeof err === 'object') {
    const o = err as { message?: unknown; hint?: unknown }
    const text = typeof o.message === 'string' ? o.message.trim() : ''
    const rada = typeof o.hint === 'string' ? o.hint.trim() : ''
    if (text) return { ok: false, chyba: rada ? `${text} (${rada})` : text }
  }

  return { ok: false, chyba: 'Nepovedlo se to.' }
}

const NENI_CLOUD: Vysledek = { ok: false, chyba: 'Podpora potřebuje připojení k účtu.' }

// ==========================================
// Jediné místo, kde support systém mluví se Supabase — stejný princip
// jako social/api.ts. Kdo smí co, hlídá RLS (viz migrace
// support_system): vlastník vidí svoje tikety, admin vidí všechny.
// Tenhle soubor slouží oběma pohledům stejnými funkcemi — RLS sama
// rozhodne, kolik řádků se vrátí.
// ==========================================

const tiketZRadku = (r: {
  id: string
  subject: string
  status: StavTiketu
  created_at: string
  updated_at: string
  user_id: string
}): Tiket => ({
  id: r.id,
  subject: r.subject,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  userId: r.user_id,
})

/** Načte tikety, které smí volající vidět — vlastní, nebo (jako admin)
 *  úplně všechny. Řazeno podle poslední aktivity, ať nejčerstvější
 *  konverzace nezapadne dole. */
export const nactiTikety = async (): Promise<Tiket[]> => {
  if (!supabase) return []

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return []

  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, subject, status, created_at, updated_at, user_id')
    .order('updated_at', { ascending: false })

  if (error || !data) return []

  const tikety = data.map(tiketZRadku)

  // Jméno zakladatele se dotahuje jen pro cizí tikety (admin pohled) —
  // vlastní tikety jméno nepotřebují, appka ví, kdo je "já".
  const ciziIds = [...new Set(tikety.filter((t) => t.userId !== ja).map((t) => t.userId))]
  if (ciziIds.length === 0) return tikety

  const { data: profily } = await supabase.from('profiles').select('id, display_name').in('id', ciziIds)
  const jmena = new Map((profily ?? []).map((p) => [p.id, p.display_name?.trim() || 'Student']))

  return tikety.map((t) => (t.userId === ja ? t : { ...t, uzivatelJmeno: jmena.get(t.userId) ?? 'Neznámý' }))
}

/** Založí tiket i s první zprávou atomicky přes zalozit_tiket() — dva
 *  oddělené inserty by mohly nechat tiket bez zpráv, kdyby druhý
 *  selhal (stejný důvod jako zaloz_chat u Socialu). */
export const zalozitTiket = async (predmet: string, zprava: string): Promise<{ ticketId: string | null } & Vysledek> => {
  if (!supabase) return { ...NENI_CLOUD, ticketId: null }

  const { data, error } = await supabase.rpc('zalozit_tiket', { predmet, zprava })
  if (error) return { ...chyba(error), ticketId: null }
  if (typeof data !== 'string') {
    return { ok: false, chyba: 'Tiket se založil, ale nevrátilo se jeho id.', ticketId: null }
  }

  return { ok: true, ticketId: data }
}

const zpravaZRadku = (r: {
  id: string
  ticket_id: string
  autor_id: string
  je_od_podpory: boolean
  text: string
  created_at: string
}): ZpravaTiketu => ({
  id: r.id,
  ticketId: r.ticket_id,
  autorId: r.autor_id,
  jeOdPodpory: r.je_od_podpory,
  text: r.text,
  createdAt: r.created_at,
})

export const nactiZpravyTiketu = async (ticketId: string): Promise<ZpravaTiketu[]> => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('support_zpravy')
    .select('id, ticket_id, autor_id, je_od_podpory, text, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data.map(zpravaZRadku)
}

/** `jeOdPodpory` popisuje jen to, jakým pohledem se zpráva posílá —
 *  skutečnou pravdu si RLS ověří sama (je_od_podpory musí sedět
 *  s jsem_admin() volajícího), takže spoofnutá hodnota tady insert
 *  jen odmítne, nic nezíská. */
export const poslatZpravuTiketu = async (
  ticketId: string,
  text: string,
  jeOdPodpory: boolean
): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return NENI_CLOUD

  const orezany = text.trim()
  if (!orezany) return { ok: false, chyba: 'Prázdnou zprávu poslat nejde.' }

  const { error } = await supabase.from('support_zpravy').insert({
    ticket_id: ticketId,
    autor_id: ja,
    je_od_podpory: jeOdPodpory,
    text: orezany,
  })

  return error ? chyba(error) : { ok: true }
}

/** Jen admin — RLS vyridit_tiket() si roli ověří sama v databázi. */
export const vyriditTiket = async (ticketId: string, novyStav: StavTiketu): Promise<Vysledek> => {
  if (!supabase) return NENI_CLOUD

  const { error } = await supabase.rpc('vyridit_tiket', { tiket: ticketId, novy_stav: novyStav })
  return error ? chyba(error) : { ok: true }
}

// Kanál musí mít při každém odběru jiné jméno, stejný důvod jako
// u chatů/oznámení v social/api.ts a core/notifications/api.ts.
let poradiKanalu = 0

/** Živé doručování zpráv v otevřeném vlákně. Vrací funkci pro odhlášení
 *  — bez jejího zavolání by po odchodu z vlákna zůstal viset kanál. */
export const sledovatZpravyTiketu = (ticketId: string, prisla: (z: ZpravaTiketu) => void): (() => void) => {
  const klient = supabase
  if (!klient) return () => {}

  const kanal = klient
    .channel(`tiket:${ticketId}:${++poradiKanalu}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'support_zpravy', filter: `ticket_id=eq.${ticketId}` },
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
