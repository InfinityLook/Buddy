import React, { useEffect, useRef, useState } from 'react'
import { ARENA_SIRKA, krokSouboje, vytvorSoubojStav } from '../combat/engine'
import {
  aktualizujStatistikyZapasu,
  HIT_STOP_MS,
  INTRO_MS,
  KO_HIT_STOP_MS,
  prazdneStatistikyZapasu,
  sestavVstup,
  type StatistikyZapasu,
} from '../combat/loop'
import { useSoubojStatistikyStore } from '../useSoubojStatistikyStore'
import { zavibrujTlacitko } from '../haptika'
import { POSTAVY } from '../combat/postavy'
import type { PostavaId } from '../combat/postavy'
import type { SoubojMoznosti, SoubojStav } from '../combat/types'
import { RYCHLE_EMOTE } from '../types'
import type { Smer, Tlacitko } from '../types'
import { ARENY, nahodnaArena, SEZNAM_AREN, VYCHOZI_ARENA, type ArenaId } from '../arena/areny'
import { Bojiste } from './Bojiste'
import { PostavaGrafika } from './PostavaGrafika'
import { IntroPocitadlo } from './IntroPocitadlo'
import { nastavNapjatostHudby, spustitHudbu, zastavitHudbu } from '../sound'
import { VyberPostavy } from './VyberPostavy'
import '../FightingModule.css'

interface Props {
  onZpet: () => void
}

const PRAZDNA_TLACITKA: Record<Tlacitko, boolean> = { udar: false, kop: false, blok: false, specialni: false }
const IKONA_TLACITKA: Record<Tlacitko, string> = { udar: '👊', kop: '🦵', blok: '🛡️', specialni: '✨' }
const PORADI_TLACITEK: Tlacitko[] = ['udar', 'kop', 'blok', 'specialni']

const POZICE_START: [number, number] = [200, ARENA_SIRKA - 200]

// Osmé kolo vylepšení — stejné volby délky zápasu/handicapu jako na
// TV straně (TvHost.tsx), jen bez síťového kontextu — obojí je čistě
// lokální stav zvolený na 'priprava' obrazovce.
const MOZNOSTI_DELKY_ZAPASU: { popisek: string; hodnota: number }[] = [
  { popisek: 'Na 1 kolo', hodnota: 1 },
  { popisek: 'Bo3', hodnota: 2 },
  { popisek: 'Bo5', hodnota: 3 },
]
const VYCHOZI_POCET_NA_VYHRU = 2
const HANDICAP_MANA_NASOBIC = 1.75
// Osmé kolo vylepšení — jak dlouho appka nechá emote (types.ts's
// RYCHLE_EMOTE) viset nad hlavičkou bojovníka, než sám zmizí — stejné
// číslo, jaké TvHost.tsx používá pro síťově přijaté emoty.
const EMOTE_TRVANI_MS = 2500

type Krok = 'vyberP1' | 'vyberP2' | 'priprava' | 'hra'

/** Deváté kolo vylepšení — rychlá odveta. Modulová proměnná (ne
 *  component-level stav) — musí přežít i úplné opuštění téhle
 *  obrazovky (onZpet unmountuje celou komponentu, viz FightingModule.tsx),
 *  ať appka nabídne "hrát znovu se stejnými bojovníky" i po návratu do
 *  menu her a zpátky, ne jen v rámci jednoho zápasu. */
interface PosledniNastaveniLokalu {
  postava0: PostavaId
  postava1: PostavaId
  arenaId: ArenaId
  treninkovyRezim: boolean
  pocetNaVyhru: number
  handicapPro: 0 | 1 | null
}
let posledniNastaveniLokalu: PosledniNastaveniLokalu | null = null

