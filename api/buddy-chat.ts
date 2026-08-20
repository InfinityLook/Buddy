import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenAI } from '@google/genai'

// ==========================================
// Server pro hlasového Buddyho.
//
// Jediné místo v celé appce, kde běží něco jiného než statický klient —
// a jediný důvod, proč vůbec existuje: Gemini API klíč nesmí nikdy
// ležet v prohlížeči. Klientský JS balíček je veřejně stažitelný (viz
// varování u rolí v core/role/types.ts, stejná logika), takže cokoli
// tajného v něm by si mohl kdokoli vzít a utrácet tím z účtu, na kterém
// je klíč založený.
//
// Přístup hlídá platný Supabase přihlašovací token, ne žádný denní
// limit zpráv (to je vědomé rozhodnutí, ne nedodělek) — appka ale musí
// zůstat zavřená pro kohokoli bez účtu, jinak by ji mohl volat kdokoli
// na internetu a vyčerpat bezplatnou kvótu, aniž by tenhle telefon
// vůbec spustil.
// ==========================================

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

// Odpověď se čte nahlas přes syntézu řeči — dlouhá odpověď se dlouho
// poslouchá a formátování (odrážky, hvězdičky) TTS čte doslova a zní to
// rozbitě. Instrukce proto trvá na stručnosti a obyčejném textu.
const SYSTEM_INSTRUKCE = `Jsi Buddy, přátelský a chytrý hlasový společník ve studijní aplikaci
SchoolBuddy pro středoškolské a vysokoškolské studenty. Mluvíš vždycky česky.

Tvoje odpovědi se čtou nahlas syntézou řeči, ne čtou z obrazovky — proto:
- Piš krátce, obvykle 1–3 věty. Delší vysvětlení jen když si o ně uživatel
  vyloženě řekne.
- Nikdy nepoužívej odrážky, číslované seznamy, hvězdičky ani jiné
  formátování. Piš přirozeně mluvenou češtinou, jako v rozhovoru.
- Nepiš emoji ani speciální znaky, které by syntéza řeči četla doslova.

Jsi věcný, povzbudivý a trpělivý. Když něco nevíš jistě, řekni to na
rovinu, nevymýšlej si. Jsi umělá inteligence a nepředstíráš, že jsi
člověk, ale nemusíš to zdůrazňovat v každé odpovědi.`

const MAX_ZPRAV_V_HISTORII = 20
const MAX_DELKA_ZPRAVY = 2000

interface PrichoziZprava {
  odesilatel: 'uzivatel' | 'buddy'
  text: string
}

const chyba = (res: VercelResponse, status: number, zprava: string) =>
  res.status(status).json({ chyba: zprava })

/** Ověří přiložený Supabase token přes /auth/v1/user — funkce nemá
 *  vlastní přístup k databázi, jen se zeptá Supabase, jestli token
 *  patří skutečně přihlášenému účtu. */
const overSeSupabase = async (token: string): Promise<boolean> => {
  const url = process.env.VITE_SUPABASE_URL
  const anonKlic = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !anonKlic) return false

  try {
    const odpoved = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKlic },
    })
    return odpoved.ok
  } catch {
    return false
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return chyba(res, 405, 'Jen POST.')

  const apiKlic = process.env.GEMINI_API_KEY
  if (!apiKlic) {
    return chyba(res, 500, 'Hlasový režim není na serveru nastavený (chybí GEMINI_API_KEY).')
  }

  const hlavicka = req.headers.authorization
  const token = hlavicka?.startsWith('Bearer ') ? hlavicka.slice(7) : null
  if (!token || !(await overSeSupabase(token))) {
    return chyba(res, 401, 'Pro hlasový režim se musíš přihlásit.')
  }

  const telo = req.body as { historie?: unknown } | undefined
  if (!telo || !Array.isArray(telo.historie) || telo.historie.length === 0) {
    return chyba(res, 400, 'Chybí historie rozhovoru.')
  }

  const historie = (telo.historie as PrichoziZprava[])
    .filter(
      (z): z is PrichoziZprava =>
        !!z &&
        (z.odesilatel === 'uzivatel' || z.odesilatel === 'buddy') &&
        typeof z.text === 'string' &&
        z.text.trim().length > 0
    )
    // Poslední zpráva musí patřit uživateli — jinak by šlo poslat
    // prázdnou historii nebo si nechat "domluvit" odpověď za Buddyho.
    .slice(-MAX_ZPRAV_V_HISTORII)
    .map((z) => ({ ...z, text: z.text.trim().slice(0, MAX_DELKA_ZPRAVY) }))

  if (historie.length === 0 || historie[historie.length - 1].odesilatel !== 'uzivatel') {
    return chyba(res, 400, 'Historie musí končit zprávou od uživatele.')
  }

  const ai = new GoogleGenAI({ apiKey: apiKlic })

  try {
    const odpoved = await ai.models.generateContent({
      model: MODEL,
      contents: historie.map((z) => ({
        role: z.odesilatel === 'uzivatel' ? ('user' as const) : ('model' as const),
        parts: [{ text: z.text }],
      })),
      config: {
        systemInstruction: SYSTEM_INSTRUKCE,
        temperature: 0.8,
        // Strop na délku odpovědi — dlouhá odpověď se nejen hůř
        // poslouchá, ale při hlasovém rozhovoru i hůř čeká.
        maxOutputTokens: 300,
      },
    })

    const text = odpoved.text?.trim()
    if (!text) {
      // Gemini umí vrátit prázdnou odpověď (např. bezpečnostní filtr) —
      // uživatel má dostat srozumitelnou hlášku, ne tichou chybu.
      return chyba(res, 502, 'Buddy teď neví, jak odpovědět. Zkus to prosím jinak.')
    }

    return res.status(200).json({ text })
  } catch (err) {
    const status = (err as { status?: number })?.status
    if (status === 429) {
      return chyba(res, 429, 'Buddy má teď plno (bezplatná kvóta). Zkus to za chvíli znovu.')
    }
    console.error('buddy-chat: Gemini selhalo', err)
    return chyba(res, 502, 'Buddy teď neodpovídá. Zkus to prosím znovu.')
  }
}
