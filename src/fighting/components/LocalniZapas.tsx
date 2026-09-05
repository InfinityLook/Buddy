import React, { useEffect, useRef, useState } from 'react'
import { ARENA_SIRKA, krokSouboje, vytvorSoubojStav } from '../combat/engine'
import { HIT_STOP_MS, sestavVstup } from '../combat/loop'
import { useSoubojStatistikyStore } from '../useSoubojStatistikyStore'
import { zavibrujTlacitko } from '../haptika'
import type { PostavaId } from '../combat/postavy'
import type { SoubojStav } from '../combat/types'
import type { Smer, Tlacitko } from '../types'
import { SEZNAM_AREN, VYCHOZI_ARENA, type ArenaId } from '../arena/areny'
import { Bojiste } from './Bojiste'
import { VyberPostavy } from './VyberPostavy'
import '../FightingModule.css'

interface Props {
  onZpet: () => void
}

const PRAZDNA_TLACITKA: Record<Tlacitko, boolean> = { udar: false, kop: false, blok: false, specialni: false }
const IKONA_TLACITKA: Record<Tlacitko, string> = { udar: '👊', kop: '🦵', blok: '🛡️', specialni: '✨' }
const PORADI_TLACITEK: Tlacitko[] = ['udar', 'kop', 'blok', 'specialni']

const POZICE_START: [number, number] = [200, ARENA_SIRKA - 200]

type Krok = 'vyberP1' | 'vyberP2' | 'priprava' | 'hra'

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
// ==========================================

export const LocalniZapas: React.FC<Props> = ({ onZpet }) => {
  const [krok, setKrok] = useState<Krok>('vyberP1')
  const [postava0, setPostava0] = useState<PostavaId | null>(null)
  const [postava1, setPostava1] = useState<PostavaId | null>(null)
  const [arenaId, setArenaId] = useState<ArenaId>(VYCHOZI_ARENA)
  const [soubojStav, setSoubojStav] = useState<SoubojStav | null>(null)

  const soubojStavRef = useRef<SoubojStav | null>(null)
  const hitStopMsRef = useRef(0)

  // Dva nezávislé páry refů, jeden za hráče — stejný tvar, jaký by
  // jinak dorazil přes broadcast (viz TvHost.tsx), jen naplňovaný
  // přímo z pointerdown/pointerup na TÉHLE obrazovce, ne ze sítě.
  const p1Tlacitka = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })
  const p1TlacitkaPredchozi = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })
  const p1Smer = useRef<{ vlevo: boolean; vpravo: boolean }>({ vlevo: false, vpravo: false })
  const p2Tlacitka = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })
  const p2TlacitkaPredchozi = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })
  const p2Smer = useRef<{ vlevo: boolean; vpravo: boolean }>({ vlevo: false, vpravo: false })

  useEffect(() => {
    if (krok !== 'hra' || !postava0 || !postava1) return
    const novyStav = vytvorSoubojStav(POZICE_START[0], POZICE_START[1], postava0, postava1)
    soubojStavRef.current = novyStav
    setSoubojStav(novyStav)
    p1TlacitkaPredchozi.current = { ...PRAZDNA_TLACITKA }
    p2TlacitkaPredchozi.current = { ...PRAZDNA_TLACITKA }

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

        const hpPredTikem: [number, number] = [soubojStavRef.current.hraci[0].hp, soubojStavRef.current.hraci[1].hp]
        soubojStavRef.current = krokSouboje(soubojStavRef.current, [vstup0, vstup1], deltaMs)
        setSoubojStav(soubojStavRef.current)

        if (
          soubojStavRef.current.hraci[0].hp < hpPredTikem[0] ||
          soubojStavRef.current.hraci[1].hp < hpPredTikem[1]
        ) {
          hitStopMsRef.current = HIT_STOP_MS
        }

        if (soubojStavRef.current.stavKola === 'konec' && soubojStavRef.current.vitez !== null) {
          const vitez = soubojStavRef.current.vitez
          const prohravsi = vitez === 0 ? 1 : 0
          useSoubojStatistikyStore.getState().zaznamenejVysledek(vitez === 0 ? postava0 : postava1, 'vyhra')
          useSoubojStatistikyStore.getState().zaznamenejVysledek(prohravsi === 0 ? postava0 : postava1, 'prohra')
        } else if (soubojStavRef.current.stavKola === 'konec') {
          useSoubojStatistikyStore.getState().zaznamenejVysledek(postava0, 'remiza')
          useSoubojStatistikyStore.getState().zaznamenejVysledek(postava1, 'remiza')
        }
      }

      idPozadavku = requestAnimationFrame(tik)
    }

    idPozadavku = requestAnimationFrame(tik)
    return () => cancelAnimationFrame(idPozadavku)
  }, [krok, postava0, postava1])

  const znovu = () => {
    if (!postava0 || !postava1) return
    const cerstvyStav = vytvorSoubojStav(POZICE_START[0], POZICE_START[1], postava0, postava1)
    soubojStavRef.current = cerstvyStav
    p1TlacitkaPredchozi.current = { ...PRAZDNA_TLACITKA }
    p2TlacitkaPredchozi.current = { ...PRAZDNA_TLACITKA }
    setSoubojStav(cerstvyStav)
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
            </button>
          ))}
        </div>

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

      {soubojStav && (
        <>
          <Bojiste stav={soubojStav} jmena={['Hráč 1', 'Hráč 2']} arenaId={arenaId} />

          {soubojStav.stavKola === 'konec' && (
            <button type="button" className="souboj-novy-zapas-btn" onClick={znovu}>
              Hrát znovu
            </button>
          )}
        </>
      )}

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
            </div>
          )
        })}
      </div>
    </div>
  )
}
