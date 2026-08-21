import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// ==========================================
// Ban z celé aplikace — druhá serverová funkce v appce, po
// api/buddy-chat.ts. Drží Supabase SERVICE ROLE klíč, ne jen ten
// publishable, který appka používá jinde: jedině službová identita smí
// zablokovat cizí přihlášení (auth.admin.updateUserById), a tahle
// operace nejde udělat pravidly RLS — RLS chrání řádky v databázi, ne
// samotné přihlašování.
//
// Právě proto, že service role klíč obchází RLS úplně, se autorizace
// (je volající doopravdy admin?) dělá schválně BEZ něj — čte se vlastní
// řádek volajícího v user_roles jeho vlastním tokenem, přes normální
// REST rozhraní, které RLS dodržuje ("vidět vlastní roli"). Service role
// klíč se použije až na tu jednu privilegovanou operaci samotnou, ne na
// rozhodnutí, jestli k ní smí.
// ==========================================

const chyba = (res: VercelResponse, status: number, zprava: string) =>
  res.status(status).json({ chyba: zprava })

/** Ověří token a vrátí id přihlášeného, nebo null. */
const idVolajiciho = async (url: string, anonKlic: string, token: string): Promise<string | null> => {
  try {
    const odpoved = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKlic },
    })
    if (!odpoved.ok) return null
    const telo = (await odpoved.json()) as { id?: string }
    return telo.id ?? null
  } catch {
    return null
  }
}

/** Přečte roli volajícího jeho vlastním tokenem — RLS mu pustí jen jeho
 *  vlastní řádek, takže tahle funkce nemůže zjistit roli nikoho jiného. */
const jsemAdmin = async (url: string, anonKlic: string, token: string, mojeId: string): Promise<boolean> => {
  try {
    const odpoved = await fetch(
      `${url}/rest/v1/user_roles?user_id=eq.${mojeId}&select=role,valid_until`,
      { headers: { Authorization: `Bearer ${token}`, apikey: anonKlic } }
    )
    if (!odpoved.ok) return false
    const radky = (await odpoved.json()) as { role: string; valid_until: string | null }[]
    const radek = radky[0]
    if (!radek || radek.role !== 'admin') return false
    return !radek.valid_until || new Date(radek.valid_until) > new Date()
  } catch {
    return false
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = process.env.VITE_SUPABASE_URL
  const anonKlic = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const serviceKlic = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKlic || !serviceKlic) {
    return chyba(res, 500, 'Ban z aplikace není na serveru nastavený.')
  }

  const hlavicka = req.headers.authorization
  const token = hlavicka?.startsWith('Bearer ') ? hlavicka.slice(7) : null
  if (!token) return chyba(res, 401, 'Musíš se přihlásit.')

  const mojeId = await idVolajiciho(url, anonKlic, token)
  if (!mojeId) return chyba(res, 401, 'Přihlášení už neplatí, přihlas se znovu.')

  if (!(await jsemAdmin(url, anonKlic, token, mojeId))) {
    return chyba(res, 403, 'Přístup jen pro administrátory.')
  }

  // Service role klíč se instancuje až tady, po ověření role — nikdy
  // se nesahá na privilegovaného klienta dřív, než je jasné, že smí.
  const admin = createClient(url, serviceKlic, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  if (req.method === 'GET') {
    const idsParam = req.query.ids
    const ids = (typeof idsParam === 'string' ? idsParam : '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50)

    const zabanovani: Record<string, boolean> = {}
    await Promise.all(
      ids.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id)
        const doKdy = data.user?.banned_until
        zabanovani[id] = !!doKdy && new Date(doKdy) > new Date()
      })
    )

    return res.status(200).json({ zabanovani })
  }

  if (req.method === 'POST') {
    const telo = req.body as { cilId?: unknown; zabanovat?: unknown } | undefined
    const cilId = typeof telo?.cilId === 'string' ? telo.cilId : null
    const zabanovat = telo?.zabanovat === true

    if (!cilId) return chyba(res, 400, 'Chybí id uživatele.')
    if (cilId === mojeId) return chyba(res, 400, 'Sám sebe zabanovat nejde.')

    // "Natrvalo" v systému, který ban vždy váže na dobu platnosti,
    // znamená prostě velmi dlouho — stejný idiom, jaký doporučuje
    // dokumentace Supabase.
    const { error } = await admin.auth.admin.updateUserById(cilId, {
      ban_duration: zabanovat ? '876000h' : 'none',
    })

    if (error) {
      console.error('admin-ban: updateUserById selhalo', error)
      return chyba(res, 502, 'Nepovedlo se to.')
    }

    // Auth Admin API volání nejde zachytit databázovým triggerem (žádný
    // řádek se nemění) — proto se do audit_log zapisuje rovnou odsud,
    // stejným service role klientem, který ban právě provedl. Chyba
    // zápisu do logu nesmí shodit už provedený ban, proto se jen loguje.
    const { error: logError } = await admin.from('audit_log').insert({
      admin_id: mojeId,
      akce: zabanovat ? 'ban_app' : 'unban_app',
      cil_id: cilId,
    })
    if (logError) console.error('admin-ban: zápis do audit_log selhal', logError)

    return res.status(200).json({ ok: true })
  }

  return chyba(res, 405, 'Jen GET nebo POST.')
}
