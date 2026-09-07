import React, { useEffect, useRef, useState } from 'react'
import { ARENA_SIRKA, krokSouboje, vytvorSoubojStav } from '../combat/engine'
import { HIT_STOP_MS, INTRO_MS, KO_HIT_STOP_MS, sestavVstup } from '../combat/loop'
import { POSTAVY } from '../combat/postavy'
import type { PostavaId } from '../combat/postavy'
import type { Pozice2D, SoubojMoznosti, SoubojStav } from '../combat/types'
import type { SmerVektor, Tlacitko } from '../types'
import { nahodnaArena } from '../arena/areny'
import type { ArenaId } from '../arena/areny'
import { Bojiste } from './Bojiste'
import { PostavaGrafika } from './PostavaGrafika'
import { IntroPocitadlo } from './IntroPocitadlo'
import { VyberPostavy } from './VyberPostavy'
import { sdilejText } from '../sdileni'
import { odemkniZvuk, spustitHudbu, zastavitHudbu } from '../sound'
import { zavibrujTlacitko } from '../haptika'
import '../FightingModule.css'

interface Props {
  onZpet: () => void
}

const PRAZDNA_TLACITKA: Record<Tlacitko, boolean> = { udar: false, kop: false, blok: false, specialni: false }
const IKONA_TLACITKA: Record<Tlacitko, string> = { udar: '👊', kop: '🦵', blok: '🛡️', specialni: '✨' }
const PORADI_TLACITEK: Tlacitko[] = ['udar', 'kop', 'blok', 'specialni']

interface StavSmeru {
  nahoru: boolean
  dolu: boolean
  vlevo: boolean
  vpravo: boolean
}
const PRAZDNY_SMER: StavSmeru = { nahoru: false, dolu: false, vlevo: false, vpravo: false }

const POZICE_START: [Pozice2D, Pozice2D] = [
  { x: 200, z: ARENA_SIRKA / 2 },
  { x: ARENA_SIRKA - 200, z: ARENA_SIRKA / 2 },
]

type Krok = 'vyberSampiona' | 'vyberVyzyvatele' | 'hra' | 'konec'

// ==========================================
// Dvanácté kolo vylepšení — turnaj "vítěz zůstává" na jednom zařízení,
// pro 3 a víc hráčů, co se střídají u stejného telefonu/tabletu.
// Šampion (postavaSampiona) hraje zápas za zápasem, dokud ho někdo
// neporazí — pak se poražený odchází a NOVÝ vyzyvatel (jiný člověk u
// stejného zařízení) si vybere postavu a nastoupí místo něj. Appka si
// mezi zápasy pamatuje jen sérii (kolik zápasů v řadě zrovna vládnoucí
// šampion vyhrál) a celkový počet odehraných kol — žádné jiné skóre,
// žádná tabulka výsledků pro víc než dva lidi najednou (appka nemá jak
// vědět, KDO přesně u zařízení sedí, jen jaké POSTAVY hrají).
//
// Jde vždycky o jeden zápas na 1 kolo (appka schválně nenabízí
// Bo3/Bo5 ani trénink/handicap — u rotace víc lidí by to jen
// prodlužovalo, kdy se každý další vyzyvatel vůbec dostane na řadu),
// aréna se losuje znovu KAŽDÝ zápas (nahodnaArena, stejná funkce jako
// Zebricek.tsx). Žádné XP/kredity — stejné pravidlo jako
// LocalniZapas.tsx (dva LIDÉ na jednom zařízení), ne
// ProtiPocitaci.tsx (skutečný bot) — appka nechce, aby dva kamarádi u
// jednoho telefonu mohli takhle "vytěžit" odměny hraním sami proti
// sobě navzájem.
// ==========================================

