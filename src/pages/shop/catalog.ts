import { VIP_DURATIONS } from '@/core/role'
import type { CreditPack, ShopCategory, ShopCategoryMeta, ShopItem, VipPlan } from './types'

// ==========================================
// Nabídka obchodu.
//
// Ceny jsou v haléřích, aby se s nimi počítalo v celých číslech —
// 129.90 v plovoucí čárce se dřív nebo později rozejde se součtem.
// Formátování na koruny dělá formatPrice níž.
//
// Katalog je zatím tady v kódu. Až ho bude vydávat server, vymění se
// jen zdroj — typy i komponenty zůstanou.
// ==========================================

/** Formát ceny v korunách, tak jak ji uvidí uživatel. */
export const formatPrice = (haler: number): string =>
  (haler / 100).toLocaleString('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

// ==========================================
// Kredity za peníze
// ==========================================

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack-start',
    title: 'Startovní',
    credits: 100,
    bonusCredits: 0,
    priceHaler: 4900,
    icon: '🪙',
  },
  {
    id: 'pack-standard',
    title: 'Standard',
    credits: 300,
    bonusCredits: 30,
    priceHaler: 12900,
    icon: '💰',
    highlight: true,
    tag: 'Nejoblíbenější',
  },
  {
    id: 'pack-velky',
    title: 'Velký',
    credits: 800,
    bonusCredits: 150,
    priceHaler: 29900,
    icon: '💎',
  },
  {
    id: 'pack-mega',
    title: 'Mega',
    credits: 2000,
    bonusCredits: 500,
    priceHaler: 64900,
    icon: '🏆',
    tag: 'Nejvíc kreditů',
  },
]

/** Kolik kreditů balíček dohromady dá. */
export const packTotalCredits = (pack: CreditPack): number => pack.credits + pack.bonusCredits

// ==========================================
// VIP předplatné
// ==========================================

const MESICNI_HALER = 9900

// Cena za měsíc u delších variant. Počítá se z celkové ceny, ať štítek
// se slevou nemůže tvrdit něco jiného, než co si uživatel zaplatí.
const naMesic = (celkem: number, dny: number): number => Math.round((celkem / dny) * 30)

const sleva = (mesicne: number): number =>
  Math.round((1 - mesicne / MESICNI_HALER) * 100)

export const VIP_PLANS: VipPlan[] = [
  {
    id: 'vip-mesic',
    duration: 'month',
    title: 'Měsíc',
    days: VIP_DURATIONS.month,
    priceHaler: MESICNI_HALER,
    monthlyHaler: MESICNI_HALER,
    savingPercent: 0,
  },
  {
    id: 'vip-pulrok',
    duration: 'halfYear',
    title: 'Půl roku',
    days: VIP_DURATIONS.halfYear,
    priceHaler: 44900,
    monthlyHaler: naMesic(44900, VIP_DURATIONS.halfYear),
    savingPercent: sleva(naMesic(44900, VIP_DURATIONS.halfYear)),
    highlight: true,
    tag: 'Nejlepší poměr',
  },
  {
    id: 'vip-rok',
    duration: 'year',
    title: 'Rok',
    days: VIP_DURATIONS.year,
    priceHaler: 79900,
    monthlyHaler: naMesic(79900, VIP_DURATIONS.year),
    savingPercent: sleva(naMesic(79900, VIP_DURATIONS.year)),
    tag: 'Nejvíc ušetříš',
  },
]

/** Co VIP obnáší. Vypisuje se u nabídky předplatného. */
export const VIP_BENEFITS: { icon: string; text: string }[] = [
  { icon: '🎨', text: 'Všechny prémiové motivy a pozadí' },
  { icon: '🖼️', text: 'Exkluzivní avataři a rámečky profilu' },
  { icon: '⚡', text: 'Násobiče XP a záchrana přerušené série' },
  { icon: '🎁', text: 'Kredity každý měsíc zdarma' },
  { icon: '💬', text: 'Přednostní podpora' },
]

// ==========================================
// Zboží za kredity
// ==========================================