// ==========================================
// Vylepšení — lokální režim, obě strany na JEDNOM zařízení, žádná síť
// (network.ts se tu vůbec nepoužívá — nikdo se nikam nepřipojuje,
// oba "ovladače" jsou jen dvě sady tlačítek na téže obrazovce).
// Postupuje přes stejné dva kroky výběru postavy jako telefon-ovladač
// (VyberPostavy.tsx, znovupoužitý beze změny — dvakrát, sekvenčně,
// jednou za hráče), pak výběr arény (stejné pilulky jako TvHost.tsx's
// čekací obrazovka), a pak samotný zápas: stejný combat/engine.ts,
// stejné Bojiste.tsx (takže i hit-stop/parry/comeback/combo/screen
// shake fungují úplně stejně, appka tu nic z toho neduplikuje), jen
// vstup nepřichází přes broadcast, ale ze dvou lokálních párů refů —
// každý hráč má svůj vlastní směrový pár tlačítek (◀ ▶, ne joystick:
// joystick by na polovině obrazovky sdílené se čtyřmi dalšími
// tlačítky nebyl k ničemu) a čtyři akční tlačítka, se stejnou
// pointerdown/pointerup + hranovou detekcí (sestavVstup, combat/
// loop.ts), jakou telefon-ovladač už používá.
//
// XP/kredity/statistiky: appka NEPŘIPISUJE XP ani kredity za lokální
// zápas — na rozdíl od zápasu přes dvě zařízení (Ovladac.tsx), kde má
// každý telefon vlastní účet/úložiště, tady je "účet" jen jeden
// sdílený secureStorage celého zařízení, a nekonečné hraní sám proti
// sobě na jednom telefonu by byl triviální způsob, jak si nakrmit
// odměny zdarma. Statistiky per postavu (useSoubojStatistikyStore) se
// naopak zaznamenávají — čistě kosmetické, žádná hodnota, kterou by
// šlo takhle "vytěžit".
//
// Osmé kolo vylepšení přidalo zápas na víc kol (skore/skoreRef, stejný
// tvar jako TvHost.tsx — appka dřív po jednom kole jen nabízela "Hrát
// znovu"), volby zápasu (trénink/délka/handicap, sestavMoznosti výš),
// přehled posledního zápasu (statistikyRef) a rychlý emote — čistě
// lokální (posliEmoteLokalne), žádná síť ani časovač navíc oproti
// TV straně. Statistiky do useSoubojStatistikyStore se teď zapisují
// až jednou za CELÝ zápas (viz komentář uvnitř herní smyčky), ne po
// každém jednotlivém kole jako dřív.
// ==========================================

