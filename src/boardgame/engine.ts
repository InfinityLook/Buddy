import type { FazeTahu, Hrac, LimitMinut, Pole2D, Smer, TrhStav } from './types'
import type { PostavaId } from './postavy'
import { najdiObchodNaPoli, OBCHODY_PODLE_KLICE } from './obchody'
import { jeOsudovePole } from './osud'
import { jeKoloStestiPole } from './kolostesti'
import { UDALOSTI, type EfektUdalosti } from './data/udalosti'
import { vyberVysledekKola, type EfektKola } from './data/kolaStesti'
import { SABOTAZNI_AKCE } from './data/sabotaze'

// ==========================================
// Buddyho Trh — čistý herní engine, stejná disciplína jako
// src/fighting/combat/engine.ts: žádný React, žádná síť, jen funkce
// a data. `krokHodu`/`krokPohybu`/`ukonciTah` berou `TrhStav` a vrací
// nový — appka (Fáze 0) je volá jak z lokálního pass-and-play UI, tak
// (v pozdější fázi) ze sítového TV/telefon vrstvení, přesně jako
// Souboj sdílí jeden `krokSouboje` mezi LocalniZapas.tsx a TvHost.tsx.
//
// Náhoda (hod kostkou) je injektovatelná (`nahodne`), ne natvrdo
// Math.random() — stejný důvod jako u Souboj's postavy/arény: appka
// tak umí psát deterministické testy bez mockování globálu.
// ==========================================

export const SIRKA_MRIZKY = 7
export const VYSKA_MRIZKY = 7
export const POCATECNI_PENIZE = 1000

export const vytvorHrace = (
  id: string,
  jmeno: string,
  postavaId: PostavaId,
  jeBot: boolean,
  pozice: Pole2D
): Hrac => ({
  id,
  jmeno,
  postavaId,
  pozice,
  penize: POCATECNI_PENIZE,
  jeBot,
  preskociTah: false,
  maBonusovyHod: false,
  sabotazPouzita: false,
})

/** Rozmístí hráče na okraj mřížky, ať nezačínají na sobě navzájem —
 *  jednoduché rovnoměrné rozdělení po obvodu, ne náhodné (start hry
 *  nemá důvod být nedeterministický). */
export const startovniPozice = (poradi: number, pocetHracu: number): Pole2D => {
  const stred = { x: Math.floor(SIRKA_MRIZKY / 2), z: Math.floor(VYSKA_MRIZKY / 2) }
  const uhel = (poradi / Math.max(1, pocetHracu)) * Math.PI * 2
  const polomer = Math.floor(Math.min(SIRKA_MRIZKY, VYSKA_MRIZKY) / 2)
  const x = Math.max(0, Math.min(SIRKA_MRIZKY - 1, Math.round(stred.x + Math.cos(uhel) * polomer)))
  const z = Math.max(0, Math.min(VYSKA_MRIZKY - 1, Math.round(stred.z + Math.sin(uhel) * polomer)))
  return { x, z }
}

export const VYCHOZI_LIMIT_MINUT: LimitMinut = 30

export const vytvorTrhStav = (hraci: Hrac[], limitMinut: LimitMinut = VYCHOZI_LIMIT_MINUT): TrhStav => ({
  hraci,
  poradiHracu: hraci.map((h) => h.id),
  aktivniIndex: 0,
  faze: 'hod',
  zbyvaKroku: 0,
  posledniHod: null,
  sirkaMrizky: SIRKA_MRIZKY,
  vyskaMrizky: VYSKA_MRIZKY,
  konec: false,
  vlastnictvi: {},
  nabidkaKoupe: null,
  posledniUdalost: null,
  posledniVysledekKolaId: null,
  kolostestiPocet: 0,
  limitMinut,
  konecCasuMs: Date.now() + limitMinut * 60_000,
})

export const aktivniHrac = (stav: TrhStav): Hrac | undefined =>
  stav.hraci.find((h) => h.id === stav.poradiHracu[stav.aktivniIndex])

const posunPole = (p: Pole2D, smer: Smer): Pole2D => {
  switch (smer) {
    case 'nahoru':
      return { x: p.x, z: p.z - 1 }
    case 'dolu':
      return { x: p.x, z: p.z + 1 }
    case 'vlevo':
      return { x: p.x - 1, z: p.z }
    case 'vpravo':
      return { x: p.x + 1, z: p.z }
  }
}

const vHranicich = (p: Pole2D, stav: TrhStav): boolean =>
  p.x >= 0 && p.x < stav.sirkaMrizky && p.z >= 0 && p.z < stav.vyskaMrizky

