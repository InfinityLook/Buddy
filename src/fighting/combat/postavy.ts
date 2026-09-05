// ==========================================
// Fáze 2 — čtyři postavy specifické pro Souboj, žádná z nich není z
// RPG (Kael/Lyra/Rayen/Elara/Drakon) — explicitní rozhodnutí padlo
// přes AskUserQuestion ještě před stavbou téhle hry, Buddyheimova
// pětka zůstává jen jeho. Postava nemění TVAR enginu (pořád jen
// udar/kop/specialni + blok, viz engine.ts) — jen NÁSOBÍ jeho
// základní čísla (AKCE_DATA), čtyři odlišné styly hry bez druhého
// soubojového systému.
// ==========================================

export type PostavaId = 'pyra' | 'bulwark' | 'volt' | 'onyx'

/** Osmé kolo vylepšení — odemykatelná kosmetická varianta barvy
 *  postavy (viz kosmetika.ts pro podmínku odemčení, PostavaGrafika.tsx
 *  pro samotnou paletu). Čistě vizuální, engine tenhle typ nikde
 *  nepoužívá — na rozdíl od PostavaId neovlivňuje ŽÁDNÉ číslo souboje. */
export type VariantaPostavy = 'vychozi' | 'zlata'

// Vylepšení — speciál (specialni akce) už neznamená pro všechny čtyři
// postavy jen "silnější úder s jinými čísly" (viz efektivniAkceData v
// engine.ts, dřív jediné místo, co speciál vůbec odlišovalo). Každá
// postava teď má vlastní EFEKT, stejná myšlenka jako Buddyheimova
// specialniSchopnost (game/combat) — jen čtyři tvary místo tamních
// tří, protože tady žádný nepotřebuje sebepoškození jako Drakonův:
//  - 'poskozeni'      — čistý bonus poškození navrch (Pyra), žádný
//                        vedlejší efekt, jen tvrdší úder
//  - 'stit'            — Bulwark zásahem navíc získá štít, co pohltí
//                        úplně celý JEDEN další zásah (viz
//                        BojovnikStav.stitAktivni v types.ts)
//  - 'dvojity-zasah'   — Volt zasáhne dvakrát v jedné akci (engine.ts
//                        vyhodnotí dosah/zásah dvakrát po sobě)
//  - 'vysati'          — Onyx vyléčí sám sebe o část způsobeného
//                        poškození (upíří zásah)
export type TypSpecialu = 'poskozeni' | 'stit' | 'dvojity-zasah' | 'vysati'

export interface Postava {
  id: PostavaId
  jmeno: string
  ikona: string
  podtitul: string
  /** Násobič maximálního HP proti MAX_HP z engine.ts. */
  maxHpNasobic: number
  /** Násobič rychlosti — vyšší číslo znamená rychlejší pohyb I kratší
   *  trvání (startup+recovery) všech tří útočných akcí. */
  rychlostNasobic: number
  /** Násobič poškození, které postava DÁVÁ. */
  poskozeniNasobic: number
  /** Násobič poškození, které postava PŘIJÍMÁ — pod 1 znamená
   *  odolnější, nad 1 křehčí. */
  obranaNasobic: number
  /** Násobič dosahu všech tří útočných akcí. */
  dosahNasobic: number
  /** Násobič ceny many speciálního útoku. */
  cenaManyNasobic: number
  /** Jméno speciálního útoku ve hře — čistě popisné, engine sám na
   *  jméno nekouká, jen na čísla výše. */
  nazevSpecialu: string
  /** Vylepšení — jaký EFEKT speciál navíc má (viz TypSpecialu výš). */
  specialEfekt: TypSpecialu
  /** Síla efektu speciálu — jednotka závisí na specialEfekt:
   *  'poskozeni' = dodatečný násobič poškození TOHOHLE útoku navrch
   *  (nad rámec poskozeniNasobic, který platí na všechno); 'vysati' =
   *  podíl způsobeného poškození vrácený útočníkovi jako HP.
   *  'stit'/'dvojity-zasah' tohle číslo nepoužívají (efekt je binární,
   *  ne odstupňovaný). */
  specialniSila: number
}

// Onyx má všechny násobiče přesně 1.0 kromě dosahu (jeho vlastní
// styl — dlouhý dosah) — je to výchozí postava (vytvorBojovnika bez
// druhého argumentu), takže Fáze 1 vlastních testů, napsaných ještě
// předtím, než postavy vůbec existovaly, se to netýká: žádný z nich
// netestuje přesné číslo dosahu, jen zásah/minutí přes práh, takže
// zůstávají platné beze změny.
export const POSTAVY: Record<PostavaId, Postava> = {
  onyx: {
    id: 'onyx',
    jmeno: 'Onyx',
    ikona: '🗡️',
    podtitul: 'Stínový soupeř s dlouhým dosahem',
    maxHpNasobic: 1.0,
    rychlostNasobic: 1.0,
    poskozeniNasobic: 1.0,
    obranaNasobic: 1.0,
    dosahNasobic: 1.2,
    cenaManyNasobic: 1.0,
    nazevSpecialu: 'Stínový zásah',
    specialEfekt: 'vysati',
    specialniSila: 0.5,
  },
  pyra: {
    id: 'pyra',
    jmeno: 'Pyra',
    ikona: '🔥',
    podtitul: 'Ohnivá útočnice — rychlá, ale křehká',
    maxHpNasobic: 0.9,
    rychlostNasobic: 1.1,
    poskozeniNasobic: 1.15,
    obranaNasobic: 1.1,
    dosahNasobic: 1.0,
    cenaManyNasobic: 1.0,
    nazevSpecialu: 'Plamenný výpad',
    specialEfekt: 'poskozeni',
    specialniSila: 1.5,
  },
  bulwark: {
    id: 'bulwark',
    jmeno: 'Bulwark',
    ikona: '🛡️',
    podtitul: 'Obrněný strážce — pomalý, ale odolný',
    maxHpNasobic: 1.25,
    rychlostNasobic: 0.85,
    poskozeniNasobic: 0.9,
    obranaNasobic: 0.8,
    dosahNasobic: 1.1,
    cenaManyNasobic: 1.15,
    nazevSpecialu: 'Drtivý úder štítem',
    specialEfekt: 'stit',
    specialniSila: 0,
  },
  volt: {
    id: 'volt',
    jmeno: 'Volt',
    ikona: '⚡',
    podtitul: 'Elektrický blesk — nejrychlejší ze všech',
    maxHpNasobic: 0.85,
    rychlostNasobic: 1.3,
    poskozeniNasobic: 0.85,
    obranaNasobic: 1.05,
    dosahNasobic: 0.9,
    cenaManyNasobic: 0.75,
    nazevSpecialu: 'Bleskový výboj',
    specialEfekt: 'dvojity-zasah',
    specialniSila: 0,
  },
}

export const VSECHNY_POSTAVY: Postava[] = Object.values(POSTAVY)

/** Výchozí postava pro vytvorBojovnika() bez druhého argumentu —
 *  Onyx, protože jeho jediný odlišný násobič (dosah) nerozbíjí žádný
 *  z existujících Fáze 1 testů (viz komentář výše). */
export const VYCHOZI_POSTAVA: PostavaId = 'onyx'
