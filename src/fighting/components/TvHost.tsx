import React, { useEffect, useRef, useState } from 'react'
import { hostujMistnost, vygenerujKodMistnosti } from '../network'
import { ARENA_SIRKA, krokSouboje, vytvorSoubojStav } from '../combat/engine'
import { sestavVstup } from '../combat/loop'
import { nahodnaPostava, pripravAkciAi } from '../combat/ai'
import type { PostavaId } from '../combat/postavy'
import type { HracVstup, SoubojStav } from '../combat/types'
import type { PripojitPayload, Smer, Tlacitko, VstupPayload } from '../types'
import { Bojiste } from './Bojiste'
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
// VITEZSTVI_NA_ZAPAS kol, vyhrává celý zápas ("na dvě vítězství ze
// tří" pro výchozí hodnotu 2). Remízové kolo (vitez === null — oba
// bojovníci dojdou na 0 HP ve stejném tiku) nikomu skóre nepřidá a
// zápas kvůli němu neskončí, jen se odehraje další kolo.
const VITEZSTVI_NA_ZAPAS = 2

// Fáze 5 — sólo režim: počítačový soupeř je jen druhý slot s tímhle
// pevným hracId, nikdy se nesplete se skutečným ovladačem (ten dostává
// náhodně vygenerované id, viz Ovladac.tsx's vygenerujHracId). Kdekoli
// tikBojovnika čte vstup pro tenhle slot, jde přes pripravAkciAi
// (combat/ai.ts) místo přes živě držený stav tlačítek z broadcastu.
const AI_HRAC_ID = 'pocitac-ai'

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
    })

    spravaRef.current = sprava
    return () => sprava.zrusit()
  }, [kod])

  // Jakmile oba sloty mají zvolenou postavu, spustí se zápas — jednou,
  // ne znovu při každém jednotlivém vstupu. Efekt proto závisí na
  // `pripraveno`, ne přímo na `hraci` (ten se mění na každý stisk
  // tlačítka a nová reference by smyčku pořád restartovala).
  const pripraveno = !!(hraci[0]?.postavaId && hraci[1]?.postavaId)

  useEffect(() => {
    if (!pripraveno) return
    const h0 = hraciRef.current[0]
    const h1 = hraciRef.current[1]
    if (!h0 || !h1) return

    const novyStav = vytvorSoubojStav(POZICE_START[0], POZICE_START[1], h0.postavaId, h1.postavaId)
    soubojStavRef.current = novyStav
    vstupPredchoziRef.current = [{ ...PRAZDNA_TLACITKA }, { ...PRAZDNA_TLACITKA }]
    skoreRef.current = [0, 0]
    setSkore([0, 0])
    setSoubojStav(novyStav)

    let idPozadavku: number
    let posledniCas = performance.now()

    const tik = (cas: number) => {
      const deltaMs = cas - posledniCas
      posledniCas = cas

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
        soubojStavRef.current = krokSouboje(soubojStavRef.current, [vstup0, vstup1], deltaMs)
        setSoubojStav(soubojStavRef.current)

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
          // zápas doopravdy skončí (někdo dosáhl VITEZSTVI_NA_ZAPAS),
          // ne na konci každého jednotlivého kola — vyhrát první kolo
          // z třech by jinak vyplatilo XP za zápas, který ještě běží.
          const zapasHotovy = skoreRef.current[0] >= VITEZSTVI_NA_ZAPAS || skoreRef.current[1] >= VITEZSTVI_NA_ZAPAS
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
  }, [pripraveno])

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
    const cerstvyStav = vytvorSoubojStav(POZICE_START[0], POZICE_START[1], h0.postavaId, h1.postavaId)
    soubojStavRef.current = cerstvyStav
    vstupPredchoziRef.current = [{ ...PRAZDNA_TLACITKA }, { ...PRAZDNA_TLACITKA }]
    setSoubojStav(cerstvyStav)
  }

  const novyZapas = () => {
    skoreRef.current = [0, 0]
    setSkore([0, 0])
    zacniKolo()
  }

  const dalsiKolo = () => zacniKolo()

  const zapasSkoncil = skore[0] >= VITEZSTVI_NA_ZAPAS || skore[1] >= VITEZSTVI_NA_ZAPAS

  return (
    <div className="souboj-page souboj-page--tv">
      <header className="souboj-top-bar">
        <button className="souboj-back-btn" onClick={onZpet}>
          ← Zpět
        </button>
        <h1 className="souboj-title">Souboj — TV</h1>
      </header>

      {soubojStav ? (
        <>
          <div className="souboj-skore-pruh" aria-label="Skóre zápasu">
            <span className="souboj-skore-jmeno souboj-skore-jmeno--1">{hraci[0]?.jmeno ?? 'Hráč 1'}</span>
            <span className="souboj-skore-cislo">
              {skore[0]} : {skore[1]}
            </span>
            <span className="souboj-skore-jmeno souboj-skore-jmeno--2">{hraci[1]?.jmeno ?? 'Hráč 2'}</span>
          </div>

          <Bojiste stav={soubojStav} jmena={[hraci[0]?.jmeno ?? 'Hráč 1', hraci[1]?.jmeno ?? 'Hráč 2']} />

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