/** Posune pozici o `kroku` polí daným směrem, zastaví se dřív, pokud
 *  by přešla mřížku — sdílené mezi Osudovou kartou "posun" a sabotáží
 *  "odstrčení" (Fáze 4): obě chtějí identické chování, žádné
 *  přetečení přes okraj, ne teleport na druhou stranu. */
const posunOPoleHranicemi = (pozice: Pole2D, smer: Smer, kroku: number, stav: TrhStav): Pole2D => {
  let vysledek = pozice
  for (let i = 0; i < kroku; i++) {
    const dalsi = posunPole(vysledek, smer)
    if (!vHranicich(dalsi, stav)) break
    vysledek = dalsi
  }
  return vysledek
}

/** Které směry z aktuální pozice hráče doopravdy vedou na mřížku —
 *  sdílené s ai.ts, ať bot nikdy nezkusí krok mimo hranici. */
export const platneSmery = (pozice: Pole2D, stav: TrhStav): Smer[] =>
  (['nahoru', 'dolu', 'vlevo', 'vpravo'] as Smer[]).filter((s) => vHranicich(posunPole(pozice, s), stav))

/** Hodí kostkou (1–6) a otevře fázi pohybu s tolika kroky. No-op mimo
 *  fázi 'hod' — appka i síťová vrstva klidně zavolá tuhle funkci
 *  víckrát, aniž by musela sama hlídat, jestli už se hodilo.
 *
 *  Nejdřív ale zkontroluje kartu "přeskoč tah" (Fáze 2) — pokud ji
 *  aktivní hráč nese z minulého tahu, tenhle tah se vůbec nehodí,
 *  příznak se smaže a tah rovnou přejde na dalšího hráče. */
export const krokHodu = (stav: TrhStav, nahodne: () => number = Math.random): TrhStav => {
  if (stav.faze !== 'hod' || stav.konec) return stav
  const hrac = aktivniHrac(stav)
  if (hrac?.preskociTah) {
    // Tahle větev taky přesouvá aktivniIndex na jiného hráče, stejně
    // jako ukonciTah výš — musí proto stejně resetovat sabotazPouzita
    // (Fáze 4) novému aktivnímu hráči, jinak by ho mohl zdědit ještě
    // od jeho VLASTNÍHO posledního tahu (ukonciTah to při normálním
    // předání vyřeší, ale tahle "přeskoč celý tah" větev jde kolem
    // ukonciTah úplně).
    const dalsiIndex = (stav.aktivniIndex + 1) % stav.poradiHracu.length
    const dalsiId = stav.poradiHracu[dalsiIndex]
    const noviHraci = stav.hraci.map((h) => {
      if (h.id === hrac.id) return { ...h, preskociTah: false }
      if (h.id === dalsiId) return { ...h, sabotazPouzita: false }
      return h
    })
    return {
      ...stav,
      hraci: noviHraci,
      aktivniIndex: dalsiIndex,
      faze: 'hod',
      zbyvaKroku: 0,
      posledniHod: null,
      posledniUdalost: `${hrac.jmeno} vynechává tah.`,
    }
  }
  const hod = Math.floor(nahodne() * 6) + 1
  return { ...stav, faze: 'pohyb', zbyvaKroku: hod, posledniHod: hod }
}

/** Aplikuje efekt vytažené karty Osudu (Fáze 2) na hráče, co na ni
 *  doběhl — čistá funkce, žádný vedlejší účinek mimo vrácené pole
 *  hráčů. 'posun' jede po jednom poli stejnou hranici-respektující
 *  logikou jako obyčejný tah (zastaví se dřív, nepřeteče přes
 *  okraj) a NIKDY nespouští druhé vyhodnocení na nové pozici — appka
 *  tak nikdy neřeší řetězec karta→nájem→další karta. */
const aplikujEfektKarty = (hraci: Hrac[], hracId: string, efekt: EfektUdalosti, stav: TrhStav): Hrac[] => {
  switch (efekt.typ) {
    case 'penize':
      return hraci.map((h) => (h.id === hracId ? { ...h, penize: Math.max(0, h.penize + efekt.castka) } : h))
    case 'posun': {
      const pozice = posunOPoleHranicemi(hraci.find((h) => h.id === hracId)!.pozice, efekt.smer, efekt.kroku, stav)
      return hraci.map((h) => (h.id === hracId ? { ...h, pozice } : h))
    }
    case 'preskoc-tah':
      return hraci.map((h) => (h.id === hracId ? { ...h, preskociTah: true } : h))
  }
}

