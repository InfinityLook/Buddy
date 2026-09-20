// ==========================================
// Posilovna — deník vah a opakování (Fitness Roomova pátá fáze
// vylepšení). Pro cviky, co appka kamerou ověřit neumí — činky,
// stroje, kladky — na rozdíl od Form Checku, který sleduje pouze
// tři cviky s tělem samotným (dřep/klik/výpad) přes MediaPipe.
// Uživatel si zapíše série sám, appka jen počítá objem a osobní
// rekordy z toho, co zadal — žádné sledování pohybu, žádná kamera.
//
// Pevná sada běžných cviků (BEZNE_CVIKY) je jen rychlá volba do
// formuláře, ne jediná možnost — stejná "pevná sada, rychlá volba,
// ne jediná možnost" zásada jako u IKONY_SKUPIN/BARVY_DNE jinde
// v appce. Vlastní název cviku appka bere stejně vážně jako
// vybraný z nabídky.
// ==========================================

export interface Serie {
  vahaKg: number
  opakovani: number
}

export interface CvikVSezeni {
  nazev: string
  serie: Serie[]
}

export interface PosilovaciSezeni {
  id: string
  cviky: CvikVSezeni[]
  poznamka: string
  createdAt: string
}

// Rychlá volba do formuláře — appka nijak neomezuje na tenhle
// seznam, uživatel může kdykoli zadat vlastní název.
export const BEZNE_CVIKY: string[] = [
  'Bench press',
  'Dřep s činkou',
  'Mrtvý tah',
  'Tlak nad hlavu',
  'Veslování v předklonu',
  'Shyby',
  'Bicepsový zdvih',
  'Tricepsové kliky na bradlech',
  'Nohy v lehu (leg press)',
  'Stahování kladky',
]

export const objemSerie = (s: Serie): number => s.vahaKg * s.opakovani

export const objemCviku = (c: CvikVSezeni): number => c.serie.reduce((soucet, s) => soucet + objemSerie(s), 0)

export const objemSezeni = (s: PosilovaciSezeni): number => s.cviky.reduce((soucet, c) => soucet + objemCviku(c), 0)

export const celkovyObjem = (sezeni: PosilovaciSezeni[]): number =>
  sezeni.reduce((soucet, s) => soucet + objemSezeni(s), 0)

export const pocetSerii = (s: PosilovaciSezeni): number => s.cviky.reduce((soucet, c) => soucet + c.serie.length, 0)

export interface OsobniRekord {
  vahaKg: number
  opakovani: number
  datum: string
}

// Osobní rekord = nejtěžší jedna série kdy zaznamenaná pro daný cvik
// (ne odhadované jednorázové maximum přes nějaký vzorec — appka
// počítá jen s tím, co uživatel doopravdy zvedl). Při shodné váze
// vyhrává víc opakování. Název cviku se bere přesně tak, jak byl
// zadán — appka ho case-foldingem nesjednocuje, stejná tolerance
// jako u volného textu jinde v appce (např. Writer's Room's
// ziskejPostavy).
export const spocitejOsobniRekordy = (sezeni: PosilovaciSezeni[]): Record<string, OsobniRekord> => {
  const rekordy: Record<string, OsobniRekord> = {}

  for (const s of sezeni) {
    for (const c of s.cviky) {
      for (const serie of c.serie) {
        const stavajici = rekordy[c.nazev]
        const jeLepsi =
          !stavajici ||
          serie.vahaKg > stavajici.vahaKg ||
          (serie.vahaKg === stavajici.vahaKg && serie.opakovani > stavajici.opakovani)
        if (jeLepsi) {
          rekordy[c.nazev] = { vahaKg: serie.vahaKg, opakovani: serie.opakovani, datum: s.createdAt }
        }
      }
    }
  }

  return rekordy
}

export const formatujVahu = (kg: number): string => {
  const zaokrouhleno = Math.round(kg * 100) / 100
  const text = Number.isInteger(zaokrouhleno) ? String(zaokrouhleno) : String(zaokrouhleno).replace('.', ',')
  return `${text} kg`
}

export const formatujObjem = (kg: number): string => `${Math.round(kg).toLocaleString('cs-CZ')} kg`
