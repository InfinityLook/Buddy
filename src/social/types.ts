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

/**
 * Cizí profil k zobrazení (přátelé, hlavička 1:1 chatu, výsledky
 * hledání) — přes precti_verejny_profil, ne přímé čtení profiles: to by
 * pokrylo přátele a spoluúčastníky chatu, ale ne někoho z výsledků
 * hledání, se kterým ještě žádný vztah neexistuje.
 */
export interface VerejnyProfil extends SocialProfil {
  xp: number
  level: number
  streakDays: number
  /** RoleId jako string — core/role/registry.ts's getRole() ho převede
   *  na ikonu/název/tón pro nálepku role. */
  roleId: string
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
  /** Kdo skupinu založil — přejmenovat smí kterýkoli člen (hlídá RLS),
   *  ale odebrat někoho jiného jen zakladatel (odebrat_ze_skupiny). */
  zakladatelId: string
  /** Emoji z pevné nabídky (viz IKONY_SKUPIN), null = výchozí "#".
   *  U dvojice se nepoužívá, ta má barvu podle protějšku. */
  ikona: string | null
  /** Ztlumil jsem si tenhle chat sám (chat_members.muted, jen můj
   *  řádek) — inbox.ts ho pak přeskočí v souhrnném počtu i notifikaci,
   *  ale odznak přímo u chatu v ChatyPanel.tsx dál ukazuje skutečný
   *  počet nepřečtených, ať je vidět, co čeká, když se tam podíváš. */
  mujMuted: boolean
}

// Nabídka emoji pro skupinový chat — SpravaSkupinyDialog.tsx z ní
// staví výběr, pevná sada kvůli check constraintu na sloupci (viz
// migrace ikona_skupinoveho_chatu) i proto, aby appka nemusela řešit
// upload/moderaci libovolného obrázku kvůli jedné ikonce skupiny.
export const IKONY_SKUPIN = ['🎉', '📚', '🎮', '⚽', '🎨', '🎵', '🍕', '🌟', '🐱', '⭐'] as const

export interface Zprava {
  id: string
  chatId: string
  odesilatelId: string
  text: string
  createdAt: string
  smazanoAt: string | null
  /** Id zprávy, na kterou tahle odpovídá — null u běžné zprávy. Náhled
   *  citované zprávy se hledá jen v už načtených `zpravy` v ChatView.tsx
   *  (bez zvláštního dotazu); u starší, ještě nenačtené zprávy se ukáže
   *  obecná náhrada bez textu. */
  replyToId: string | null
}

/**
 * Krátká emoji reakce na zprávu — vlastní tabulka `message_reactions`,
 * ne sloupec na `messages`: jedna zpráva může mít reakce od víc lidí
 * a víc různých emoji najednou. `id` je potřeba i na klientovi, ne jen
 * v databázi — živé mazání přes Realtime posílá u DELETE (REPLICA
 * IDENTITY DEFAULT) jen primární klíč smazané řádky, žádné jiné
 * sloupce, takže jedině podle něj jde reakci v místním stavu najít
 * a odebrat (viz sledovatReakce v api.ts).
 */
export interface Reakce {
  id: string
  messageId: string
  userId: string
  emoji: string
}

/** Pevná nabídka reakcí, žádný picker se stovkami emoji — stejný
 *  "pevná sada, ne libovolný vstup" přístup jako IKONY_SKUPIN výš. */
export const EMOJI_REAKCI = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const

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
  /** Id nahlášené zprávy — odděleně od textu, ať jde zprávu smazat
   *  přímo z hlášení (viz smazatNahlasenouZpravu v SocialReportPanelu),
   *  ne jen si přečíst, o co šlo. */
  zpravaId: string | null
  stav: StavHlaseni
  vyrizenoAt: string | null
}

// ==========================================
// Tajný chat
//
// Vlastní tabulky (tajne_chaty/tajne_zpravy), ne rozšíření Chat/Zprava
// výš — jiná hranice přístupu (jen VIP/moderátor/admin, mizící zprávy,
// bez moderátorského dohledu) i jiná pravidla založení (musí to potvrdit
// druhá strana), takže sdílet tvar s běžným chatem by jen matlo dvoje
// pravidla do jednoho typu.
// ==========================================

export type StavTajnehoChatu = 'cekajici' | 'aktivni' | 'zamitnuto'

export interface TajnyChat {
  id: string
  druhy: SocialProfil
  /** Založil ho přihlášený, nebo ho jen dostal jako pozvánku? */
  zalozilJa: boolean
  stav: StavTajnehoChatu
  createdAt: string
  /** Za kolik sekund od odeslání zpráva zmizí — nastavuje ho kterýkoli
   *  účastník (viz CASOVACE_TAJNEHO_CHATU), mění se jen dopředu. */
  expiraceSekund: number
}

/**
 * `text` z api.ts/DB pohledu nese od zavedení E2E šifrování base64
 * šifru, ne čitelný text — proto `cifra`, ne `text`. `TajnyChatView.tsx`
 * je jediné místo, které ji umí (s klíčem konkrétního chatu) přeložit
 * zpátky na zobrazitelnou zprávu.
 */
export interface TajnaZprava {
  id: string
  chatId: string
  odesilatelId: string
  cifra: string
  iv: string
  createdAt: string
}

/** Presety mizení zpráv — stejná sada, jakou nabízí "mizící zprávy"
 *  v běžných messengerech (Telegram Secret Chat aj.), vynucená i na
 *  databázi (check constraint na tajne_chaty.expirace_sekund), ne jen
 *  tady v UI. */
export const CASOVACE_TAJNEHO_CHATU: { sekund: number; popis: string }[] = [
  { sekund: 10, popis: '10 s' },
  { sekund: 30, popis: '30 s' },
  { sekund: 60, popis: '1 min' },
  { sekund: 300, popis: '5 min' },
  { sekund: 600, popis: '10 min' },
  { sekund: 900, popis: '15 min' },
  { sekund: 1800, popis: '30 min' },
  { sekund: 3600, popis: '1 h' },
  { sekund: 14400, popis: '4 h' },
  { sekund: 28800, popis: '8 h' },
  { sekund: 43200, popis: '12 h' },
]