/** Aplikuje efekt vytaženého výsledku kola štěstí (Fáze 3) — stejná
 *  čistá, žádný-vedlejší-účinek-mimo-vrácené-pole disciplína jako
 *  aplikujEfektKarty výš. 'bonusovy-hod' jen nastaví vlajku, skutečný
 *  druhý hod řeší `ukonciTah` (viz jeho vlastní komentář) — ne krokHodu
 *  jako u preskociTah, protože se tahle vlajka konzumuje HNED ve
 *  stejném tahu, ne na začátku příštího. */
const aplikujEfektKola = (hraci: Hrac[], hracId: string, efekt: EfektKola): Hrac[] => {
  switch (efekt.typ) {
    case 'penize':
      return hraci.map((h) => (h.id === hracId ? { ...h, penize: Math.max(0, h.penize + efekt.castka) } : h))
    case 'bonusovy-hod':
      return hraci.map((h) => (h.id === hracId ? { ...h, maBonusovyHod: true } : h))
    case 'nic':
      return hraci
  }
}

/** Posune aktivního hráče o jedno pole daným směrem. Krok mimo mřížku
 *  je tiše zahozen (nespotřebuje krok) — hráč prostě nemůže tím
 *  směrem, ne že by přišel o pohyb navíc za to, že to zkusil. Fáze
 *  přejde na 'konec-tahu', jakmile dojdou kroky — a jen tehdy, na
 *  úplně poslední doběhnuté políčko, se řeší ekonomika (nájem/nabídka
 *  koupě), karta Osudu (Fáze 2) nebo kolo štěstí (Fáze 3), stejně jako
 *  v Monopoly rozhoduje jen políčko, na kterém hráč doopravdy skončí,
 *  ne ta, přes která jen prošel.
 *
 *  `nahodne` je injektovatelné (stejně jako u krokHodu) kvůli
 *  deterministickým testům vytažené karty/kola — appka ho jinak v
 *  reálné hře vůbec neřeší, defaultní Math.random stačí. */
export const krokPohybu = (stav: TrhStav, smer: Smer, nahodne: () => number = Math.random): TrhStav => {
  if (stav.faze !== 'pohyb' || stav.zbyvaKroku <= 0 || stav.konec) return stav
  const hrac = aktivniHrac(stav)
  if (!hrac) return stav

  const novaPozice = posunPole(hrac.pozice, smer)
  if (!vHranicich(novaPozice, stav)) return stav

  let noviHraci = stav.hraci.map((h) => (h.id === hrac.id ? { ...h, pozice: novaPozice } : h))
  const zbyva = stav.zbyvaKroku - 1
  const doslo = zbyva <= 0

  let nabidkaKoupe: string | null = null
  let posledniUdalost = stav.posledniUdalost
  let posledniVysledekKolaId = stav.posledniVysledekKolaId
  let kolostestiPocet = stav.kolostestiPocet

  if (doslo) {
    const obchod = najdiObchodNaPoli(novaPozice)
    if (obchod) {
      const vlastnikId = stav.vlastnictvi[obchod.klic]
      if (!vlastnikId) {
        nabidkaKoupe = obchod.klic
      } else if (vlastnikId !== hrac.id) {
        const najemce = noviHraci.find((h) => h.id === hrac.id)!
        const castka = Math.min(najemce.penize, obchod.najem)
        noviHraci = noviHraci.map((h) => {
          if (h.id === hrac.id) return { ...h, penize: h.penize - castka }
          if (h.id === vlastnikId) return { ...h, penize: h.penize + castka }
          return h
        })
        const vlastnik = stav.hraci.find((h) => h.id === vlastnikId)
        posledniUdalost = `${hrac.jmeno} zaplatil ${castka} kreditů hráči ${vlastnik?.jmeno ?? '?'} za ${obchod.nazev}.`
      }
    } else if (jeOsudovePole(novaPozice)) {
      const karta = UDALOSTI[Math.min(Math.floor(nahodne() * UDALOSTI.length), UDALOSTI.length - 1)]
      noviHraci = aplikujEfektKarty(noviHraci, hrac.id, karta.efekt, stav)
      posledniUdalost = `🔮 ${hrac.jmeno}: ${karta.text}`
    } else if (jeKoloStestiPole(novaPozice)) {
      const vysledek = vyberVysledekKola(nahodne)
      noviHraci = aplikujEfektKola(noviHraci, hrac.id, vysledek.efekt)
      posledniUdalost = `🎡 ${hrac.jmeno}: ${vysledek.text}`
      posledniVysledekKolaId = vysledek.id
      kolostestiPocet = stav.kolostestiPocet + 1
    }
  }

  return {
    ...stav,
    hraci: noviHraci,
    zbyvaKroku: zbyva,
    faze: doslo ? ('konec-tahu' as FazeTahu) : ('pohyb' as FazeTahu),
    nabidkaKoupe,
    posledniUdalost,
    posledniVysledekKolaId,
    kolostestiPocet,
  }
}

