// ==========================================
// Tvary sociální části.
//
// Odpovídají tabulkám v Supabase (profiles, follows, blocks, chats,
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
  /** Appka ho synchronizuje odjakživa (core/supabase/sync.ts) — jen ho
   *  precti_verejny_profil dřív nevracel, protože nebylo kam ho zobrazit. */
  motto: string
  bannerUrl: string | null
  bio: string
  /** Id z social/avatarFrames.ts — vyhodnoť přes resolveActiveFrameId
   *  s touhle rolí, ne přímo, ať se neplatný VIP rámeček tiše nezobrazí. */
  frameId: string | null
  /** Server je už protřídil proti user_badges (precti_verejny_profil) —
   *  co appka dostane, to má cenu rovnou vykreslit. */
  pinnedBadges: string[]
  /** Soukromý účet: sledování čeká na schválení a příspěvky vidí jen
   *  autor a jeho (vzájemní) přátelé — VerejnyProfilDialog.tsx podle
   *  tohohle mění text tlačítka a skrývá mřížku, dokud sledování
   *  neschválí. Vynucené na databázi (nacti_prispevky), ne jen v UI. */
  soukromy: boolean
}

/** Návrh nového přítele — social/api.ts's nactiNavrhyPratel(). */
export interface PratelskyNavrh {
  id: string
  displayName: string
  avatarUrl: string | null
  spolecni: number
}

/** Čekající žádost o sledování (jen u soukromého cíle) — buď moje
 *  odchozí, nebo cizí příchozí, kterou mám schválit/odmítnout. Žádné
 *  `id` řádku: dvojice (protistrana, směr) appce stačí, přijetí/odmítnutí
 *  jde přes id protistrany (viz schvalitZadost/zrusitVazbu v api.ts). */
export interface Zadost {
  profil: SocialProfil
  /** Přišla mně, nebo jsem ji poslal já? */
  smer: 'prichozi' | 'odchozi'
  createdAt: string
}

/** Přítel = vzájemné (oboustranné) sledování — viz je_muj_pritel() na
 *  databázi. Žádné vlastní `id` vztahu: sledování jsou dva nezávislé
 *  řádky ve `follows`, ne jeden společný. */
export interface Pritel {
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
  /** Moje vlastní členství v chatu čeká na schválení (chat_members.stav
   *  = 'pozadavek') — jde jen o 1:1 chat založený někým, koho vzájemně
   *  nesleduju (viz zaloz_chat na databázi). ChatyPanel.tsx ho proto
   *  vykresluje v samostatné sekci "Požadavky na zprávy", ne mezi
   *  běžnými chaty; odpovědí (nebo tlačítkem Přijmout) se změní na
   *  false, žádost je pak i pro mě obyčejný chat. */
  pozadavek: boolean
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
  /** Cesta v privátním bucketu `chat-media`, ne plná URL — appka si
   *  k ní teprve při vykreslení vyžádá krátkodobě platný podepsaný
   *  odkaz (api.ts's ziskejUrlMedia), null u běžné textové zprávy. */
  mediaPath: string | null
  mediaType: 'image' | 'video' | 'audio' | null
  /** Kdy byla zpráva naposledy upravena — null u nezměněné. Appka drží
   *  jen aktuální text, žádnou historii předchozích verzí (stejná
   *  jednoduchost jako Discord/WhatsApp); ChatView.tsx podle tohohle
   *  pole vedle zprávy zobrazí "(upraveno)". */
  editedAt: string | null
  /** Id story, na kterou tahle zpráva reaguje/odpovídá — null u běžné
   *  zprávy. Appka pro tenhle náhled story samotnou znovu netahá (na
   *  rozdíl od replyToId appka ani nezkouší najít náhled v už
   *  načtených zprávách — story mezi nimi není), jen ukáže obecný
   *  štítek; story samotná do té doby stejně obvykle zmizí. */
  storyId: string | null
}

/** Text, který api.ts's poslatZpravu uloží do `body`, když uživatel
 *  pošle médium bez vlastního popisku — sdílené s ChatView.tsx, ať se
 *  ta samá hláška nemusí schovávat pod bublinou jako "popisek", který
 *  ve skutečnosti nikdo nenapsal. */
