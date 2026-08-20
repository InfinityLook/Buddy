import { create } from 'zustand'
import { isSupabaseConfigured, supabase } from './client'

// ==========================================
// Skutečné účty.
//
// Aplikace zůstává offline-first: bez účtu funguje všechno kromě
// Socialu. Účet je nadstavba, ne podmínka běhu — proto jsou tu vedle
// sebe dva pojmy:
//
//   useAuthStore.isAuthed  ... uživatel prošel přihlašovací obrazovkou
//                              (může být i "bez účtu", drží se lokálně)
//   useAccount             ... skutečný účet v Supabase
//
// Social vyžaduje ten druhý. Anonymní identita, kterou si aplikace
// založí sama kvůli zálohování XP, na psaní ostatním nestačí — a hlídá
// si to i databáze, ne jen tahle vrstva.
// ==========================================

export type AccountStatus =
  // Cloud není nastavený, účty se nepoužívají
  | 'off'
  // Čeká se na první odpověď Supabase
  | 'loading'
  // Běží jen anonymní identita založená kvůli synchronizaci
  | 'anonymous'
  // Skutečný účet s e-mailem
  | 'signed-in'

interface AccountState {
  status: AccountStatus
  userId: string | null
  email: string | null
}

export const useAccount = create<AccountState>(() => ({
  status: isSupabaseConfigured ? 'loading' : 'off',
  userId: null,
  email: null,
}))

/** Má uživatel skutečný účet? Jediná otázka, kterou má Social pokládat. */
export const maSkutecnyUcet = (): boolean => useAccount.getState().status === 'signed-in'

// ==========================================
// Hlášky
//
// Supabase vrací chyby anglicky a technicky ("Invalid login credentials").
// Studentovi to nic neřekne, takže se překládají na to, co s tím může
// udělat. Neznámá chyba se ukáže tak, jak přišla — vymyslet si vlastní
// znění by při hledání problému spíš uškodilo.
// ==========================================
const HLASKY: { vzor: RegExp; text: string }[] = [
  { vzor: /invalid login credentials/i, text: 'Špatný e-mail nebo heslo.' },
  { vzor: /email not confirmed/i, text: 'E-mail ještě není potvrzený. Mrkni do schránky.' },
  { vzor: /user already registered|already been registered/i, text: 'Na tenhle e-mail už účet existuje. Zkus se přihlásit.' },
  { vzor: /password should be at least/i, text: 'Heslo musí mít aspoň 6 znaků.' },
  { vzor: /unable to validate email|invalid format/i, text: 'E-mail nevypadá správně.' },
  { vzor: /rate limit|too many requests/i, text: 'Moc pokusů za sebou. Zkus to za chvíli.' },
  { vzor: /failed to fetch|network/i, text: 'Nepovedlo se spojit se serverem. Jsi online?' },
]

const prelozChybu = (err: unknown): string => {
  const zprava = err instanceof Error ? err.message : String(err)
  return HLASKY.find((h) => h.vzor.test(zprava))?.text ?? zprava
}

export interface AuthVysledek {
  ok: boolean
  chyba?: string
  /** Účet vznikl, ale čeká na potvrzení e-mailu */
  cekaNaPotvrzeni?: boolean
}

const NENI_CLOUD: AuthVysledek = {
  ok: false,
  chyba: 'Účty nejsou v téhle verzi nastavené.',
}

/**
 * Registrace.
 *
 * Když už na zařízení běží anonymní identita, nezakládá se nový účet,
 * ale povýší se ta stávající. Kdyby se založil nový, přišel by uživatel
 * o všechno XP a odznaky nasbírané před registrací — a to je přesně to,
 * co si nikdo nedomyslí, dokud se to nestane.
 */
export const registerAccount = async (
  email: string,
  heslo: string
): Promise<AuthVysledek> => {
  if (!supabase) return NENI_CLOUD

  try {
    const { data: relace } = await supabase.auth.getSession()
    const anonymni = relace.session?.user?.is_anonymous === true

    if (anonymni) {
      const { data, error } = await supabase.auth.updateUser({ email, password: heslo })
      if (error) throw error

      // Když je v projektu zapnuté potvrzování e-mailem, účet zůstane
      // anonymní, dokud uživatel neklikne na odkaz ve zprávě.
      return { ok: true, cekaNaPotvrzeni: data.user?.is_anonymous === true }
    }

    const { data, error } = await supabase.auth.signUp({ email, password: heslo })
    if (error) throw error

    return { ok: true, cekaNaPotvrzeni: data.session === null }
  } catch (err) {
    return { ok: false, chyba: prelozChybu(err) }
  }
}

/** Přihlášení k existujícímu účtu. */
export const signIn = async (email: string, heslo: string): Promise<AuthVysledek> => {
  if (!supabase) return NENI_CLOUD

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password: heslo })
    if (error) throw error
    return { ok: true }
  } catch (err) {
    return { ok: false, chyba: prelozChybu(err) }
  }
}

/**
 * Odhlášení.
 *
 * Místní data se schválně nemažou: jsou zdrojem pravdy a uživatel o ně
 * odhlášením nesmí přijít. Po odhlášení si aplikace založí novou
 * anonymní identitu a jede dál offline.
 */
export const signOut = async (): Promise<AuthVysledek> => {
  if (!supabase) return NENI_CLOUD

  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { ok: true }
  } catch (err) {
    return { ok: false, chyba: prelozChybu(err) }
  }
}

/** Odkaz na obnovu hesla. */
export const resetPassword = async (email: string): Promise<AuthVysledek> => {
  if (!supabase) return NENI_CLOUD

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) throw error
    return { ok: true }
  } catch (err) {
    return { ok: false, chyba: prelozChybu(err) }
  }
}

// ==========================================
// Sledování stavu
// ==========================================

let sleduje = false

/**
 * Zapne sledování přihlášení. Volá se jednou ze startu aplikace.
 *
 * Stav se nedrží vlastní kopií v localStorage: Supabase si relaci
 * obnovuje sám a druhá kopie by se s ní dřív nebo později rozešla.
 */
export const startAuthWatch = (): void => {
  if (sleduje || !supabase) return
  sleduje = true

  const zapis = (user: { id: string; email?: string; is_anonymous?: boolean } | null) => {
    if (!user) {
      useAccount.setState({ status: 'anonymous', userId: null, email: null })
      return
    }

    useAccount.setState({
      status: user.is_anonymous ? 'anonymous' : 'signed-in',
      userId: user.id,
      email: user.email ?? null,
    })
  }

  void supabase.auth.getSession().then(({ data }) => zapis(data.session?.user ?? null))
  supabase.auth.onAuthStateChange((_udalost, relace) => zapis(relace?.user ?? null))
}
