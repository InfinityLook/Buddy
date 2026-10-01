import type { Smer } from '../types'

// ==========================================
// Buddyho Trh — Fáze 2: karty událostí (Osud). Pevná sada dvanácti
// karet, stejná "pevná sada, ne libovolný vstup" disciplína jako
// appka používá jinde (IKONY_SKUPIN, BARVY_DNE) — tři typy efektu,
// přesně ty domluvené v mechanické diskuzi: peníze, posun, přeskoč
// tah.
//
// 'posun' nese svůj vlastní pevný směr + počet kroků, ne náhodný —
// na otevřené 2D mřížce nemá "dopředu" jediný smysl jako na kruhové
// dráze klasického Monopoly, takže každá karta sama říká kam. Pohyb
// po vytažení karty (viz engine.ts's aplikujEfektKartyUdalosti) jede
// stejnou hranici-respektující logikou jako obyčejný tah — zastaví
// se u okraje mřížky, nepřeteče — a NIKDY nespouští druhé
// vyhodnocení (nájem/nabídka koupě/další karta) na nové pozici:
// jedna karta, jeden efekt, žádný řetězec.
//
// 'preskoc-tah' nenastaví přímo konec tahu — appka ji konzumuje až
// na ZAČÁTKU hráčova PŘÍŠTÍHO tahu (viz engine.ts's krokHodu), ne
// hned při vytažení, protože kartu vytáhl uprostřed svého
// aktuálního tahu.
// ==========================================

export type EfektUdalosti = { typ: 'penize'; castka: number } | { typ: 'posun'; smer: Smer; kroku: number } | { typ: 'preskoc-tah' }

export interface UdalostKarta {
  id: string
  text: string
  efekt: EfektUdalosti
}

export const UDALOSTI: UdalostKarta[] = [
  { id: 'vyhodny-nakup', text: 'Výhodný nákup! Prodal jsi přebytečné zboží.', efekt: { typ: 'penize', castka: 80 } },
  { id: 'sleva-dodavatel', text: 'Sleva od dodavatele.', efekt: { typ: 'penize', castka: 50 } },
  { id: 'pokazene-zbozi', text: 'Pokazilo se zboží ve skladu.', efekt: { typ: 'penize', castka: -40 } },
  { id: 'zamecnik', text: 'Zapomněl jsi klíče od krámku, platíš zámečníka.', efekt: { typ: 'penize', castka: -60 } },
  { id: 'dan-z-obratu', text: 'Nečekaná daň z obratu.', efekt: { typ: 'penize', castka: -30 } },
  {
    id: 'zkratka-vpravo',
    text: 'Zkratka tržištěm! Posuň se o 2 pole doprava.',
    efekt: { typ: 'posun', smer: 'vpravo', kroku: 2 },
  },
  { id: 'dav-vlevo', text: 'Dav tě odstrčil doleva.', efekt: { typ: 'posun', smer: 'vlevo', kroku: 2 } },
  { id: 'rychla-stezka', text: 'Objevil jsi rychlou stezku!', efekt: { typ: 'posun', smer: 'dolu', kroku: 1 } },
  { id: 'zabloudil', text: 'Zabloudil jsi v uličkách.', efekt: { typ: 'posun', smer: 'nahoru', kroku: 1 } },
  { id: 'nachlazeni', text: 'Nachladl jsi na trhu. Příští tah vynecháváš.', efekt: { typ: 'preskoc-tah' } },
  { id: 'fronta', text: 'Čekáš dlouhou frontu u pokladny. Příští tah vynecháváš.', efekt: { typ: 'preskoc-tah' } },
  {
    id: 'vyjednavani',
    text: 'Zapletl ses do dlouhého vyjednávání. Příští tah vynecháváš.',
    efekt: { typ: 'preskoc-tah' },
  },
]
