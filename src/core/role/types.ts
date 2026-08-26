// ==========================================
// Role uživatele a oprávnění, která z nich plynou.
//
// Role je jen popis toho, co uživatel smí. Nic se nekontroluje na základě
// jejího názvu — všude se ptáme na konkrétní oprávnění, takže přidání
// další role znamená přidat soubor do téhle složky a zapsat ho do
// registry.ts, ne procházet aplikaci a hledat, kde se role porovnává.
//
// POZOR: tohle NENÍ bezpečnostní hranice. Přiřazení role leží
// v localStorage (viz core/utils/secureStorage.ts, což je obfuskace, ne
// šifrování) a uživatel si ho může přepsat. Až budou role vázané na
// skutečné peníze, musí o nich rozhodovat server a tenhle stav bude jen
// jeho kopie pro vykreslení. Nic, co stojí peníze, se proto nesmí
// spoléhat výhradně na to, co je tady.
// ==========================================

/** Co všechno může být v aplikaci podmíněné rolí. */
export type Permission =
  // Vstup do obchodu a nákup v něm
  | 'shop.view'
  | 'shop.purchase'
  // Prémiová kosmetika — motivy, avataři, rámečky
  | 'cosmetics.premium'
  // Zrychlení postupu — násobiče XP, záchrana série
  | 'progress.boost'
  // Funkce a miniaplikace nad rámec základu.
  // Zatím na tohle nic nenavazuje, viz FEATURE_GATING_ENABLED v registry.ts.
  | 'features.premium'
  // Správa obsahu a uživatelů
  | 'moderation.content'
  | 'admin.users'
  | 'admin.catalog'
  // Vstup do administrátorského panelu (/admin) — čistě admin, žádná
  // jiná role, ani moderátor. Samo o sobě nic nechrání (viz varování
  // výš), server má vlastní jsem_admin() a admin_prehled() ho vyžaduje.
  | 'admin.panel'
  // Tajný chat v Social — mizící zprávy jen mezi VIP/moderátory/adminy
  // navzájem. Skutečnou hranici drží databáze (viz zaloz_tajny_chat/
  // posli_tajnou_zpravu), tohle jen řídí, komu se v UI vůbec ukáže
  // záložka a tlačítko.
  | 'social.secretChat'

export type RoleId = 'user' | 'vip' | 'moderator' | 'admin'

export interface RoleDefinition {
  id: RoleId
  /** Název, jak ho uvidí uživatel */
  title: string
  description: string
  icon: string
  /** Přípona CSS třídy pro barevné odlišení (role-badge--vip apod.) */
  tone: string
  permissions: Permission[]
  /**
   * Jde si roli koupit v obchodě? Moderátora ani admina nikdo nekupuje,
   * ty přiděluje správa — proto se v obchodě nesmí objevit.
   */
  purchasable: boolean
  /**
   * Pořadí pro porovnání "vyšší role". Nepoužívá se ke kontrole
   * oprávnění (od toho jsou permissions), jen k zobrazení a k rozhodnutí,
   * která role vyhraje, kdyby jich uživatel měl víc.
   */
  rank: number
}

/**
 * Konkrétní přidělení role tomuhle uživateli.
 *
 * `validUntil` je datum konce platnosti v ISO tvaru; `null` znamená bez
 * omezení. Předplacené VIP ho má vyplněné, výchozí uživatel ne. Platnost
 * se schválně nevyhodnocuje při zápisu, ale až při čtení — uložený
 * příznak "ještě platí" by po pár dnech lhal.
 */
export interface RoleAssignment {
  roleId: RoleId
  validUntil: string | null
  grantedAt: string
}