/** Koupí obchod, na který právě aktivní hráč doběhl — no-op, pokud
 *  žádná nabídka koupě neběží nebo na ni hráč nemá dost peněz. UI
 *  (Deska.tsx) tohle taky kontroluje a tlačítko rovnou zablokuje, ale
 *  engine si to hlídá nezávisle, stejný "nedůvěřuj jen volajícímu"
 *  postoj jako `krokHodu`/`krokPohybu` mají vůči vlastní fázi. */
export const koupitPole = (stav: TrhStav): TrhStav => {
  if (!stav.nabidkaKoupe || stav.konec) return stav
  const obchod = OBCHODY_PODLE_KLICE[stav.nabidkaKoupe]
  const hrac = aktivniHrac(stav)
  if (!obchod || !hrac || hrac.penize < obchod.cena) return stav

  return {
    ...stav,
    hraci: stav.hraci.map((h) => (h.id === hrac.id ? { ...h, penize: h.penize - obchod.cena } : h)),
    vlastnictvi: { ...stav.vlastnictvi, [obchod.klic]: hrac.id },
    nabidkaKoupe: null,
    posledniUdalost: `${hrac.jmeno} koupil ${obchod.nazev} za ${obchod.cena} kreditů.`,
  }
}

/** Odmítne nabídku koupě — obchod zůstává bance, tah může pokračovat
 *  ke konci. */
export const odmitnoutKoupi = (stav: TrhStav): TrhStav => {
  if (!stav.nabidkaKoupe) return stav
  return { ...stav, nabidkaKoupe: null }
}

/** Provede sabotážní akci aktivního hráče proti vybranému soupeři
 *  (Fáze 4) — na rozdíl od Osudu/kola štěstí (appka je vybírá sama
 *  náhodou, když na ně hráč políčkem narazí) je sabotáž VOLBA
 *  aktivního hráče, dostupná jen ve fázi 'konec-tahu' (po doběhnutí
 *  pohybu, po vyřešení políčka, na kterém skončil) a nejvýš jednou za
 *  tah — `Hrac.sabotazPouzita` se resetuje vždycky, když se
 *  `aktivniIndex` doopravdy přesune na někoho jiného (viz
 *  `ukonciTah`/`krokHodu`'s "přeskoč tah" větev níž), nikdy uvnitř
 *  bonusového hodu kola štěstí (ten nepočítá jako nový tah — pořád
 *  stejný hráč, pořád stejná už-vyčerpaná sabotáž).
 *
 *  Stejná "nedůvěřuj volajícímu" disciplína jako `koupitPole` — UI
 *  tlačítko appka sama zablokuje, ale engine si každou podmínku
 *  ověřuje znovu nezávisle. */
export const provedSabotaz = (stav: TrhStav, akceId: string, cilId: string): TrhStav => {
  if (stav.faze !== 'konec-tahu' || stav.konec || stav.nabidkaKoupe) return stav
  const utocnik = aktivniHrac(stav)
  if (!utocnik || utocnik.sabotazPouzita || cilId === utocnik.id) return stav

  const akce = SABOTAZNI_AKCE.find((a) => a.id === akceId)
  if (!akce || utocnik.penize < akce.cena) return stav

  const cil = stav.hraci.find((h) => h.id === cilId)
  if (!cil) return stav

  let noviHraci = stav.hraci.map((h) =>
    h.id === utocnik.id ? { ...h, penize: h.penize - akce.cena, sabotazPouzita: true } : h
  )
  let posledniUdalost: string

  switch (akce.efekt.typ) {
    case 'krast': {
      const castka = Math.min(akce.efekt.castka, cil.penize)
      noviHraci = noviHraci.map((h) => {
        if (h.id === utocnik.id) return { ...h, penize: h.penize + castka }
        if (h.id === cil.id) return { ...h, penize: h.penize - castka }
        return h
      })
      posledniUdalost = `🥷 ${utocnik.jmeno} ukradl(a) ${cil.jmeno} ${castka} kreditů.`
      break
    }
    case 'zpomaleni':
      noviHraci = noviHraci.map((h) => (h.id === cil.id ? { ...h, preskociTah: true } : h))
      posledniUdalost = `🐌 ${utocnik.jmeno} zpomalil(a) ${cil.jmeno} — vynechá příští tah.`
      break
    case 'odstrceni': {
      const pozice = posunOPoleHranicemi(cil.pozice, akce.efekt.smer, akce.efekt.kroku, stav)
      noviHraci = noviHraci.map((h) => (h.id === cil.id ? { ...h, pozice } : h))
      posledniUdalost = `👊 ${utocnik.jmeno} odstrčil(a) ${cil.jmeno} o ${akce.efekt.kroku} pole zpět.`
      break
    }
  }

  return { ...stav, hraci: noviHraci, posledniUdalost }
}

