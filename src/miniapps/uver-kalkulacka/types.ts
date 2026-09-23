// ==========================================
// Splátkový kalkulátor — Economy Roomova nová appka. Dvě samostatné
// věci pod jednou střechou: amortizační plán JEDNÉ půjčky (anuitní
// splátka, jak ji nabízí prakticky každá banka), a simulace splácení
// VÍC dluhů najednou metodou sněhové koule nebo laviny. Čisté funkce,
// testovatelné bez store/komponenty, stejný důvod jako Financí vlastní
// types.ts.
// ==========================================

/** Anuitní (konstantní) měsíční splátka — standardní bankovní vzorec.
 *  Nulový úrok appka počítá zvlášť (dělení nulou by jinak dalo NaN)
 *  jako prostou jistinu rozpočítanou rovnoměrně na měsíce. */
export const vypocitejAnuitniSplatku = (jistina: number, urokRocniProcenta: number, pocetMesicu: number): number => {
  if (pocetMesicu <= 0 || jistina <= 0) return 0
  const i = urokRocniProcenta / 100 / 12
  if (i === 0) return jistina / pocetMesicu
  return (jistina * i) / (1 - Math.pow(1 + i, -pocetMesicu))
}

export interface SplatkaMesice {
  mesic: number
  splatka: number
  urok: number
  jistinaSplatka: number
  zbyvajiciJistina: number
}

/** Celý amortizační plán, měsíc po měsíci — poslední měsíc appka
 *  doplácí přesně zbývající jistinu, ne teoretickou anuitní splátku,
 *  ať zaokrouhlování nenechá pár korun nesplacených navěky. */
export const sestavAmortizacniPlan = (
  jistina: number,
  urokRocniProcenta: number,
  pocetMesicu: number
): SplatkaMesice[] => {
  if (jistina <= 0 || pocetMesicu <= 0) return []

  const splatka = vypocitejAnuitniSplatku(jistina, urokRocniProcenta, pocetMesicu)
  const i = urokRocniProcenta / 100 / 12
  let zbyva = jistina
  const plan: SplatkaMesice[] = []

  for (let mesic = 1; mesic <= pocetMesicu; mesic++) {
    const urok = zbyva * i
    let jistinaSplatka = splatka - urok
    if (mesic === pocetMesicu || jistinaSplatka > zbyva) jistinaSplatka = zbyva
    zbyva = Math.max(0, zbyva - jistinaSplatka)
    plan.push({
      mesic,
      splatka: Math.round(jistinaSplatka + urok),
      urok: Math.round(urok),
      jistinaSplatka: Math.round(jistinaSplatka),
      zbyvajiciJistina: Math.round(zbyva),
    })
  }

  return plan
}

/** Celkový přeplatek (součet úroku přes celý plán) — kolik appka
 *  zaplatí navíc oproti samotné jistině. */
export const celkovyPreplatek = (plan: SplatkaMesice[]): number => plan.reduce((s, m) => s + m.urok, 0)

// ==========================================
// Víc dluhů najednou — sněhová koule (nejmenší zůstatek první, rychlá
// psychologická výhra) vs. lavina (nejvyšší úrok první, matematicky
// nejlevnější). Appka řadí dluhy podle zvolené metody JEDNOU, na
// začátku simulace, ne dynamicky přeřazuje podle toho, jak se
// zůstatky v čase mění — stejné zjednodušení, jaké používá naprostá
// většina reálných kalkulaček obou metod.
// ==========================================

export interface Dluh {
  id: string
  nazev: string
  zustatek: number
  urokRocniProcenta: number
  minimalniSplatka: number
}

export type MetodaSplaceni = 'snehova-koule' | 'lavina'

export interface PolozkaPoradi {
  id: string
  nazev: string
  mesicSplaceni: number
}

export interface KrokPrubehu {
  mesic: number
  zbyvajiciCelkem: number
}