export const SHOP_CATEGORIES: ShopCategoryMeta[] = [
  {
    id: 'vzhled',
    title: 'Vzhledy a motivy',
    description: 'Barvy, pozadí a nálada celé aplikace',
    icon: '🎨',
  },
  {
    id: 'avatar',
    title: 'Avataři a doplňky',
    description: 'Obrázek profilu, rámečky a ozdoby',
    icon: '🖼️',
  },
  {
    id: 'postup',
    title: 'Zrychlení postupu',
    description: 'Násobiče XP a záchrana série',
    icon: '⚡',
  },
  {
    id: 'funkce',
    title: 'Odemčení funkcí',
    description: 'Funkce nad rámec základní aplikace',
    icon: '🔓',
  },
]

export const SHOP_ITEMS: ShopItem[] = [
  // --- Vzhledy ---
  {
    id: 'theme-neon',
    category: 'vzhled',
    title: 'Tmavý neon',
    description: 'Sytě modrá s neonovým nádechem. Šetrná k očím po večerech.',
    icon: '🌃',
    price: 250,
    permanent: true,
  },
  {
    id: 'theme-rano',
    category: 'vzhled',
    title: 'Pastelové ráno',
    description: 'Světlé tóny do ruky na denní učení.',
    icon: '🌅',
    price: 250,
    permanent: true,
  },
  {
    id: 'theme-vesmir',
    category: 'vzhled',
    title: 'Vesmír',
    description: 'Hvězdné pozadí, které se pomalu hýbe.',
    icon: '🌌',
    price: 400,
    permanent: true,
  },
  {
    id: 'theme-zlaty',
    category: 'vzhled',
    title: 'Zlatý standard',
    description: 'Zlaté akcenty po celé aplikaci. Jen pro VIP.',
    icon: '✨',
    price: 600,
    permanent: true,
    vipOnly: true,
  },

  // --- Avataři ---
  {
    id: 'avatar-ramecek-zlaty',
    category: 'avatar',
    title: 'Zlatý rámeček',
    description: 'Rámeček kolem profilové fotky.',
    icon: '🥇',
    price: 300,
    permanent: true,
  },
  {
    id: 'avatar-holo',
    category: 'avatar',
    title: 'Holografický avatar',
    description: 'Avatar, který přelévá barvy podle náklonu.',
    icon: '🔮',
    price: 500,
    permanent: true,
  },
  {
    id: 'avatar-koruna',
    category: 'avatar',
    title: 'Koruna nad jménem',
    description: 'Ozdoba u jména v Hubu i v profilu. Jen pro VIP.',
    icon: '👑',
    price: 450,
    permanent: true,
    vipOnly: true,
  },

  // --- Zrychlení postupu ---
  {
    id: 'boost-xp-24h',
    category: 'postup',
    title: 'Dvojnásobné XP na 24 h',
    description: 'Všechno, co za den uděláš, se počítá dvakrát.',
    icon: '⚡',
    price: 200,
    permanent: false,
  },
  {
    id: 'boost-streak-zachrana',
    category: 'postup',
    title: 'Záchrana série',
    description: 'Vrátí přerušenou sérii, jako by ses ten den učil.',
    icon: '🛟',
    price: 150,
    permanent: false,
  },
  {
    id: 'boost-xp-tyden',
    category: 'postup',
    title: 'Dvojnásobné XP na týden',
    description: 'To samé, ale na sedm dní v kuse.',
    icon: '🚀',
    price: 900,
    permanent: false,
  },

  // --- Odemčení funkcí ---
  // Záměrně tu zatím nic ke koupi není: všechny miniaplikace i funkce
  // zůstávají přístupné každému. Kategorie je založená dopředu, aby se
  // do ní dalo přidat to, co teprve vznikne — ne aby se za ni schovalo
  // něco, co uživatel dneska má zadarmo.
  {
    id: 'unlock-nadchazejici',
    category: 'funkce',
    title: 'Chystá se',
    description:
      'Všechny miniaplikace máš teď dostupné bez omezení. Za kredity tu později přibude to, co k nim nově přibude.',
    icon: '🔓',
    price: 0,
    permanent: true,
    comingSoon: true,
  },
]

export const itemsByCategory = (category: ShopCategory): ShopItem[] =>
  SHOP_ITEMS.filter((item) => item.category === category)