export const TurnajLokalni: React.FC<Props> = ({ onZpet }) => {
  const [krok, setKrok] = useState<Krok>('vyberSampiona')
  const [postavaSampiona, setPostavaSampiona] = useState<PostavaId | null>(null)
  const [postavaVyzyvatele, setPostavaVyzyvatele] = useState<PostavaId | null>(null)
  const [serie, setSerie] = useState(0)
  const [kolo, setKolo] = useState(0)
  const [arenaId, setArenaId] = useState<ArenaId>(nahodnaArena())
  const [soubojStav, setSoubojStav] = useState<SoubojStav | null>(null)
  const [introAktivni, setIntroAktivni] = useState(false)

  const soubojStavRef = useRef<SoubojStav | null>(null)
  const hitStopMsRef = useRef(0)
  const vyhodnoceno = useRef(false)

  const p1Smer = useRef<StavSmeru>({ ...PRAZDNY_SMER })
  const p1Tlacitka = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })
  const p1TlacitkaPredchozi = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })
  const p2Smer = useRef<StavSmeru>({ ...PRAZDNY_SMER })
  const p2Tlacitka = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })
  const p2TlacitkaPredchozi = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })

  useEffect(() => {
    if (krok !== 'hra') return
    setIntroAktivni(true)
    const id = window.setTimeout(() => setIntroAktivni(false), INTRO_MS)
    return () => window.clearTimeout(id)
  }, [krok, kolo])

  useEffect(() => {
    if (krok !== 'hra' || introAktivni || !postavaSampiona || !postavaVyzyvatele) return
    const moznosti: SoubojMoznosti = { treninkovyRezim: false, handicapManaRegen: [1, 1], hazardOkraju: false, udalostAreny: null }
    const novyStav = vytvorSoubojStav(POZICE_START[0], POZICE_START[1], postavaSampiona, postavaVyzyvatele, moznosti)
    soubojStavRef.current = novyStav
    setSoubojStav(novyStav)
    p1TlacitkaPredchozi.current = { ...PRAZDNA_TLACITKA }
    p2TlacitkaPredchozi.current = { ...PRAZDNA_TLACITKA }
    vyhodnoceno.current = false
    spustitHudbu()

    let idPozadavku: number
    let posledniCas = performance.now()

    const smerZTlacitek = (s: StavSmeru): SmerVektor | null => {
      const x = (s.vpravo ? 1 : 0) - (s.vlevo ? 1 : 0)
      const z = (s.dolu ? 1 : 0) - (s.nahoru ? 1 : 0)
      return x === 0 && z === 0 ? null : { x, z }
    }

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

        const hpPredTikem: [number, number] = [soubojStavRef.current.hraci[0].hp, soubojStavRef.current.hraci[1].hp]
        soubojStavRef.current = krokSouboje(soubojStavRef.current, [vstup0, vstup1], deltaMs)
        setSoubojStav(soubojStavRef.current)

        const hpKleslo =
          soubojStavRef.current.hraci[0].hp < hpPredTikem[0] || soubojStavRef.current.hraci[1].hp < hpPredTikem[1]
        if (hpKleslo) {
          const koTetoRundy =
            (soubojStavRef.current.hraci[0].hp <= 0 && hpPredTikem[0] > 0) ||
            (soubojStavRef.current.hraci[1].hp <= 0 && hpPredTikem[1] > 0)
          hitStopMsRef.current = koTetoRundy ? KO_HIT_STOP_MS : HIT_STOP_MS
        }

        if (soubojStavRef.current.stavKola === 'konec' && !vyhodnoceno.current) {
          vyhodnoceno.current = true
          const vitez = soubojStavRef.current.vitez
          window.setTimeout(() => {
            setKolo((k) => k + 1)
            if (vitez === 0) {
              // Šampion obhájil trůn — série roste, appka jen čeká na
              // dalšího vyzyvatele.
              setSerie((s) => s + 1)
            } else if (vitez === 1) {
              // Vyzyvatel vyhrál — stává se NOVÝM šampionem, série se
              // resetuje na 1 (právě vyhrál svůj první zápas na trůnu).
              setPostavaSampiona(postavaVyzyvatele)
              setSerie(1)
            }
            // Remíza (vitez === null) — appka schválně nikoho nekorunuje
            // ani nesesazuje, série zůstává, jak byla, a appka rovnou
            // vypíše dalšího vyzyvatele.
            setArenaId(nahodnaArena())
            setKrok('vyberVyzyvatele')
          }, 1200)
        }
      }

      idPozadavku = requestAnimationFrame(tik)
    }

    idPozadavku = requestAnimationFrame(tik)
    return () => {
      cancelAnimationFrame(idPozadavku)
      zastavitHudbu()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [krok, introAktivni])

  if (krok === 'vyberSampiona') {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={onZpet}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Turnaj — první šampion</h1>
        </header>
        <p className="souboj-sub">Kdo usedne na trůn jako první? Vyber postavu pro prvního hráče.</p>
        <VyberPostavy
          onVybrano={(id) => {
            odemkniZvuk()
            setPostavaSampiona(id)
            setKrok('vyberVyzyvatele')
          }}
        />
      </div>
    )
  }

  if (krok === 'vyberVyzyvatele') {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={onZpet}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Turnaj — další vyzyvatel</h1>
        </header>
        {postavaSampiona && (
          <p className="souboj-sub">
            👑 Šampion: {POSTAVY[postavaSampiona].ikona} {POSTAVY[postavaSampiona].jmeno} (série {serie}) · Odehráno kol:{' '}
            {kolo}
          </p>
        )}
        <VyberPostavy
          onVybrano={(id) => {
            setPostavaVyzyvatele(id)
            setKrok('hra')
          }}
        />
        <button
          type="button"
          className="souboj-postava-nahodna"
          onClick={() => setKrok('konec')}
        >
          🏁 Ukončit turnaj
        </button>
      </div>
    )
  }

  if (krok === 'konec') {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={onZpet}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Turnaj skončil</h1>
        </header>
        <div className="souboj-recap" aria-label="Konec turnaje">
          <span className="souboj-recap-nadpis">🏆 Vítěz turnaje</span>
          {postavaSampiona && (
            <span className="souboj-recap-radek">
              <span>
                {POSTAVY[postavaSampiona].ikona} {POSTAVY[postavaSampiona].jmeno}
              </span>
              <span>Série {serie} · {kolo} odehraných kol</span>
            </span>
          )}
        </div>
        <button
          type="button"
          className="souboj-solo-btn"
          onClick={() =>
            postavaSampiona &&
            void sdilejText(
              `${POSTAVY[postavaSampiona].jmeno} vyhrál/a turnaj Souboj se sérií ${serie} výher! 🏆`
            )
          }
        >
          📤 Sdílet výsledek
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
        <h1 className="souboj-title">Turnaj — kolo {kolo + 1}</h1>
      </header>

      {introAktivni ? (
        <div className="souboj-intro" aria-label="Zápas začíná">
          <div className="souboj-intro-bojovnik souboj-intro-bojovnik--1">
            <PostavaGrafika postavaId={postavaSampiona ?? 'onyx'} size={96} />
            <span className="souboj-intro-jmeno">👑 Šampion</span>
          </div>
          <span className="souboj-intro-vs">VS</span>
          <div className="souboj-intro-bojovnik souboj-intro-bojovnik--2">
            <PostavaGrafika postavaId={postavaVyzyvatele ?? 'onyx'} size={96} />
            <span className="souboj-intro-jmeno">Vyzyvatel</span>
          </div>
          <IntroPocitadlo celkovaDelkaMs={INTRO_MS} />
        </div>
      ) : (
        soubojStav && (
          <Bojiste
            stav={soubojStav}
            jmena={['Šampion', 'Vyzyvatel']}
            arenaId={arenaId}
            emotes={[null, null]}
            kolo={kolo + 1}
          />
        )
      )}

      <div className="souboj-lokal-ovladace">
        {([0, 1] as const).map((hrac) => {
          const smerRef = hrac === 0 ? p1Smer : p2Smer
          const tlacitkaRef = hrac === 0 ? p1Tlacitka : p2Tlacitka
          return (
            <div key={hrac} className={`souboj-lokal-klastr souboj-lokal-klastr--${hrac + 1}`}>
              <div className="souboj-lokal-smer">
                <button
                  type="button"
                  className="souboj-lokal-smer-btn souboj-lokal-smer-btn--nahoru"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    smerRef.current.nahoru = true
                  }}
                  onPointerUp={() => (smerRef.current.nahoru = false)}
                  onPointerCancel={() => (smerRef.current.nahoru = false)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="souboj-lokal-smer-btn souboj-lokal-smer-btn--vlevo"
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
                  className="souboj-lokal-smer-btn souboj-lokal-smer-btn--vpravo"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    smerRef.current.vpravo = true
                  }}
                  onPointerUp={() => (smerRef.current.vpravo = false)}
                  onPointerCancel={() => (smerRef.current.vpravo = false)}
                >
                  ▶
                </button>
                <button
                  type="button"
                  className="souboj-lokal-smer-btn souboj-lokal-smer-btn--dolu"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    smerRef.current.dolu = true
                  }}
                  onPointerUp={() => (smerRef.current.dolu = false)}
                  onPointerCancel={() => (smerRef.current.dolu = false)}
                >
                  ▼
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
