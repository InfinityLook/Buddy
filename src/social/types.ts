// ==========================================
// Tvary sociální části.
//
// Odpovídají tabulkám v Supabase (profiles, friendships, blocks, chats,
// chat_members, messages, reports). Když se mění schéma, mění se i tohle —
// jinak si TypeScript myslí, že přišlo něco jiného, než co doopravdy přišlo.
// ==========================================

export interface SocialProfil {
  id: string
  displayName: string
  avatarUrl: string | null
}

/** Vlastní profil navíc s kódem, kterým mě ostatní najdou. */
export interface MujProfil extends SocialProfil {
  friendCode: string
}

export interface Zadost {
  id: string
  profil: SocialProfil
  /** Přišla mně, nebo jsem ji poslal já? */
  smer: 'prichozi' | 'odchozi'
  createdAt: string
}

export interface Pritel {
  /** Id řádku přátelství — přes něj se přátelství ruší */
  vazbaId: string
  profil: SocialProfil
}

export interface Chat {
  id: string
  jeSkupina: boolean
  /** U skupiny její název, u dvojice jméno protějšku */
  nazev: string
  /** Ostatní účastníci bez přihlášeného */
  ucastnici: SocialProfil[]
  posledniZprava: string | null
  posledniCas: string | null
  neprectene: number
}

export interface Zprava {
  id: string
  chatId: string
  odesilatelId: string
  text: string
  createdAt: string
  smazanoAt: string | null
}

export type DuvodNahlaseni = 'spam' | 'obtezovani' | 'nevhodny_obsah' | 'jine'

export const DUVODY: { id: DuvodNahlaseni; popis: string }[] = [
  { id: 'obtezovani', popis: 'Obtěžuje mě nebo mi vyhrožuje' },
  { id: 'nevhodny_obsah', popis: 'Posílá nevhodný obsah' },
  { id: 'spam', popis: 'Spam nebo reklama' },
  { id: 'jine', popis: 'Něco jiného' },
]

/** Výsledek operace, kterou má smysl uživateli okomentovat. */
export interface Vysledek {
  ok: boolean
  chyba?: string
}

/**
 * Výsledek hledání podle kódu.
 *
 * Dřív se vracelo jen `SocialProfil | null` a všechny tři různé konce —
 * nikdo takový není, jsi to ty sám, spojení selhalo — vypadaly stejně.
 * Uživatel pak dostal „takový kód nikomu nepatří“ i ve chvíli, kdy zadal
 * vlastní kód nebo mu vypadla síť, a neměl podle čeho poznat, co dělá
 * špatně. Proto se rozlišují.
 */
export type NalezVysledek =
  | { stav: 'nalezen'; profil: SocialProfil }
  | { stav: 'nenalezen' }
  | { stav: 'vlastni' }
  | { stav: 'chyba'; chyba: string }

// ==========================================
// Moderace
// ==========================================

export type StavHlaseni = 'nevyrizeno' | 'vyreseno' | 'zamitnuto'

export interface Hlaseni {
  id: string
  duvod: DuvodNahlaseni
  poznamka: string | null
  createdAt: string
  /** Kdo hlásil a koho — u vlastních hlášení stačí jméno nahlášeného */
  hlasil: SocialProfil | null
  nahlaseny: SocialProfil | null
  /** Text nahlášené zprávy, pokud se hlášení týkalo zprávy */
  zprava: string | null
  stav: StavHlaseni
  vyrizenoAt: string | null
}