export const VYCHOZI_POPISEK_MEDIA: Record<'image' | 'video' | 'audio', string> = {
  image: '📷 Fotka',
  video: '🎥 Video',
  audio: '🎤 Hlasovka',
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
export const EMOJI_REAKCI = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🙏'] as const

export type DuvodNahlaseni = 'spam' | 'obtezovani' | 'nevhodny_obsah' | 'nevhodne_foto' | 'jine'

// nevhodne_foto přibylo se Sociál Fází 2 (skutečná fotka profilu přes
// Supabase Storage) — bez ML kontroly obsahu je hlášení jediná
// moderace, kterou appka nad nahranými fotkami má.
export const DUVODY: { id: DuvodNahlaseni; popis: string }[] = [
  { id: 'obtezovani', popis: 'Obtěžuje mě nebo mi vyhrožuje' },
  { id: 'nevhodny_obsah', popis: 'Posílá nevhodný obsah' },
  { id: 'nevhodne_foto', popis: 'Nevhodná profilová fotka' },
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
  /** Id nahlášeného příspěvku, pokud se hlášení týkalo příspěvku (ne
   *  zprávy) — obojí najednou nikdy nenastane. Náhled appka natáhne
   *  přes stejnou moderátorskou výjimku v RLS na `posts`, jakou zprávy
   *  mají odjakživa (viditelné jen když k nim existuje hlášení). */
  postId: string | null
  postMediaUrl: string | null
  postMediaType: 'image' | 'video' | null
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

// ==========================================
// Stories
//
// Vlastní tabulky (stories/story_views), ne rozšíření Zprava/Chat výš —
// story nepatří žádnému chatu, je to jeden příspěvek viditelný všem
// přátelům najednou a mizí po 24 h stejným "belt and suspenders"
// mechanismem jako tajne_zpravy (RLS skryje prošlou story hned, úklidová
// funkce ji fyzicky smaže později). Na rozdíl od tajného chatu bez
// šifrování — obsahem je jedna veřejná (mezi přáteli) fotka, ne
// soukromá konverzace, takže tu není co skrývat před samotným Supabase.
// ==========================================

export interface Story {
  id: string
  autorId: string
  /** Cesta v privátním bucketu `stories`, ne plná URL — stejný důvod
   *  jako Zprava.mediaPath výš, jen jiný bucket (api.ts's ziskejUrlStory). */
  mediaPath: string
  caption: string | null
  createdAt: string
  expiruje: string
}

/**
 * Stories jednoho autora seskupené pro pruh nahoře v MujProfilPanel.tsx —
 * appka je nezobrazuje jako plochý seznam, ale po autorech s kroužkem
 * kolem avatara, stejně jako Instagram/TikTok.
 */
export interface StorySkupina {
  autor: SocialProfil
  stories: Story[]
  /** Přihlášený viděl už úplně všechny — určuje, jestli je kroužek
   *  barevný, nebo jen šedý (už zhlédnuto). */
  vsechnyZhlednute: boolean
}

/** Kdo si moji story přečetl — StoryProhlizec.tsx to ukáže autorovi
 *  pod otevřenou story, ne cizímu divákovi. */
export interface StoryZhlednuti {
  viewer: SocialProfil
  zhlednutoAt: string
}

// ==========================================
// Sledování (follow) — od sjednocení s přátelstvím jediný vztahový
// model appky (viz je_muj_pritel() na databázi). U veřejného účtu je
// sledování okamžité, jako na Instagramu; u soukromého čeká na
// schválení cílem (stav 'cekajici'), než se stane 'prijato'. Vzájemné
// (oboustranně 'prijato') sledování = přítel — to je to, co appka dřív
// řešila zvlášť přes friendships. Vlastní tabulka (`follows`), protože
// vztah je z podstaty jednosměrný (dva řádky, ne jeden sdílený).
// ==========================================

/** Vztah sledování mezi přihlášeným a cílovým účtem, z pohledu appky —
 *  vrací ho api.ts's nactiVztahSledovani(), ne přímé čtení `follows`
 *  (appka nesmí vytáhnout cizí kompletní seznam sledujících/sledovaných,
 *  jen počty a svůj vlastní vztah k jednomu konkrétnímu účtu). */
export interface VztahSledovani {
  stavSledovani: 'nesleduje' | 'cekajici' | 'prijato'
  sledujiciCelkem: number
  sledovaniCelkem: number
}

// ==========================================
// Trvalé příspěvky na profilu — na rozdíl od Story (24 h, mizí) tu
// zůstávají natrvalo, dokud je autor sám nesmaže. Vlastní tabulka
// (`posts`), veřejný bucket (jako avatáry, ne privátní jako u chatu/
// story) — příspěvek na profilu je zamýšlený jako veřejně viditelný.
// ==========================================

export interface Prispevek {
  id: string
  autorId: string
  /** Cesta ve veřejném bucketu `posts` — appka tu (na rozdíl od
   *  Zprava.mediaPath/Story.mediaPath) rovnou ukládá i plnou veřejnou
   *  URL (mediaUrl), žádný podepsaný odkaz není potřeba. */
  mediaPath: string
  mediaUrl: string
  mediaType: 'image' | 'video'
  caption: string | null
  createdAt: string
}

// ==========================================
// Lajky a komentáře — první skutečný engagement u příspěvků (dřív jen
// galerie bez zpětné vazby). Viditelnost kopíruje viditelnost samotného
// příspěvku (soukromý účet skrývá obojí před nepřáteli, viz
// smi_videt_prispevky_uzivatele na databázi) — appka to sama nehlídá,
// jen se spolehne na to, co RLS vrátí/dovolí.
// ==========================================

/** Vztah přihlášeného k jednomu příspěvku — appka ho natáhne, až
 *  PrispevekProhlizec.tsx příspěvek otevře, ne pro celou mřížku
 *  najednou (viz nactiVztahKPrispevku v api.ts). */
export interface VztahKPrispevku {
  pocetLajku: number
  lajkujiJa: boolean
}

export interface Komentar {
  id: string
  postId: string
  autor: SocialProfil
  text: string
  createdAt: string
  /** Id komentáře, na který tenhle odpovídá — null u kořenového
   *  komentáře. Appka vlákno drží jen jednu úroveň hluboko (odpověď na
   *  odpověď se přiřadí ke stejnému kořeni, ne do dalšího zanoření) —
   *  stejná plochá hloubka jako u Instagramu. */
  replyToId: string | null
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
