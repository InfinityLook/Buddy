// ==========================================
// Buddyho Trh — Fáze 6: katalogy pro tři minihry (Tržní pexeso,
// Dražba, Rychlá aukce s časovačem) spouštěné z "Minihra" polí (viz
// minihry.ts). Appka vybírá TYP minihry náhodně, stejně jako Osud
// (data/udalosti.ts) a kolo štěstí (data/kolaStesti.ts) vybírají
// SVŮJ výsledek náhodně — ale na rozdíl od obou, výsledek samotné
// minihry (shoda/neshoda karet, výsledek dražby, přesnost zásahu) je
// VŽDYCKY rozhodnutý dalším hráčovým rozhodnutím, ne jediným
// vytažením při doběhnutí na pole.
// ==========================================

export type TypMinihry = 'pexeso' | 'drazba' | 'rychla-aukce'

export interface DefiniceMinihry {
  typ: TypMinihry
  nazev: string
  ikona: string
  popis: string
}

/** Pevná sada tří minihier — appka mezi nimi vybírá rovnoměrně
 *  náhodně (viz vyberTypMinihry níž), žádná váha jako u kola štěstí,
 *  protože nic takové odstupňování nežádalo. */
export const MINIHRY: DefiniceMinihry[] = [
  {
    typ: 'pexeso',
    nazev: 'Tržní pexeso',
    ikona: '🧠',
    popis: 'Najdi všechny dvojice tržního zboží — čím míň pokusů, tím víc kreditů.',
  },
  {
    typ: 'drazba',
    nazev: 'Dražba',
    ikona: '🔨',
    popis: 'Jedno kolo dokola — každý hráč má jednu šanci přihodit, nebo se vzdát.',
  },
  {
    typ: 'rychla-aukce',
    nazev: 'Rychlá aukce',
    ikona: '⚡',
    popis: 'Chyť ukazatel přesně uprostřed a získej odměnu podle přesnosti.',
  },
]

export const MINIHRY_PODLE_TYPU: Record<TypMinihry, DefiniceMinihry> = Object.fromEntries(
  MINIHRY.map((m) => [m.typ, m])
) as Record<TypMinihry, DefiniceMinihry>

/** Vybere typ minihry rovnoměrně náhodně — appka to volá přesně
 *  jednou, v okamžiku doběhnutí na "Minihra" pole (viz engine.ts's
 *  krokPohybu), nikdy znova v průběhu té samé minihry. */
export const vyberTypMinihry = (nahodne: () => number = Math.random): DefiniceMinihry => {
  const index = Math.min(Math.floor(nahodne() * MINIHRY.length), MINIHRY.length - 1)
  return MINIHRY[index]
}

// ---------- Tržní pexeso ----------

/** Šest symbolů tržního zboží — appka je zdvojí (dvanáct karet, šest
 *  dvojic), žádná jiná sada se v týhle appce nepoužívá, takže
 *  kolize ve zobrazení (dva stejné emoji ve dvou různých systémech)
 *  nehrozí. */
export const SYMBOLY_PEXESA: string[] = ['🍞', '🥖', '🧀', '🍯', '🍅', '🥕']

export const POCET_PARU_PEXESA = SYMBOLY_PEXESA.length

export const ODMENA_ZA_PEXESO_ZAKLAD = 200
export const PENALE_ZA_POKUS_PEXESA = 15
export const MIN_ODMENA_PEXESA = 50

/** Spočítá odměnu za vyluštěné pexeso — základ mínus penále za každý
 *  pokus NAD minimální možný počet (= počet dvojic, kdyby hráč hádal
 *  pokaždé napoprvé správně), nikdy pod spodní hranicí. */
export const odmenaZaPexeso = (pokusy: number): number =>
  Math.max(MIN_ODMENA_PEXESA, ODMENA_ZA_PEXESO_ZAKLAD - Math.max(0, pokusy - POCET_PARU_PEXESA) * PENALE_ZA_POKUS_PEXESA)

// ---------- Dražba ----------

