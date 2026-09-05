import React, { useEffect, useRef, useState } from 'react'
import { hostujMistnost, vygenerujKodMistnosti } from '../network'
import { ARENA_SIRKA, krokSouboje, vytvorSoubojStav } from '../combat/engine'
import {
  aktualizujStatistikyZapasu,
  HIT_STOP_MS,
  prazdneStatistikyZapasu,
  sestavVstup,
  type StatistikyZapasu,
} from '../combat/loop'
import { nahodnaPostava, pripravAkciAi } from '../combat/ai'
import type { PostavaId } from '../combat/postavy'
import type { HracVstup, SoubojMoznosti, SoubojStav } from '../combat/types'
import type { EmotePayload, PripojitPayload, Smer, Tlacitko, VstupPayload } from '../types'
import { Bojiste } from './Bojiste'
import { PostavaGrafika } from './PostavaGrafika'
import { ARENY, SEZNAM_AREN, VYCHOZI_ARENA, type ArenaId } from '../arena/areny'
// Vlastní import, ne spoléhání na to, že FightingModule.tsx ho už
// natáhl — appka jednou přišla o styl přesně tímhle předpokladem
// (viz GameModule.css/TvorbaPostavy.tsx v CLAUDE.md), CSS import je
// idempotentní, tahle pojistka nic nestojí.
import '../FightingModule.css'

interface Props {
  onZpet: () => void
}

interface HracStav {
  hracId: string
  jmeno: string
  /** Postava zvolená LOKÁLNĚ na ovladači (VyberPostavy.tsx), dorazí
   *  hned s prvním 'pripojit' broadcastem — viz types.ts. */
  postavaId: PostavaId
  smer: Smer | null
  tlacitka: Record<Tlacitko, boolean>
}

const PRAZDNA_TLACITKA: Record<Tlacitko, boolean> = {
  udar: false,
  kop: false,
  blok: false,
  specialni: false,
}

// Startovní pozice obou bojovníků na ose arény — dost daleko od sebe,
// aby žádná ze čtyř postav (ani ta s nejkratším dosahem) netrefila
// soupeře hned na první tik bez pohybu.
const POZICE_START: [number, number] = [200, ARENA_SIRKA - 200]

// Posun tečky v ukazateli směru na čekací obrazovce — čistě vizuální
// potvrzení, že d-pad z ovladače doopravdy dorazil, dokud zápas ještě
// neběží.
const POSUN_SMERU: Record<Smer, { x: number; y: number }> = {
  nahoru: { x: 0, y: -1 },
  dolu: { x: 0, y: 1 },
  vlevo: { x: -1, y: 0 },
  vpravo: { x: 1, y: 0 },
}

const IKONA_TLACITKA: Record<Tlacitko, string> = {
  udar: '👊',
  kop: '🦵',
  blok: '🛡️',
  specialni: '✨',
}

// Vylepšení — zápas na víc kol. Engine sám umí simulovat jen JEDNO
// kolo od začátku do KO (viz engine.ts's vlastní komentář: "Skóre/
// rundy/restart mezi koly je až věc obrazovky"), takže víckolový zápas
// je záměrně čistě TV-strany stav, ne enginu — kdo první vyhraje
// zvolený počet kol, vyhrává celý zápas. Remízové kolo (vitez ===
// null — oba bojovníci dojdou na 0 HP ve stejném tiku) nikomu skóre
// nepřidá a zápas kvůli němu neskončí, jen se odehraje další kolo.
//
// Osmé kolo vylepšení nahradilo pevnou konstantu volitelnou délkou
// zápasu (viz `pocetNaVyhru` stav níž) — "Bo1"/"Bo3"/"Bo5" v UI
// odpovídají 1/2/3 potřebným vítězstvím, stejné číslo appka dřív měla
// napevno (2 = "na dvě vítězství ze tří").
const MOZNOSTI_DELKY_ZAPASU: { popisek: string; hodnota: number }[] = [
  { popisek: 'Na 1 kolo', hodnota: 1 },
  { popisek: 'Bo3', hodnota: 2 },
  { popisek: 'Bo5', hodnota: 3 },
]
const VYCHOZI_POCET_NA_VYHRU = 2