/** Ukončí tah dřív, i když ještě zbývají kroky — hráč nemusí kroky
 *  dovyčerpat, jen je ztratí. Dovoleno z fáze 'pohyb' i 'konec-tahu',
 *  ale ne dokud čeká nerozhodnutá nabídka koupě — appka by jinak
 *  mohla tiše přeskočit rozhodnutí, na které hráč ani nesáhl.
 *
 *  Nejdřív ale zkontroluje "bonusový hod" z kola štěstí (Fáze 3) —
 *  pokud ho aktivní hráč právě nese, appka vlajku smaže a vrátí hru do
 *  fáze 'hod' BEZ posunu `aktivniIndex`: hráč tak dostane druhý hod ve
 *  stejném tahu, místo aby tah doopravdy skončil a předal se dalšímu
 *  na řadě. Symetrické k `preskociTah` v krokHodu výš, jen opačným
 *  směrem — tamta vlajka ubírá příští tah, tahle přidává tenhle. Ani
 *  tahle větev proto nereskuje `sabotazPouzita` (Fáze 4) — bonusový
 *  hod pořád počítá jako stejný tah, ne nový, takže hráč, co sabotáž
 *  už použil, ji nedostane podruhé zadarmo jen díky bonusovému hodu.
 *
 *  Teprve VĚTEV, co `aktivniIndex` doopravdy přesune na dalšího
 *  hráče, resetuje JEHO `sabotazPouzita` na `false` — ten hráč tak
 *  vždycky dostane čistou, nepoužitou sabotáž, až na něj přijde řada. */
export const ukonciTah = (stav: TrhStav): TrhStav => {
  if (stav.faze === 'hod' || stav.konec || stav.nabidkaKoupe) return stav
  const hrac = aktivniHrac(stav)
  if (hrac?.maBonusovyHod) {
    return {
      ...stav,
      hraci: stav.hraci.map((h) => (h.id === hrac.id ? { ...h, maBonusovyHod: false } : h)),
      faze: 'hod',
      zbyvaKroku: 0,
      posledniHod: null,
    }
  }
  const dalsiIndex = (stav.aktivniIndex + 1) % stav.poradiHracu.length
  const dalsiId = stav.poradiHracu[dalsiIndex]
  return {
    ...stav,
    hraci: stav.hraci.map((h) => (h.id === dalsiId ? { ...h, sabotazPouzita: false } : h)),
    aktivniIndex: dalsiIndex,
    faze: 'hod',
    zbyvaKroku: 0,
    posledniHod: null,
  }
}

/** Kolik milisekund zbývá do konce časového limitu — appka to čte
 *  přímo z hodin (Date.now()) při každém překreslení, engine sám
 *  žádný tikající stav neudržuje. */
export const zbyvaCasuMs = (stav: TrhStav, ted: number = Date.now()): number => Math.max(0, stav.konecCasuMs - ted)

/** Zkontroluje časový limit a případně hru ukončí — appka volá
 *  periodicky (setInterval v Deska.tsx), protože na rozdíl od
 *  Souboj's tikajícího combat/engine.ts je tahle hra tahová, ne
 *  kolová, a nemá vlastní smyčku, do které by se dal test na čas
 *  zavěsit. No-op, dokud čas neuplynul nebo hra už neskončila. */
export const zkontrolujCas = (stav: TrhStav, ted: number = Date.now()): TrhStav => {
  if (stav.konec || ted < stav.konecCasuMs) return stav
  return { ...stav, konec: true }
}

/** Hráč(i) s nejvíc penězi po konci hry — pole, ne jeden hráč, protože
 *  remíza je reálná možnost a appka nemá pravidlo, jak ji rozseknout
 *  (žádný tie-breaker nebyl domluvený, takže se zobrazí čestně jako
 *  remíza, ne se náhodně vybere vítěz). */
export const vitezovePodleStavu = (stav: TrhStav): Hrac[] => {
  const nejvic = Math.max(...stav.hraci.map((h) => h.penize))
  return stav.hraci.filter((h) => h.penize === nejvic)
}