export interface PolozkaDrazby {
  id: string
  nazev: string
  ikona: string
  /** První platná nabídka v dražbě musí přesně na tuhle částku —
   *  appka to zajistí tím, že `StavDrazby.aktualniNabidka` start
   *  o PRIHOZ_DRAZBY NÍŽ (viz engine.ts's otevriMinihru). */
  vyvolavaciCena: number
  /** Skutečná hodnota předmětu — appka ji vítězi připíše VEDLE
   *  zaplacené ceny (ne místo ní), takže vydražit pod hodnotu je
   *  čistý zisk, nad hodnotu reálná ztráta — skutečné riziko dražby,
   *  ne jen "zaplať a dostaň zpátky totéž". */
  hodnota: number
}

export const PRIHOZ_DRAZBY = 20

export const POLOZKY_DRAZBY: PolozkaDrazby[] = [
  { id: 'koberec', nazev: 'Vzácný koberec', ikona: '🧶', vyvolavaciCena: 50, hodnota: 180 },
  { id: 'mapa', nazev: 'Stará mapa', ikona: '🗺️', vyvolavaciCena: 30, hodnota: 90 },
  { id: 'prsten', nazev: 'Zlatý prsten', ikona: '💍', vyvolavaciCena: 80, hodnota: 150 },
  { id: 'bedna', nazev: 'Tajemná bedna', ikona: '📦', vyvolavaciCena: 40, hodnota: 60 },
  { id: 'hodiny', nazev: 'Antické hodiny', ikona: '🕰️', vyvolavaciCena: 60, hodnota: 200 },
]

export const POLOZKY_DRAZBY_PODLE_ID: Record<string, PolozkaDrazby> = Object.fromEntries(
  POLOZKY_DRAZBY.map((p) => [p.id, p])
)

// ---------- Rychlá aukce s časovačem ----------

/** Appka tu VĚDOMĚ opouští svůj jinak striktně deterministický engine
 *  — ukazatel na obrazovce (Deska.tsx's RychlaAukceHra) se pohybuje
 *  podle SKUTEČNÉHO uplynulého reálného času (performance.now()), ne
 *  podle injektovatelného `nahodne`, protože celá minihra je
 *  "reaguj na pohybující se cíl", a appka nemá jak reálnou reakční
 *  dobu hráče simulovat jinak než doopravdy. Engine sám o tomhle
 *  pohybu vůbec neví — dostane jen hotové číslo `presnost` (0–100) a
 *  z něj čistě, deterministicky odvodí odměnu (viz
 *  engine.ts's vyhodnotRychlouAukci), takže TOHLE je pořád plně
 *  testovatelné bez reálných hodin. Reálný čas appka potřebuje jen k
 *  vykreslení pohybujícího se ukazatele, nikdy k rozhodnutí o odměně. */
export interface OdmenaRychleAukce {
  minPresnost: number
  odmena: number
  text: string
}

/** Seřazeno sestupně podle minPresnost — appka projde popořadě a
 *  vezme PRVNÍ stupeň, do kterého skutečná přesnost spadá. */
export const ODMENY_RYCHLE_AUKCE: OdmenaRychleAukce[] = [
  { minPresnost: 90, odmena: 250, text: 'Dokonalý zásah!' },
  { minPresnost: 70, odmena: 120, text: 'Výborný odhad!' },
  { minPresnost: 40, odmena: 50, text: 'Slušný pokus.' },
  { minPresnost: 0, odmena: 0, text: 'Mimo — tentokrát nic.' },
]

/** Najde odpovídající stupeň odměny pro danou přesnost (0–100) —
 *  čistá, plně deterministická funkce, viz komentář u
 *  ODMENY_RYCHLE_AUKCE výš proč tahle část JE testovatelná, i když
 *  samotné odměření přesnosti v Deska.tsx testovatelné není. */
export const stupenOdmenyRychleAukce = (presnost: number): OdmenaRychleAukce => {
  const orezana = Math.max(0, Math.min(100, presnost))
  return ODMENY_RYCHLE_AUKCE.find((o) => orezana >= o.minPresnost) ?? ODMENY_RYCHLE_AUKCE[ODMENY_RYCHLE_AUKCE.length - 1]
}