export interface VysledekSplaceni {
  /** Pořadí, ve kterém appka jednotlivé dluhy skutečně splatila, s
   *  měsícem, kdy k tomu došlo. */
  poradiSplaceni: PolozkaPoradi[]
  celkovyPocetMesicu: number
  /** Celkový zaplacený úrok přes celou simulaci, napříč všemi dluhy. */
  celkovyUrok: number
  /** Zbývající celkový dluh po každém měsíci — podklad pro graf. */
  prubeh: KrokPrubehu[]
  /** true, pokud appka ani po MAX_MESICU_SIMULACE měsících (50 let)
   *  dluhy nedoplatila — minimální splátky ani úrok navíc na to
   *  nestačí. Appka to hlásí čestně, ne že by předstírala výsledek. */
  nedokonceno: boolean
}

const MAX_MESICU_SIMULACE = 600

/** Simulace splácení víc dluhů najednou jednou z obou metod. Úrok se
 *  připisuje na začátku každého měsíce ze zbývajícího zůstatku,
 *  minimální splátky jdou na všechny aktivní dluhy zároveň, a celý
 *  zbývající měsíční rozpočet navíc jde na aktuálně prioritní dluh
 *  (podle zvolené metody) — jakmile se ten splatí, jeho minimální
 *  splátka se od PŘÍŠTÍHO měsíce přidá do rozpočtu navíc (to je
 *  podstata "koule, co se valí"). */
export const simulujSplaceniDluhu = (
  dluhy: Dluh[],
  mesicniRozpocetNavic: number,
  metoda: MetodaSplaceni
): VysledekSplaceni => {
  const aktivni = dluhy.filter((d) => d.zustatek > 0).map((d) => ({ ...d }))

  const poradiId =
    metoda === 'snehova-koule'
      ? [...aktivni].sort((a, b) => a.zustatek - b.zustatek).map((d) => d.id)
      : [...aktivni].sort((a, b) => b.urokRocniProcenta - a.urokRocniProcenta).map((d) => d.id)

  const poradiSplaceni: PolozkaPoradi[] = []
  const prubeh: KrokPrubehu[] = []
  let celkovyUrok = 0
  let rozpocetNavicCelkem = Math.max(0, mesicniRozpocetNavic)
  let mesic = 0

  while (aktivni.some((d) => d.zustatek > 0.01) && mesic < MAX_MESICU_SIMULACE) {
    mesic++

    for (const d of aktivni) {
      if (d.zustatek <= 0) continue
      const urok = d.zustatek * (d.urokRocniProcenta / 100 / 12)
      d.zustatek += urok
      celkovyUrok += urok
    }

    for (const d of aktivni) {
      if (d.zustatek <= 0) continue
      d.zustatek -= Math.min(d.minimalniSplatka, d.zustatek)
    }

    let volneNavic = rozpocetNavicCelkem
    for (const id of poradiId) {
      if (volneNavic <= 0) break
      const cil = aktivni.find((d) => d.id === id)
      if (!cil || cil.zustatek <= 0) continue
      const splatka = Math.min(volneNavic, cil.zustatek)
      cil.zustatek -= splatka
      volneNavic -= splatka
    }

    for (const id of poradiId) {
      const d = aktivni.find((a) => a.id === id)
      if (d && d.zustatek <= 0.01 && !poradiSplaceni.some((p) => p.id === id)) {
        const originalni = dluhy.find((o) => o.id === id)
        poradiSplaceni.push({ id, nazev: originalni?.nazev ?? '', mesicSplaceni: mesic })
        rozpocetNavicCelkem += originalni?.minimalniSplatka ?? 0
      }
    }

    prubeh.push({
      mesic,
      zbyvajiciCelkem: Math.max(0, Math.round(aktivni.reduce((s, d) => s + Math.max(0, d.zustatek), 0))),
    })
  }

  return {
    poradiSplaceni,
    celkovyPocetMesicu: mesic,
    celkovyUrok: Math.round(celkovyUrok),
    prubeh,
    nedokonceno: mesic >= MAX_MESICU_SIMULACE && aktivni.some((d) => d.zustatek > 0.01),
  }
}