// Osmé kolo vylepšení — handicap pro nevyrovnané hráče. Jen rychlejší
// nabíjení many (viz engine.ts's SoubojMoznosti.handicapManaRegen),
// žádná změna poškození/HP — zvýhodněný hráč dřív dosáhne na speciál,
// pořád ale hraje se stejnými čísly akcí jako soupeř.
const HANDICAP_MANA_NASOBIC = 1.75

// Fáze 5 — sólo režim: počítačový soupeř je jen druhý slot s tímhle
// pevným hracId, nikdy se nesplete se skutečným ovladačem (ten dostává
// náhodně vygenerované id, viz Ovladac.tsx's vygenerujHracId). Kdekoli
// tikBojovnika čte vstup pro tenhle slot, jde přes pripravAkciAi
// (combat/ai.ts) místo přes živě držený stav tlačítek z broadcastu.
const AI_HRAC_ID = 'pocitac-ai'

// Sedmé kolo vylepšení — úvodní "VS" obrazovka mezi tím, co jsou oba
// sloty připravené (pripraveno === true), a tím, co skutečně začne
// běžet zápas — appka to schválně NEDĚLÁ jako vrstvu NAD už běžícím
// zápasem, ale jako skutečné zpoždění startu (viz efekt níž), ať se
// hráčům nezačne odpočítávat čas kola nebo přehrávat zvuk zásahu dřív,
// než vůbec uvidí, proti komu hrají.
const INTRO_MS = 2200

// ==========================================
// TV strana — vygeneruje kód místnosti, přiděluje připojující se
// ovladače na sloty 1/2 a čeká, dokud oba nemají zvolenou postavu (buď
// druhý skutečný ovladač, nebo — Fáze 5 — počítačový soupeř zvolený
// tlačítkem "Hrát proti počítači"). Jakmile jsou oba připraveni, spustí
// se skutečný zápas (Fáze 1/2 enginu, viz combat/engine.ts) přes
// requestAnimationFrame smyčku — sestavVstup (combat/loop.ts) dělá
// hranovou detekci mezi tikem teď a tikem předtím z živě drženého
// stavu tlačítek, krokSouboje je jediné místo, co soubojová pravidla
// skutečně vyhodnocuje. Bojiste.tsx je čistě prezentační, dostane
// hotový SoubojStav jako props.
//
// Čtvrté kolo vylepšení přidalo výběr arény/scény (arena/areny.ts) na
// stejnou čekací obrazovku — čistě lokální TV stav, žádný nový
// broadcast, žádná úprava network.ts/types.ts (viz areny.ts's vlastní
// komentář, proč to nepatří na síť vůbec).
//
// Páté kolo vylepšení přidalo hit-stop (HIT_STOP_MS výš) — jediná
// vizuální "šťáva", co musí žít tady, ne v Bojiste.tsx, protože musí
// skutečně pozastavit SIMULACI (nevolat krokSouboje), ne jen
// vykreslení nad ní. Screen shake a KO zoom (druhá polovina stejného
// kola) jsou naopak čistě prezentační, ty zůstávají v Bojiste.tsx.
//
// Sedmé kolo vylepšení přidalo úvodní "VS" obrazovku (INTRO_MS výš) —
// zápas se teď doopravdy NEZAČNE hrát, dokud tahle obrazovka
// doběhne (viz introAktivni v obou navazujících efektech), ne že by
// se zápas rozjel na pozadí a intro nad ním jen chvíli viselo jako
// vrstva. Parry a comeback (viz combat/engine.ts) žádnou vlastní
// TV-stranu logiku nepotřebují — obojí je čistě v enginu a v
// Bojiste.tsx, tady se to jinak vůbec nezmiňuje.
//
// Osmé kolo vylepšení přidalo volby zápasu na stejnou čekací
// obrazovku jako výběr arény (trénink/délka zápasu/handicap, viz
// sestavMoznosti výš, MOZNOSTI_DELKY_ZAPASU/HANDICAP_MANA_NASOBIC) a
// příjem rychlého emotu z ovladače (network.ts's prisalEmote,
// zobrazený přes Bojiste.tsx's `emotes` prop) — přehled posledního
// zápasu (statistikyRef) appka sčítá přes CELÝ zápas na každém tiku
// herní smyčky, ne až na jeho konci, ať nemusí znovu procházet
// historii kol, co už dávno skončila.
// ==========================================