export const LocalniZapas: React.FC<Props> = ({ onZpet }) => {
  const [krok, setKrok] = useState<Krok>('vyberP1')
  const [postava0, setPostava0] = useState<PostavaId | null>(null)
  const [postava1, setPostava1] = useState<PostavaId | null>(null)
  const [arenaId, setArenaId] = useState<ArenaId>(VYCHOZI_ARENA)
  const [soubojStav, setSoubojStav] = useState<SoubojStav | null>(null)
  // Osmé kolo vylepšení — volby zápasu, zvolené na 'priprava' obrazovce
  // (stejné UI jako TvHost.tsx's čekací obrazovka) a odtud dál po celý
  // zápas neměnné.
  const [treninkovyRezim, setTreninkovyRezim] = useState(false)
  const [pocetNaVyhru, setPocetNaVyhru] = useState(VYCHOZI_POCET_NA_VYHRU)
  const [handicapPro, setHandicapPro] = useState<0 | 1 | null>(null)
  // Osmé kolo vylepšení — zápas na víc kol, stejný pattern jako
  // TvHost.tsx (skoreRef pro čtení uvnitř herní smyčky, skore jen pohání
  // vykreslení) — LocalniZapas dřív žádné skóre přes víc kol neměl,
  // jen "Hrát znovu" po jednom odehraném kole.
  const [skore, setSkore] = useState<[number, number]>([0, 0])
  const skoreRef = useRef<[number, number]>([0, 0])
  // Osmé kolo vylepšení — přehled zápasu (viz TvHost.tsx's vlastní
  // komentář u stejného refu).
  const statistikyRef = useRef<StatistikyZapasu>(prazdneStatistikyZapasu())
  // Osmé kolo vylepšení — rychlý emote, čistě lokální (žádná síť) —
  // tlačítko rovnou nastaví stav, appka si jen hlídá vlastní časovač na
  // zmizení, stejná disciplína jako TvHost.tsx's síťová verze.
  const [emoty, setEmoty] = useState<[string | null, string | null]>([null, null])
  const emotyTimeoutRef = useRef<[number | null, number | null]>([null, null])

  const soubojStavRef = useRef<SoubojStav | null>(null)
  const hitStopMsRef = useRef(0)
  // Deváté kolo vylepšení — úvodní "VS" obrazovka, stejná INTRO_MS
  // konstanta a stejné "zápas se doopravdy NEZAČNE hrát, dokud tahle
  // obrazovka doběhne" chování jako TvHost.tsx (viz jeho vlastní
  // komentář) — appka to tu dřív vůbec neměla, protože LocalniZapas
  // vznikl až PO téhle fázi na TV straně.
  const [introAktivni, setIntroAktivni] = useState(false)

  // Dva nezávislé páry refů, jeden za hráče — stejný tvar, jaký by
  // jinak dorazil přes broadcast (viz TvHost.tsx), jen naplňovaný
  // přímo z pointerdown/pointerup na TÉHLE obrazovce, ne ze sítě.
  const p1Tlacitka = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })
  const p1TlacitkaPredchozi = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })
  const p1Smer = useRef<{ vlevo: boolean; vpravo: boolean }>({ vlevo: false, vpravo: false })
  const p2Tlacitka = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })
  const p2TlacitkaPredchozi = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })
  const p2Smer = useRef<{ vlevo: boolean; vpravo: boolean }>({ vlevo: false, vpravo: false })

  // Osmé kolo vylepšení — poskládá SoubojMoznosti ze zvolených voleb
  // zápasu (stejná logika, jaká TvHost.tsx má pod stejným jménem).
  const sestavMoznosti = (): SoubojMoznosti => ({
    treninkovyRezim,
    handicapManaRegen: [
      handicapPro === 0 ? HANDICAP_MANA_NASOBIC : 1,
      handicapPro === 1 ? HANDICAP_MANA_NASOBIC : 1,
    ],
    hazardOkraju: ARENY[arenaId].nebezpeciOkraje,
    // Desáté kolo vylepšení — stejné kopírování jako TvHost.tsx's
    // vlastní sestavMoznosti.
    udalostAreny: ARENY[arenaId].udalost,
  })

  // Deváté kolo vylepšení — jakmile appka vstoupí do kroku 'hra',
  // nejdřív na INTRO_MS ukáže "VS" obrazovku (viz JSX níž) a teprve
  // POTOM (efekt pod tímhle, závislý i na introAktivni) vytvoří
  // SoubojStav a spustí herní smyčku — stejné dvoufázové spouštění
  // jako TvHost.tsx's vlastní introAktivni efekt.
  useEffect(() => {
    if (krok !== 'hra') {
      setIntroAktivni(false)
      return
    }
    setIntroAktivni(true)
    const id = window.setTimeout(() => setIntroAktivni(false), INTRO_MS)
    return () => window.clearTimeout(id)
  }, [krok])

  useEffect(() => {
    if (krok !== 'hra' || introAktivni || !postava0 || !postava1) return
    // Deváté kolo vylepšení — rychlá odveta si tady zapamatuje
    // aktuální volby, ať je "🔁 Rychlá odveta" na úvodní obrazovce má
    // po příštím otevření komponenty k dispozici (viz posledniNastaveniLokalu
    // výš, proč modulová proměnná, ne stav).
    posledniNastaveniLokalu = { postava0, postava1, arenaId, treninkovyRezim, pocetNaVyhru, handicapPro }
    const novyStav = vytvorSoubojStav(POZICE_START[0], POZICE_START[1], postava0, postava1, sestavMoznosti())
    soubojStavRef.current = novyStav
    setSoubojStav(novyStav)
    p1TlacitkaPredchozi.current = { ...PRAZDNA_TLACITKA }
    p2TlacitkaPredchozi.current = { ...PRAZDNA_TLACITKA }
    skoreRef.current = [0, 0]
    setSkore([0, 0])
    statistikyRef.current = prazdneStatistikyZapasu()
    // Desáté kolo vylepšení — ambientní hudba, stejná chvíle spuštění
    // jako TvHost.tsx's vlastní efekt (viz jeho komentář).
    spustitHudbu()

    let idPozadavku: number
    let posledniCas = performance.now()

    const smerZTlacitek = (s: { vlevo: boolean; vpravo: boolean }): Smer | null =>
      s.vlevo && !s.vpravo ? 'vlevo' : s.vpravo && !s.vlevo ? 'vpravo' : null

    const tik = (cas: number) => {
      const deltaMs = cas - posledniCas
      posledniCas = cas

      if (hitStopMsRef.current > 0) {
        hitStopMsRef.current = Math.max(0, hitStopMsRef.current - deltaMs)
        idPozadavku = requestAnimationFrame(tik)
        return
      }

      if (soubojStavRef.current) {
        const vstup0 = sestavVstup(smerZTlacitek(p1Smer.current), p1TlacitkaPredchozi.current, p1Tlacitka.current)
        p1TlacitkaPredchozi.current = { ...p1Tlacitka.current }
        const vstup1 = sestavVstup(smerZTlacitek(p2Smer.current), p2TlacitkaPredchozi.current, p2Tlacitka.current)
        p2TlacitkaPredchozi.current = { ...p2Tlacitka.current }

        const stavPredTikem = soubojStavRef.current.stavKola
        const soubojStavPredTikem = soubojStavRef.current
        const hpPredTikem: [number, number] = [soubojStavRef.current.hraci[0].hp, soubojStavRef.current.hraci[1].hp]
        soubojStavRef.current = krokSouboje(soubojStavRef.current, [vstup0, vstup1], deltaMs)
        setSoubojStav(soubojStavRef.current)
        // Desáté kolo vylepšení — stejná napjatostní vazba jako
        // TvHost.tsx's vlastní tik.
        nastavNapjatostHudby(soubojStavRef.current.suddenDeath)

        statistikyRef.current = aktualizujStatistikyZapasu(
          soubojStavPredTikem,
          soubojStavRef.current,
          statistikyRef.current
        )

        // Deváté kolo vylepšení — delší hit-stop na skutečný knokaut,
        // stejná logika jako TvHost.tsx's vlastní tik (viz jeho
        // komentář).
        const hpKleslo =
          soubojStavRef.current.hraci[0].hp < hpPredTikem[0] ||
          soubojStavRef.current.hraci[1].hp < hpPredTikem[1]
        if (hpKleslo) {
          const koTetoRundy =
            (soubojStavRef.current.hraci[0].hp <= 0 && hpPredTikem[0] > 0) ||
            (soubojStavRef.current.hraci[1].hp <= 0 && hpPredTikem[1] > 0)
          hitStopMsRef.current = koTetoRundy ? KO_HIT_STOP_MS : HIT_STOP_MS
        }

        // Osmé kolo vylepšení — zápas na víc kol, stejný přechodový
        // pattern jako TvHost.tsx: skóre se připočítá jen NA PŘECHODU
        // do 'konec', statistiky do useSoubojStatistikyStore se ale
        // zapisují až jednou, KDYŽ CELÝ zápas skončí — dřív appka
        // zapisovala výsledek po každém jednotlivém kole, což by teď
        // se zápasem na víc kol znamenalo víc výher/proher, než kolik
        // zápasů se skutečně odehrálo.
        if (stavPredTikem === 'probiha' && soubojStavRef.current.stavKola === 'konec') {
          const vitezKola = soubojStavRef.current.vitez
          if (vitezKola !== null) {
            const dalsiSkore: [number, number] = [...skoreRef.current]
            dalsiSkore[vitezKola] += 1
            skoreRef.current = dalsiSkore
            setSkore(dalsiSkore)
          }

          const zapasHotovy = skoreRef.current[0] >= pocetNaVyhru || skoreRef.current[1] >= pocetNaVyhru
          if (zapasHotovy) {
            if (skoreRef.current[0] === skoreRef.current[1]) {
              useSoubojStatistikyStore.getState().zaznamenejVysledek(postava0, 'remiza')
              useSoubojStatistikyStore.getState().zaznamenejVysledek(postava1, 'remiza')
            } else {
              const vitezZapasu = skoreRef.current[0] > skoreRef.current[1] ? 0 : 1
              const prohravsi = vitezZapasu === 0 ? 1 : 0
              useSoubojStatistikyStore
                .getState()
                .zaznamenejVysledek(vitezZapasu === 0 ? postava0 : postava1, 'vyhra')
              useSoubojStatistikyStore
                .getState()
                .zaznamenejVysledek(prohravsi === 0 ? postava0 : postava1, 'prohra')
            }
          }
        }
      }

      idPozadavku = requestAnimationFrame(tik)
    }

    idPozadavku = requestAnimationFrame(tik)
    return () => {
      cancelAnimationFrame(idPozadavku)
      zastavitHudbu()
    }
  }, [krok, introAktivni, postava0, postava1])

  // Společný krok obou tlačítek níž — vytvoří čerstvé kolo od začátku,
  // beze změny skóre (stejný "zacniKolo"/"dalsiKolo"/"novyZapas" tvar
  // jako TvHost.tsx).
  const zacniKolo = () => {
    if (!postava0 || !postava1) return
    const cerstvyStav = vytvorSoubojStav(POZICE_START[0], POZICE_START[1], postava0, postava1, sestavMoznosti())
    soubojStavRef.current = cerstvyStav
    p1TlacitkaPredchozi.current = { ...PRAZDNA_TLACITKA }
    p2TlacitkaPredchozi.current = { ...PRAZDNA_TLACITKA }
    setSoubojStav(cerstvyStav)
  }

  const dalsiKolo = () => zacniKolo()

  const novyZapas = () => {
    skoreRef.current = [0, 0]
    setSkore([0, 0])
    statistikyRef.current = prazdneStatistikyZapasu()
    zacniKolo()
  }

  const zapasSkoncil = skore[0] >= pocetNaVyhru || skore[1] >= pocetNaVyhru

  // Osmé kolo vylepšení — rychlý emote, čistě lokální (viz stav výš).
  const posliEmoteLokalne = (hrac: 0 | 1, emote: string) => {
    setEmoty((soucasne) => {
      const dalsi: [string | null, string | null] = [...soucasne]
      dalsi[hrac] = emote
      return dalsi
    })
    const predchoziId = emotyTimeoutRef.current[hrac]
    if (predchoziId !== null) window.clearTimeout(predchoziId)
    emotyTimeoutRef.current[hrac] = window.setTimeout(() => {
      setEmoty((soucasne) => {
        const dalsi: [string | null, string | null] = [...soucasne]
        dalsi[hrac] = null
        return dalsi
      })
    }, EMOTE_TRVANI_MS)
  }

  if (krok === 'vyberP1' || krok === 'vyberP2') {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={krok === 'vyberP1' ? onZpet : () => setKrok('vyberP1')}>
            ← Zpět
          </button>
          <h1 className="souboj-title">{krok === 'vyberP1' ? 'Hráč 1 (levá strana)' : 'Hráč 2 (pravá strana)'}</h1>
        </header>

        {/* Deváté kolo vylepšení — rychlá odveta, jen na úplně první
            obrazovce a jen když má appka z čeho vycházet (viz
            posledniNastaveniLokalu výš) — jedno tlačítko rovnou skočí
            do 'hra' se stejnými bojovníky/arénou/volbami jako minule,
            žádné dva výběry postavy ani znovu 'priprava' navíc. */}
        {krok === 'vyberP1' && posledniNastaveniLokalu && (
          <button
            type="button"
            className="souboj-postava-nahodna"
            onClick={() => {
              const n = posledniNastaveniLokalu
              if (!n) return
              setPostava0(n.postava0)
              setPostava1(n.postava1)
              setArenaId(n.arenaId)
              setTreninkovyRezim(n.treninkovyRezim)
              setPocetNaVyhru(n.pocetNaVyhru)
              setHandicapPro(n.handicapPro)
              setKrok('hra')
            }}
          >
            🔁 Rychlá odveta ({POSTAVY[posledniNastaveniLokalu.postava0].jmeno} vs.{' '}
            {POSTAVY[posledniNastaveniLokalu.postava1].jmeno})
          </button>
        )}

        <VyberPostavy
          onVybrano={(id) => {
            if (krok === 'vyberP1') {
              setPostava0(id)
              setKrok('vyberP2')
            } else {
              setPostava1(id)
              setKrok('priprava')
            }
          }}
        />
      </div>
    )
  }

  if (krok === 'priprava') {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={() => setKrok('vyberP2')}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Lokální zápas</h1>
        </header>

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
              {a.udalost === 'balvan' ? ' 🪨' : a.udalost === 'zatmeni' ? ' 🌑' : ''}
            </button>
          ))}
          <button
            type="button"
            className="souboj-arena-volba souboj-arena-volba--nahodna"
            onClick={() => setArenaId(nahodnaArena())}
          >
            🎲 Náhodná
          </button>
        </div>

        <button
          type="button"
          className={`souboj-nastaveni-volba souboj-nastaveni-trenink-btn ${treninkovyRezim ? 'is-vybrana' : ''}`}
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

        <button type="button" className="souboj-solo-btn" onClick={() => setKrok('hra')}>
          Začít zápas
        </button>
      </div>
    )
  }

  return (
    <div className="souboj-page souboj-page--tv">
      <header className="souboj-top-bar">
        <button className="souboj-back-btn" onClick={onZpet}>
          ← Zpět
        </button>
        <h1 className="souboj-title">Lokální zápas</h1>
      </header>

      {introAktivni ? (
        <div className="souboj-intro" aria-label="Zápas začíná">
          <div className="souboj-intro-bojovnik souboj-intro-bojovnik--1">
            <PostavaGrafika postavaId={postava0 ?? 'onyx'} size={96} />
            <span className="souboj-intro-jmeno">Hráč 1</span>
            <span className="souboj-intro-hlaska">„{POSTAVY[postava0 ?? 'onyx'].hlaska}“</span>
          </div>
          <span className="souboj-intro-vs">VS</span>
          <div className="souboj-intro-bojovnik souboj-intro-bojovnik--2">
            <PostavaGrafika postavaId={postava1 ?? 'onyx'} size={96} />
            <span className="souboj-intro-jmeno">Hráč 2</span>
            <span className="souboj-intro-hlaska">„{POSTAVY[postava1 ?? 'onyx'].hlaska}“</span>
          </div>
          <IntroPocitadlo celkovaDelkaMs={INTRO_MS} />
        </div>
      ) : (
        soubojStav && (
        <>
          {!treninkovyRezim && (
            <div className="souboj-skore-pruh" aria-label="Skóre zápasu">
              <span className="souboj-skore-jmeno souboj-skore-jmeno--1">Hráč 1</span>
              <span className="souboj-skore-cislo">
                {skore[0]} : {skore[1]}
              </span>
              <span className="souboj-skore-jmeno souboj-skore-jmeno--2">Hráč 2</span>
            </div>
          )}

          <Bojiste stav={soubojStav} jmena={['Hráč 1', 'Hráč 2']} arenaId={arenaId} emotes={emoty} />

          {soubojStav.stavKola === 'konec' && zapasSkoncil && (
            <div className="souboj-recap" aria-label="Přehled zápasu">
              <span className="souboj-recap-nadpis">Přehled zápasu</span>
              <span className="souboj-recap-radek">
                <span>🔥 Nejdelší kombo</span>
                <span>
                  Hráč 1 ×{statistikyRef.current.nejdelsiKombo[0]} · Hráč 2 ×{statistikyRef.current.nejdelsiKombo[1]}
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
              {statistikyRef.current.nejtesnejsiRozdilHp !== null && (
                <span className="souboj-recap-radek">
                  <span>🏆 Nejtěsnější moment</span>
                  <span>rozdíl {Math.round(statistikyRef.current.nejtesnejsiRozdilHp)} HP</span>
                </span>
              )}
            </div>
          )}

          {soubojStav.stavKola === 'konec' &&
            (treninkovyRezim ? null : zapasSkoncil ? (
              <button type="button" className="souboj-novy-zapas-btn" onClick={novyZapas}>
                Nový zápas
              </button>
            ) : (
              <button type="button" className="souboj-novy-zapas-btn souboj-novy-zapas-btn--kolo" onClick={dalsiKolo}>
                Další kolo ({skore[0]} : {skore[1]})
              </button>
            ))}
        </>
        )
      )}

      {/* Desáté kolo vylepšení — chyt (grab), stejná nápověda jako
          Ovladac.tsx — platí pro oba klastry stejně, appka ji proto
          ukazuje jen jednou, nad oběma. */}
      <p className="souboj-chyt-hint">👊 + 🛡️ = Chyt (neblokovatelný)</p>

      {/* Dva samostatné ovládací klastry na téže obrazovce — levý pro
          hráče 1, pravý (zrcadlený přes CSS, viz FightingModule.css)
          pro hráče 2, každý se svým vlastním párem ◀▶ tlačítek místo
          joysticku (ten by na půlce obrazovky se čtyřmi tlačítky navíc
          nebyl k ničemu, viz komentář nad komponentou). */}
      <div className="souboj-lokal-ovladace">
        {([0, 1] as const).map((hrac) => {
          const smerRef = hrac === 0 ? p1Smer : p2Smer
          const tlacitkaRef = hrac === 0 ? p1Tlacitka : p2Tlacitka
          return (
            <div key={hrac} className={`souboj-lokal-klastr souboj-lokal-klastr--${hrac + 1}`}>
              <div className="souboj-lokal-smer">
                <button
                  type="button"
                  className="souboj-lokal-smer-btn"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    smerRef.current.vlevo = true
                  }}
                  onPointerUp={() => (smerRef.current.vlevo = false)}
                  onPointerCancel={() => (smerRef.current.vlevo = false)}
                >
                  ◀
                </button>
                <button
                  type="button"
                  className="souboj-lokal-smer-btn"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    smerRef.current.vpravo = true
                  }}
                  onPointerUp={() => (smerRef.current.vpravo = false)}
                  onPointerCancel={() => (smerRef.current.vpravo = false)}
                >
                  ▶
                </button>
              </div>

              <div className="souboj-lokal-akce">
                {PORADI_TLACITEK.map((tlacitko) => (
                  <button
                    key={tlacitko}
                    type="button"
                    className={`souboj-akcni-tlacitko souboj-akcni-tlacitko--${tlacitko} souboj-lokal-akcni-tlacitko`}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId)
                      tlacitkaRef.current[tlacitko] = true
                      zavibrujTlacitko()
                    }}
                    onPointerUp={() => (tlacitkaRef.current[tlacitko] = false)}
                    onPointerCancel={() => (tlacitkaRef.current[tlacitko] = false)}
                  >
                    {IKONA_TLACITKA[tlacitko]}
                  </button>
                ))}
              </div>

              {/* Osmé kolo vylepšení — rychlý emote, per hráč, čistě
                  lokální (viz posliEmoteLokalne výš). */}
              <div className="souboj-emote-radek souboj-lokal-emote-radek" aria-label="Rychlý emote">
                {RYCHLE_EMOTE.map((emote) => (
                  <button
                    key={emote}
                    type="button"
                    className="souboj-emote-btn"
                    onClick={() => posliEmoteLokalne(hrac, emote)}
                  >
                    {emote}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
