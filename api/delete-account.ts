import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ==========================================
// Smazání účtu a souvisejících dat (Google Play: Account Deletion).
//
// Třetí funkce se service role klíčem, stejný model jako api/admin-ban.ts:
// kdo volá, se zjišťuje VLASTNÍM tokenem volajícího (/auth/v1/user) dřív,
// než se vůbec sáhne na privilegovaného klienta. Id účtu ke smazání se
// NIKDY nebere z těla požadavku — smazat jde jen ten účet, jehož token
// přišel, takže cizí účet touhle funkcí smazat nejde.
//
// Pořadí je záměrné:
//   1. soubory ve Storage (bez toho by po smazání účtu zůstaly sirotčí
//      bajty — řádky ve storage.objects se mažou SQL, ale obsah ne),
//   2. vyčištění obsahu, který cizí klíče samy nevyčistí (texty zpráv),
//   3. smazání řádku v auth.users — zbytek smažou/anonymizují cizí klíče
//      (viz supabase/migrations/20261115090000_smazani_uctu.sql).
// Selže-li krok 3, uživatel to prostě zopakuje; kroky 1–2 jsou idempotentní.
//
// Pravidla uchování: reports, audit_log, social_bans a oznámení správců
// zůstávají jako evidence moderace (oprávněný zájem, právní nároky), ale
// bez odkazu na smazaný účet. Zprávy v cizích konverzacích zůstávají jako
// "Zpráva smazána" bez autora a bez obsahu.
// ==========================================

const chyba = (res: VercelResponse, status: number, zprava: string) =>
  res.status(status).json({ chyba: zprava })

interface Volajici {
  id: string
  email: string | null
  anonymni: boolean
}

const zjistiVolajiciho = async (url: string, anonKlic: string, token: string): Promise<Volajici | null> => {
  try {
    const odpoved = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKlic },
    })
    if (!odpoved.ok) return null
    const telo = (await odpoved.json()) as { id?: string; email?: string | null; is_anonymous?: boolean }
    if (!telo.id) return null
    return { id: telo.id, email: telo.email ?? null, anonymni: telo.is_anonymous === true }
  } catch {
    return null
  }
}

/** Je volající (vlastním tokenem, přes RLS) správce? Správce se tady mazat
 *  nesmí — appka by mohla zůstat bez jediného admina. */
const jeSpravce = async (url: string, anonKlic: string, token: string, mojeId: string): Promise<boolean> => {
  try {
    const odpoved = await fetch(`${url}/rest/v1/user_roles?user_id=eq.${mojeId}&select=role,valid_until`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKlic },
    })
    if (!odpoved.ok) return false
    const radky = (await odpoved.json()) as { role: string; valid_until: string | null }[]
    const radek = radky[0]
    if (!radek || radek.role !== 'admin') return false
    return !radek.valid_until || new Date(radek.valid_until) > new Date()
  } catch {
    return false
  }
}

const DAVKA = 100

/** Smaže všechny soubory ve složce `<uid>/` daného bucketu (plochá složka). */
const smazSlozkuUzivatele = async (admin: SupabaseClient, bucket: string, uid: string): Promise<void> => {
  for (let pokus = 0; pokus < 200; pokus++) {
    const { data, error } = await admin.storage.from(bucket).list(uid, { limit: 1000 })
    if (error) throw error
    const soubory = (data ?? []).filter((f) => f.id !== null)
    if (soubory.length === 0) return
    const { error: errRemove } = await admin.storage.from(bucket).remove(soubory.map((f) => `${uid}/${f.name}`))
    if (errRemove) throw errRemove
  }
}

/** chat-media nemá složku podle uživatele (cesta začíná id chatu), takže
 *  cesty příloh se hledají přes zprávy, které uživatel poslal. */
const smazPrilohyChatu = async (admin: SupabaseClient, uid: string): Promise<void> => {
  const { data, error } = await admin
    .from('messages')
    .select('media_path')
    .eq('sender_id', uid)
    .not('media_path', 'is', null)
  if (error) throw error
  const cesty = (data ?? []).map((r) => r.media_path as string).filter(Boolean)
  for (let i = 0; i < cesty.length; i += DAVKA) {
    const { error: errRemove } = await admin.storage.from('chat-media').remove(cesty.slice(i, i + DAVKA))
    if (errRemove) throw errRemove
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = process.env.VITE_SUPABASE_URL
  const anonKlic = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const serviceKlic = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKlic || !serviceKlic) {
    return chyba(res, 500, 'Smazání účtu není na serveru nastavené.')
  }
  if (req.method !== 'POST') return chyba(res, 405, 'Jen POST.')

  const hlavicka = req.headers.authorization
  const token = hlavicka?.startsWith('Bearer ') ? hlavicka.slice(7) : null
  if (!token) return chyba(res, 401, 'Musíš se přihlásit.')

  const volajici = await zjistiVolajiciho(url, anonKlic, token)
  if (!volajici) return chyba(res, 401, 'Přihlášení už neplatí, přihlas se znovu.')

  // Druhý, serverem vynucený krok: potvrzení e-mailem účtu. Samotný token
  // by stačil, ale takhle smazání nespustí zatoulaný požadavek ani ukradená
  // relace bez znalosti e-mailu. Anonymní účet e-mail nemá — tam stačí token.
  const telo = req.body as { email?: unknown } | undefined
  if (volajici.email) {
    const zadany = typeof telo?.email === 'string' ? telo.email.trim().toLowerCase() : ''
    if (zadany !== volajici.email.toLowerCase()) {
      return chyba(res, 400, 'E-mail se neshoduje s e-mailem účtu.')
    }
  }

  if (await jeSpravce(url, anonKlic, token, volajici.id)) {
    return chyba(res, 403, 'Účet správce nejde takhle smazat. Nejdřív ti musí být role správce odebrána.')
  }

  // Service role klient až po ověření identity (stejně jako admin-ban.ts).
  const admin = createClient(url, serviceKlic, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Pojistka proti nasazení kódu dřív než migrace: bez ní by smazání
  // zakladatele skupiny smazalo chat všem ostatním.
  const { data: pripraveno, error: errPripraveno } = await admin.rpc('ucet_smazani_pripraveno')
  if (errPripraveno || pripraveno !== true) {
    console.error('delete-account: databáze nemá nasazenou migraci smazání účtu', errPripraveno)
    return chyba(res, 503, 'Smazání účtu zatím není na serveru připravené. Zkus to později.')
  }

  const uid = volajici.id
  try {
    // 1) soubory — nejdřív přílohy chatu (cesty se berou ze zpráv, které
    //    krok 2 vymaže), pak složky uživatele.
    await smazPrilohyChatu(admin, uid)
    for (const bucket of ['avatary', 'posts', 'stories']) {
      await smazSlozkuUzivatele(admin, bucket, uid)
    }

    // 2) obsah, který cizí klíče nevyčistí
    const { error: errScrub } = await admin.rpc('smaz_osobni_data_uctu', { p_uid: uid })
    if (errScrub) throw errScrub

    // 3) samotný účet — kaskády a anonymizace udělá databáze
    const { error: errDelete } = await admin.auth.admin.deleteUser(uid)
    if (errDelete) throw errDelete
  } catch (err) {
    console.error('delete-account: smazání selhalo', err)
    return chyba(res, 502, 'Smazání se nepovedlo celé. Zkus to znovu — už smazané části se nic nestane.')
  }

  return res.status(200).json({ ok: true })
}