export const TvHost: React.FC<Props> = ({ onZpet }) => {
  const [kod] = useState(() => vygenerujKodMistnosti())
  const [hraci, setHraci] = useState<(HracStav | null)[]>([null, null])
  const [soubojStav, setSoubojStav] = useState<SoubojStav | null>(null)
  // Kolik kol každý slot v PROBÍHAJÍCÍM zápase vyhrál — viz
  // VITEZSTVI_NA_ZAPAS výš. `skoreRef` je zrcadlo pro čtení uvnitř
  // herní smyčky (stejný důvod jako hraciRef/soubojStavRef), `skore`
  // jen pohání vykreslení.
  const [skore, setSkore] = useState<[number, number]>([0, 0])
  const skoreRef = useRef<[number, number]>([0, 0])
  // Vylepšení — hit-stop (viz HIT_STOP_MS výš). Ref, ne state — mění
  // se na každém tiku herní smyčky, žádný re-render potřebovat nemá.
  const hitStopMsRef = useRef(0)
  // Vylepšení — výběr scény (arena/areny.ts). Čistě TV-strany volba,
  // vybíraná na čekací obrazovce, dokud zápas ještě neběží — nikdy se
  // neposílá na síť (viz areny.ts's vlastní komentář), takže druhý
  // hráč o ní ani nemusí vědět, jen ji uvidí na TV.
  const [arenaId, setArenaId] = useState<ArenaId>(VYCHOZI_ARENA)
  // Sedmé kolo vylepšení — úvodní "VS" obrazovka (viz INTRO_MS výš).
  const [introAktivni, setIntroAktivni] = useState(false)
  // Osmé kolo vylepšení — volby zápasu, zvolené na čekací obrazovce
  // stejně jako aréna výš, a odtud dál po celý zápas neměnné (appka
  // vůbec nenabízí UI na jejich změnu, jakmile `pripraveno` platí).
  const [treninkovyRezim, setTreninkovyRezim] = useState(false)
  const [pocetNaVyhru, setPocetNaVyhru] = useState(VYCHOZI_POCET_NA_VYHRU)
  const [handicapPro, setHandicapPro] = useState<0 | 1 | null>(null)
  // Osmé kolo vylepšení — přehled posledního zápasu (combat/loop.ts's
  // StatistikyZapasu). Ref, ne state — aktualizuje se na KAŽDÉM tiku
  // herní smyčky (stejný důvod jako skoreRef/hraciRef), appka ho čte
  // přímo při vykreslení, až je potřeba ho ukázat (zapasSkoncil níž).
  const statistikyRef = useRef<StatistikyZapasu>(prazdneStatistikyZapasu())
  // Osmé kolo vylepšení — rychlý emote z ovladače (types.ts's
  // RYCHLE_EMOTE). `emotyTimeoutRef` drží id časovače na zmizení, ať
  // appka nezapomene zrušit ten předchozí, když stejný hráč pošle
  // druhý emote dřív, než ten první stihl doznít.
  const [emoty, setEmoty] = useState<[string | null, string | null]>([null, null])
  const emotyTimeoutRef = useRef<[number | null, number | null]>([null, null])

  // Zrcadlo aktuálního `hraci` stavu do refu — herní smyčka běží ve
  // vlastním requestAnimationFrame cyklu a potřebuje na každém tiku
  // číst nejčerstvější držený vstup, ne stav zamrzlý v uzávěru efektu
  // z okamžiku, kdy se smyčka spustila.
  const hraciRef = useRef(hraci)
  hraciRef.current = hraci

  const soubojStavRef = useRef<SoubojStav | null>(null)
  const vstupPredchoziRef = useRef<[Record<Tlacitko, boolean>, Record<Tlacitko, boolean>]>([
    { ...PRAZDNA_TLACITKA },
    { ...PRAZDNA_TLACITKA },
  ])
  // Zrcadlo správy sítě (hostujMistnost's návratová hodnota) do refu —
  // otevírá se v tomhle efektu, ale oznamKonecZapasu se volá z JINÉHO
  // efektu (herní smyčka níž), stejný důvod jako hraciRef vedle: druhý
  // efekt potřebuje na každém tiku vidět tu nejčerstvější referenci.
  const spravaRef = useRef<ReturnType<typeof hostujMistnost> | null>(null)

  useEffect(() => {
    const sprava = hostujMistnost(kod, {
      pripojilSe: (p: PripojitPayload) => {
        setHraci((soucasni) => {
          // Hráč, co se hlásí znovu (krátký výpadek spojení), se
          // přepíše na svém stávajícím slotu, ne že by zabral druhý.
          const stavajiciIndex = soucasni.findIndex((h) => h?.hracId === p.hracId)
          const volnyIndex = stavajiciIndex !== -1 ? stavajiciIndex : soucasni.findIndex((h) => h === null)
          if (volnyIndex === -1) return soucasni // místnost je plná (2/2)

          const dalsi = [...soucasni]
          dalsi[volnyIndex] = {
            hracId: p.hracId,
            jmeno: p.jmeno,
            postavaId: p.postavaId,
            smer: null,
            tlacitka: { ...PRAZDNA_TLACITKA },
          }
          sprava.potvrdPripojeni({ hracId: p.hracId, slot: (volnyIndex + 1) as 1 | 2 })
          return dalsi
        })
      },
      prisalVstup: (p: VstupPayload) => {
        setHraci((soucasni) =>
          soucasni.map((h) => {
            if (!h || h.hracId !== p.hracId) return h
            if (p.typ === 'smer') return { ...h, smer: p.smer }
            return { ...h, tlacitka: { ...h.tlacitka, [p.tlacitko]: p.stisknuto } }
          })
        )
      },
      // Osmé kolo vylepšení — rychlý emote. `hraciRef` (ne `hraci` ze
      // stavu) ať appka najde slot i uprostřed handleru, co běží mimo
      // React render cyklus, stejný důvod jako zbytek téhle komponenty.
      prisalEmote: (p: EmotePayload) => {
        const idx = hraciRef.current.findIndex((h) => h?.hracId === p.hracId)
        if (idx === -1) return
        setEmoty((soucasne) => {
          const dalsi: [string | null, string | null] = [...soucasne]
          dalsi[idx] = p.emote
          return dalsi
        })
        const predchoziId = emotyTimeoutRef.current[idx]
        if (predchoziId !== null) window.clearTimeout(predchoziId)
        emotyTimeoutRef.current[idx] = window.setTimeout(() => {
          setEmoty((soucasne) => {
            const dalsi: [string | null, string | null] = [...soucasne]
            dalsi[idx] = null
            return dalsi
          })
        }, 2500)
      },
    })

    spravaRef.current = sprava
    return () => sprava.zrusit()
  }, [kod])

  // Jakmile oba sloty mají zvolenou postavu, spustí se zápas — jednou,
  // ne znovu při každém jednotlivém vstupu. Efekt proto závisí na
  // `pripraveno`, ne přímo na `hraci` (ten se mění na každý stisk
  // tlačítka a nová reference by smyčku pořád restartovala).
  const pripraveno = !!(hraci[0]?.postavaId && hraci[1]?.postavaId)

  // Osmé kolo vylepšení — poskládá SoubojMoznosti z aktuálně zvolených
  // voleb zápasu (čekací obrazovka, viz JSX níž) — appka je čte znovu
  // při KAŽDÉM novém kole/zápasu (zacniKolo/tenhle efekt), ne jednou
  // napevno, ale UI na jejich změnu appka schválně přestává nabízet,
  // jakmile `pripraveno` platí, takže se v praxi nikdy nemění uprostřed
  // zápasu.
  const sestavMoznosti = (): SoubojMoznosti => ({
    treninkovyRezim,
    handicapManaRegen: [
      handicapPro === 0 ? HANDICAP_MANA_NASOBIC : 1,
      handicapPro === 1 ? HANDICAP_MANA_NASOBIC : 1,
    ],
    hazardOkraju: ARENY[arenaId].nebezpeciOkraje,
  })

  // Sedmé kolo vylepšení — jakmile jsou oba sloty připravené, appka
  // nejdřív na INTRO_MS ukáže "VS" obrazovku a TEPRVE PAK (druhý efekt
  // níž, závislý i na introAktivni) skutečně vytvoří SoubojStav a
  // spustí herní smyčku — ne že by intro jela JAKO PŘEKRYV nad už
  // běžícím zápasem.
  useEffect(() => {
    if (!pripraveno) {
      setIntroAktivni(false)
      return
    }
    setIntroAktivni(true)
    const id = window.setTimeout(() => setIntroAktivni(false), INTRO_MS)
    return () => window.clearTimeout(id)
  }, [pripraveno])

  useEffect(() => {
    if (!pripraveno || introAktivni) return
    const h0 = hraciRef.current[0]
    const h1 = hraciRef.current[1]
    if (!h0 || !h1) return

    const novyStav = vytvorSoubojStav(POZICE_START[0], POZICE_START[1], h0.postavaId, h1.postavaId, sestavMoznosti())
    soubojStavRef.current = novyStav
    vstupPredchoziRef.current = [{ ...PRAZDNA_TLACITKA }, { ...PRAZDNA_TLACITKA }]
    skoreRef.current = [0, 0]
    setSkore([0, 0])
    statistikyRef.current = prazdneStatistikyZapasu()
    setSoubojStav(novyStav)

    let idPozadavku: number
    let posledniCas = performance.now()

    const tik = (cas: number) => {
      const deltaMs = cas - posledniCas
      posledniCas = cas

      // Vylepšení — dokud hit-stop běží, appka VŮBEC nevolá krokSouboje
      // (simulace stojí, dokud okno neuplyne) — jen odečítá čas a
      // požaduje další snímek. Vykreslení mezitím zůstává na stejné,
      // zamrzlé referenci SoubojStav, žádný setSoubojStav navíc netřeba.
      if (hitStopMsRef.current > 0) {
        hitStopMsRef.current = Math.max(0, hitStopMsRef.current - deltaMs)
        idPozadavku = requestAnimationFrame(tik)
        return
      }

      const aktualni = hraciRef.current
      const a0 = aktualni[0]
      const a1 = aktualni[1]
      if (a0 && a1 && soubojStavRef.current) {
        const vstup0 = sestavVstup(a0.smer, vstupPredchoziRef.current[0], a0.tlacitka)
        vstupPredchoziRef.current[0] = { ...a0.tlacitka }

        // Počítačový soupeř nemá žádný broadcastovaný stav tlačítek k
        // hranové detekci — pripravAkciAi se rozhoduje znovu z čerstvého
        // SoubojStav na každý tik (viz combat/ai.ts), žádný ekvivalent
        // vstupPredchoziRef pro tenhle slot proto nepotřebuje.
        const vstup1: HracVstup =
          a1.hracId === AI_HRAC_ID
            ? pripravAkciAi(soubojStavRef.current.hraci[1], soubojStavRef.current.hraci[0])
            : sestavVstup(a1.smer, vstupPredchoziRef.current[1], a1.tlacitka)
        if (a1.hracId !== AI_HRAC_ID) vstupPredchoziRef.current[1] = { ...a1.tlacitka }

        const stavPredTikem = soubojStavRef.current.stavKola
        const soubojStavPredTikem = soubojStavRef.current
        const hpPredTikem: [number, number] = [soubojStavRef.current.hraci[0].hp, soubojStavRef.current.hraci[1].hp]
        soubojStavRef.current = krokSouboje(soubojStavRef.current, [vstup0, vstup1], deltaMs)
        setSoubojStav(soubojStavRef.current)

        // Osmé kolo vylepšení — přehled zápasu (viz statistikyRef výš)
        // se aktualizuje na KAŽDÉM tiku, ne jen na konci zápasu — jinak
        // by appka musela znovu procházet celou historii kol, aby
        // věděla, jaké bylo nejdelší kombo v kole, co už dávno skončilo.
        statistikyRef.current = aktualizujStatistikyZapasu(
          soubojStavPredTikem,
          soubojStavRef.current,
          statistikyRef.current
        )

        // Skutečně dopadlý zásah (HP kleslo oproti hodnotě PŘED tímhle
        // tikem) natáhne hit-stop — zamrznutí se projeví od úplně
        // příštího požadovaného snímku, prakticky okamžitě.
        if (
          soubojStavRef.current.hraci[0].hp < hpPredTikem[0] ||
          soubojStavRef.current.hraci[1].hp < hpPredTikem[1]
        ) {
          hitStopMsRef.current = HIT_STOP_MS
        }

        // Přesně na PŘECHODU 'probiha' → 'konec', ne na každém dalším
        // tiku, co soubojStavRef zůstává zamrzlé na stejné referenci
        // (viz engine.ts's krokSouboje komentář) — jinak by appka
        // připočítala stejné kolo do skóre 60× za sekundu.
        if (stavPredTikem === 'probiha' && soubojStavRef.current.stavKola === 'konec') {
          const vitezKola = soubojStavRef.current.vitez
          if (vitezKola !== null) {
            const dalsiSkore: [number, number] = [...skoreRef.current]
            dalsiSkore[vitezKola] += 1
            skoreRef.current = dalsiSkore
            setSkore(dalsiSkore)
          }

          // Vylepšení — oznamKonecZapasu (a tím i XP/kredity na
          // ovladačích, viz Ovladac.tsx) se posílá až jednou CELÝ
          // zápas doopravdy skončí (někdo dosáhl zvolené délky zápasu,
          // viz pocetNaVyhru), ne na konci každého jednotlivého kola —
          // vyhrát první kolo z třech by jinak vyplatilo XP za zápas,
          // co ještě běží.
          const zapasHotovy = skoreRef.current[0] >= pocetNaVyhru || skoreRef.current[1] >= pocetNaVyhru
          if (zapasHotovy) {
            const vitezZapasu: 1 | 2 | null =
              skoreRef.current[0] === skoreRef.current[1]
                ? null
                : skoreRef.current[0] > skoreRef.current[1]
                  ? 1
                  : 2
            spravaRef.current?.oznamKonecZapasu({ vitezSlot: vitezZapasu })
          }
        }
      }

      idPozadavku = requestAnimationFrame(tik)
    }

    idPozadavku = requestAnimationFrame(tik)
    return () => cancelAnimationFrame(idPozadavku)
  }, [pripraveno, introAktivni])

  // Fáze 5 — sólo režim: doplní slot 2 počítačovým soupeřem s náhodně
  // zvolenou postavou, ať to na začátku není vždy stejný souboj. Jde o
  // plain setHraci, žádné potvrdPripojeni — na síť se tu vůbec nesahá,
  // AI slot nikdy neprošel žádným broadcastem.
  const hratProtiPocitaci = () => {
    setHraci((soucasni) => {
      if (soucasni[1]) return soucasni // slot 2 už je obsazený (skutečný hráč)
      const dalsi = [...soucasni]
      dalsi[1] = {
        hracId: AI_HRAC_ID,
        jmeno: 'Počítač',
        postavaId: nahodnaPostava(),
        smer: null,
        tlacitka: { ...PRAZDNA_TLACITKA },
      }
      return dalsi
    })
  }

  // Společný krok obou tlačítek níž — vytvoří čerstvé kolo od začátku.
  // Rozdíl je jen v tom, jestli se skóre resetuje (nový zápas) nebo ne
  // (další kolo v rámci stejného, ještě neskončeného zápasu).
  const zacniKolo = () => {
    const h0 = hraciRef.current[0]
    const h1 = hraciRef.current[1]
    if (!h0 || !h1) return
    const cerstvyStav = vytvorSoubojStav(
      POZICE_START[0],
      POZICE_START[1],
      h0.postavaId,
      h1.postavaId,
      sestavMoznosti()
    )
    soubojStavRef.current = cerstvyStav
    vstupPredchoziRef.current = [{ ...PRAZDNA_TLACITKA }, { ...PRAZDNA_TLACITKA }]
    setSoubojStav(cerstvyStav)
  }

  const novyZapas = () => {
    skoreRef.current = [0, 0]
    setSkore([0, 0])
    // Nový zápas = čerstvý přehled statistik (viz statistikyRef výš) —
    // na rozdíl od dalšíKolo, kde appka přehled schválně nechává
    // sčítat přes celý zápas, ne resetovat po každém kole.
    statistikyRef.current = prazdneStatistikyZapasu()
    zacniKolo()
  }

  const dalsiKolo = () => zacniKolo()

  const zapasSkoncil = skore[0] >= pocetNaVyhru || skore[1] >= pocetNaVyhru

  return (
    <div className="souboj-page souboj-page--tv">
      <header className="souboj-top-bar">
        <button className="souboj-back-btn" onClick={onZpet}>
          ← Zpět
        </button>
        <h1 className="souboj-title">Souboj — TV</h1>
      </header>

      {introAktivni ? (
        <div className="souboj-intro" aria-label="Zápas začíná">
          <div className="souboj-intro-bojovnik souboj-intro-bojovnik--1">
            <PostavaGrafika postavaId={hraci[0]?.postavaId ?? 'onyx'} size={96} />
            <span className="souboj-intro-jmeno">{hraci[0]?.jmeno ?? 'Hráč 1'}</span>
          </div>
          <span className="souboj-intro-vs">VS</span>
          <div className="souboj-intro-bojovnik souboj-intro-bojovnik--2">
            <PostavaGrafika postavaId={hraci[1]?.postavaId ?? 'onyx'} size={96} />
            <span className="souboj-intro-jmeno">{hraci[1]?.jmeno ?? 'Hráč 2'}</span>
          </div>
        </div>
      ) : soubojStav ? (
        <>
          <div className="souboj-skore-pruh" aria-label="Skóre zápasu">
            <span className="souboj-skore-jmeno souboj-skore-jmeno--1">{hraci[0]?.jmeno ?? 'Hráč 1'}</span>
            <span className="souboj-skore-cislo">
              {skore[0]} : {skore[1]}
            </span>
            <span className="souboj-skore-jmeno souboj-skore-jmeno--2">{hraci[1]?.jmeno ?? 'Hráč 2'}</span>
          </div>

          <Bojiste
            stav={soubojStav}
            jmena={[hraci[0]?.jmeno ?? 'Hráč 1', hraci[1]?.jmeno ?? 'Hráč 2']}
            arenaId={arenaId}
            emotes={emoty}
          />

          {soubojStav.stavKola === 'konec' && zapasSkoncil && (
            <div className="souboj-recap" aria-label="Přehled zápasu">
              <span className="souboj-recap-nadpis">Přehled zápasu</span>
              <span className="souboj-recap-radek">
                <span>🔥 Nejdelší kombo</span>
                <span>
                  {hraci[0]?.jmeno ?? 'Hráč 1'} ×{statistikyRef.current.nejdelsiKombo[0]} · {hraci[1]?.jmeno ?? 'Hráč 2'} ×
                  {statistikyRef.current.nejdelsiKombo[1]}
                </span>
              </span>
              <span className="souboj-recap-radek">
                <span>👊 Doručené zásahy</span>
                <span>
                  {statistikyRef.current.zasahy[0]} : {statistikyRef.current.zasahy[1]}
                </span>
              </span>
              <span className="souboj-recap-radek">
                <span>✋ Perfektní bloky</span>
                <span>
                  {statistikyRef.current.perfektniBloky[0]} : {statistikyRef.current.perfektniBloky[1]}
                </span>
              </span>
            </div>
          )}

          {soubojStav.stavKola === 'konec' &&
            (zapasSkoncil ? (
              <button type="button" className="souboj-novy-zapas-btn" onClick={novyZapas}>
                Nový zápas
              </button>
            ) : (
              <button type="button" className="souboj-novy-zapas-btn souboj-novy-zapas-btn--kolo" onClick={dalsiKolo}>
                Další kolo ({skore[0]} : {skore[1]})
              </button>
            ))}
        </>
      ) : (
        <>
          <div className="souboj-kod-karta">
            <span className="souboj-kod-popis">Kód místnosti — zadej na telefonu</span>
            <span className="souboj-kod">{kod}</span>
          </div>

          <div className="souboj-arena-vyber" aria-label="Výběr scény">
            {SEZNAM_AREN.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`souboj-arena-volba ${a.id === arenaId ? 'is-vybrana' : ''}`}
                onClick={() => setArenaId(a.id)}
              >
                <span aria-hidden="true">{a.ikona}</span> {a.nazev}
                {a.nebezpeciOkraje ? ' ⚠️' : ''}
              </button>
            ))}
          </div>

          {/* Osmé kolo vylepšení — volby zápasu. Trénink schovává délku
              zápasu i handicap (kolo v tréninku nikdy neskončí, obojí
              by bylo bezpředmětné), stejná viditelnost, jakou appka
              přiznává i výběru arény výš. */}
          <button
            type="button"
            className={`souboj-nastaveni-volba souboj-nastaveni-trenink-btn ${
              treninkovyRezim ? 'is-vybrana' : ''
            }`}
            onClick={() => setTreninkovyRezim((v) => !v)}
          >
            🎯 Trénink (bez limitu a KO)
          </button>

          {!treninkovyRezim && (
            <>
              <span className="souboj-nastaveni-nadpis">Délka zápasu</span>
              <div className="souboj-nastaveni-vyber" aria-label="Délka zápasu">
                {MOZNOSTI_DELKY_ZAPASU.map((m) => (
                  <button
                    key={m.hodnota}
                    type="button"
                    className={`souboj-nastaveni-volba ${pocetNaVyhru === m.hodnota ? 'is-vybrana' : ''}`}
                    onClick={() => setPocetNaVyhru(m.hodnota)}
                  >
                    {m.popisek}
                  </button>
                ))}
              </div>

              <span className="souboj-nastaveni-nadpis">Handicap (rychlejší mana)</span>
              <div className="souboj-nastaveni-vyber" aria-label="Handicap">
                <button
                  type="button"
                  className={`souboj-nastaveni-volba ${handicapPro === null ? 'is-vybrana' : ''}`}
                  onClick={() => setHandicapPro(null)}
                >
                  Bez handicapu
                </button>
                <button
                  type="button"
                  className={`souboj-nastaveni-volba ${handicapPro === 0 ? 'is-vybrana' : ''}`}
                  onClick={() => setHandicapPro(0)}
                >
                  Hráč 1
                </button>
                <button
                  type="button"
                  className={`souboj-nastaveni-volba ${handicapPro === 1 ? 'is-vybrana' : ''}`}
                  onClick={() => setHandicapPro(1)}
                >
                  Hráč 2
                </button>
              </div>
            </>
          )}

          <div className="souboj-hraci-mrizka">
            {hraci.map((hrac, i) => (
              <div key={i} className={`souboj-hrac-panel souboj-hrac-panel--${i + 1}`}>
                <span className="souboj-hrac-nadpis">Hráč {i + 1}</span>

                {!hrac ? (
                  <span className="souboj-hrac-cekani">Čeká se na připojení…</span>
                ) : (
                  <>
                    <span className="souboj-hrac-jmeno">
                      {hrac.jmeno} · {hrac.postavaId}
                    </span>

                    <div className="souboj-smer-indikator" aria-hidden="true">
                      <span
                        className="souboj-smer-tecka"
                        style={{
                          transform: hrac.smer
                            ? `translate(${POSUN_SMERU[hrac.smer].x * 18}px, ${POSUN_SMERU[hrac.smer].y * 18}px)`
                            : 'translate(0, 0)',
                        }}
                      />
                    </div>

                    <div className="souboj-tlacitka-radek">
                      {(Object.keys(IKONA_TLACITKA) as Tlacitko[]).map((tlacitko) => (
                        <span
                          key={tlacitko}
                          className={`souboj-tlacitko-svetlo souboj-tlacitko-svetlo--${tlacitko} ${
                            hrac.tlacitka[tlacitko] ? 'je-aktivni' : ''
                          }`}
                        >
                          {IKONA_TLACITKA[tlacitko]}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {hraci[0] && !hraci[1] && (
            <button type="button" className="souboj-solo-btn" onClick={hratProtiPocitaci}>
              🤖 Hrát proti počítači
            </button>
          )}
        </>
      )}
    </div>
  )
}
