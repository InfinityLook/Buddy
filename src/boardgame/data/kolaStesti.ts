// ==========================================
// Buddyho Trh — Fáze 3: katalog výsledků kola štěstí. Na rozdíl od
// Osudu (data/udalosti.ts, 12 karet se stejnou šancí na vytažení) má
// skutečné kolo štěstí segmenty RŮZNÉ velikosti — malá šance na velkou
// výhru, větší šance na nic moc — proto `vaha` (relativní velikost
// segmentu na kole), ne rovnoměrný výběr indexu jako u Osudu.
// ==========================================

export type EfektKola = { typ: 'penize'; castka: number } | { typ: 'bonusovy-hod' } | { typ: 'nic' }

export interface VysledekKola {
  id: string
  text: string
  efekt: EfektKola
  /** Relativní velikost segmentu na kole — appka z nich počítá podíl
   *  z CELKOVA_VAHA, žádná absolutní jednotka (procenta, stupně). */
  vaha: number
  /** Barva segmentu na vykresleném kole (viz conicGradientKola níž) —
   *  čistě vizuální, engine ji nikde nečte. */
  barva: string
}

export const VYSLEDKY_KOLA: VysledekKola[] = [
  { id: 'jackpot', text: '🎉 JACKPOT! Vyhráváš velkou výhru!', efekt: { typ: 'penize', castka: 300 }, vaha: 1, barva: '#f5c518' },
  { id: 'velka-vyhra', text: 'Velká výhra!', efekt: { typ: 'penize', castka: 150 }, vaha: 2, barva: '#4caf50' },
  { id: 'mala-vyhra', text: 'Malá výhra.', efekt: { typ: 'penize', castka: 60 }, vaha: 4, barva: '#8bc34a' },
  { id: 'bonus-hod', text: 'Bonusový hod navíc! Házíš znovu.', efekt: { typ: 'bonusovy-hod' }, vaha: 3, barva: '#2196f3' },
  {
    id: 'nic',
    text: 'Kolo se zastavilo na prázdném poli. Nic se nestalo.',
    efekt: { typ: 'nic' },
    vaha: 5,
    barva: '#78909c',
  },
  { id: 'mala-smula', text: 'Malá smůla.', efekt: { typ: 'penize', castka: -40 }, vaha: 4, barva: '#ff7043' },
  { id: 'velka-smula', text: 'Velká smůla!', efekt: { typ: 'penize', castka: -120 }, vaha: 2, barva: '#e53935' },
]

const CELKOVA_VAHA = VYSLEDKY_KOLA.reduce((soucet, v) => soucet + v.vaha, 0)

/** Vybere výsledek kola váženou náhodou — `nahodne() * CELKOVA_VAHA`
 *  projde kumulativní váhy popořadě a vrátí první segment, do kterého
 *  hod "spadne". Stejný injektovatelný `nahodne` (deterministické
 *  testy na přesných hranicích mezi segmenty) jako engine.ts's
 *  krokHodu / UDALOSTI výběr v data/udalosti.ts. */
export const vyberVysledekKola = (nahodne: () => number = Math.random): VysledekKola => {
  const hod = nahodne() * CELKOVA_VAHA
  let kumulativne = 0
  for (const vysledek of VYSLEDKY_KOLA) {
    kumulativne += vysledek.vaha
    if (hod < kumulativne) return vysledek
  }
  // Nedosažitelné při korektním nahodne() v [0, 1), ale appka se radši
  // vrátí k poslednímu segmentu než spadla na undefined kvůli
  // zaokrouhlovací chybě na úplné hranici.
  return VYSLEDKY_KOLA[VYSLEDKY_KOLA.length - 1]
}

/** Středový úhel (ve stupních, 0–360) segmentu daného výsledku na
 *  kole — appka ho používá VÝHRADNĚ k vizuálnímu dotočení animace
 *  kola na výsledek, který engine už rozhodl (viz Deska.tsx), nikdy k
 *  rozhodnutí samotnému — engine o úhlech vůbec neví. */
export const stredovyUhelVysledku = (id: string): number => {
  let kumulativne = 0
  for (const vysledek of VYSLEDKY_KOLA) {
    const zacatek = kumulativne
    kumulativne += vysledek.vaha
    if (vysledek.id === id) return ((zacatek + vysledek.vaha / 2) / CELKOVA_VAHA) * 360
  }
  return 0
}

/** Sestaví CSS `conic-gradient` řetězec reprezentující kolo jako
 *  barevné výseče proporcionální k vahám — appka tak kolo vykreslí
 *  jedním gradientem na kruhovém <div>, žádná knihovna, žádné ruční
 *  SVG dráhy pro každou výseč (stejná "appka to umí sama" disciplína
 *  jako konfety/waveform jinde v appce). */
export const conicGradientKola = (): string => {
  let kumulativne = 0
  const casti = VYSLEDKY_KOLA.map((v) => {
    const zacatek = (kumulativne / CELKOVA_VAHA) * 360
    kumulativne += v.vaha
    const konec = (kumulativne / CELKOVA_VAHA) * 360
    return `${v.barva} ${zacatek}deg ${konec}deg`
  })
  return `conic-gradient(${casti.join(', ')})`
}
