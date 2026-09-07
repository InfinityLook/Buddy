import React, { useEffect, useRef, useState } from 'react'
import { hostujMistnost } from '../network'
import { ARENA_SIRKA, krokSouboje, vytvorSoubojStav } from '../combat/engine'
import { HIT_STOP_MS, INTRO_MS, KO_HIT_STOP_MS, sestavVstup } from '../combat/loop'
import type { PostavaId } from '../combat/postavy'
import type { Pozice2D, SoubojMoznosti, SoubojStav } from '../combat/types'
import type { PripojitPayload, SmerVektor, Tlacitko, VstupPayload } from '../types'
import { VYCHOZI_ARENA } from '../arena/areny'
import { zpracujVysledekZapasu } from '../xpZaZapas'
import { Bojiste } from './Bojiste'
import { IntroPocitadlo } from './IntroPocitadlo'
import { PostavaGrafika } from './PostavaGrafika'
import { POSTAVY } from '../combat/postavy'
import { nastavNapjatostHudby, spustitHudbu, zastavitHudbu } from '../sound'
import { zavibrujTlacitko } from '../haptika'
import '../FightingModule.css'

interface Props {
  kod: string
  mojePostava: PostavaId
  postavaSoupere: PostavaId
  onZpet: () => void
}

interface Hrac2 {
  hracId: string
  smer: SmerVektor | null
  tlacitka: Record<Tlacitko, boolean>
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

// ==========================================
// Dvanácté kolo vylepšení — souboj na dálku, hostitelská strana
// (spárovaná přes OnlineLobby.tsx). Na rozdíl od TvHost.tsx appka tu
// není jen "TV bez vlastního hráče" — hostitel je jeden ze dvou
// SKUTEČNÝCH hráčů, jen navíc jediný, kdo doopravdy simuluje
// (krokSouboje) a po každém tiku rozešle hotový SoubojStav dál (viz
// network.ts's oznamStavZapasu) — druhá strana (OnlineGuest.tsx) ho
// jen VYKRESLÍ, nepočítá znovu. Appka schválně nenabízí žádné volby
// zápasu (aréna/trénink/handicap/délka) — jde vždycky o jeden rychlý
// zápas na 1 kolo s náhodnou arénou, stejné zjednodušení jako
// TurnajLokalni.tsx, ať appka nemusí ty volby synchronizovat mezi
// dvěma zařízeními navíc.
//
// Vlastní vstup hostitele (d-pad/tlačítka níž) jde přes LOKÁLNÍ refy,
// stejně jako ProtiPocitaci.tsx/TurnajLokalni.tsx — na síť se posílá
// jen VÝSLEDNÝ SoubojStav, ne surový vstup hostitele, appka to
// nepotřebuje zdvojovat.
// ==========================================

export const OnlineHost: React.FC<Props> = ({ kod, mojePostava, postavaSoupere, onZpet }) => {
  const [hrac2, setHrac2] = useState<Hrac2 | null>(null)
  const [soubojStav, setSoubojStav] = useState<SoubojStav | null>(null)
  const [introAktivni, setIntroAktivni] = useState(true)
  // Dvanácté kolo vylepšení — pevná aréna, ne náhodná (na rozdíl od
  // TurnajLokalni.tsx/Zebricek.tsx). Appka nemá jak zvolenou arénu
  // synchronizovat s druhou stranou bez dalšího pole na síti (aréna se
  // jinak NIKDY neposílá, viz areny.ts's vlastní komentář) — a protivná
  // aréna, kterou by hostitel viděl jinou než soupeř, by byla matoucí i
  // když by na engine samotný neměla žádný vliv.
  const arenaId = VYCHOZI_ARENA

  const hrac2Ref = useRef<Hrac2 | null>(null)
  hrac2Ref.current = hrac2

  const soubojStavRef = useRef<SoubojStav | null>(null)
  const hitStopMsRef = useRef(0)
  const vyhodnoceno = useRef(false)
  const spravaRef = useRef<ReturnType<typeof hostujMistnost> | null>(null)

  const mujSmer = useRef<StavSmeru>({ ...PRAZDNY_SMER })
  const mojeTlacitka = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })
  const mojeTlacitkaPredchozi = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })
  const hrac2TlacitkaPredchozi = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })

  useEffect(() => {
    const sprava = hostujMistnost(kod, {
      pripojilSe: (p: PripojitPayload) => {
        setHrac2((soucasny) => soucasny ?? { hracId: p.hracId, smer: null, tlacitka: { ...PRAZDNA_TLACITKA } })
      },
      prisalVstup: (p: VstupPayload) => {
        setHrac2((soucasny) => {
          if (!soucasny || soucasny.hracId !== p.hracId) return soucasny
          if (p.typ === 'smer') return { ...soucasny, smer: p.smer }
          return { ...soucasny, tlacitka: { ...soucasny.tlacitka, [p.tlacitko]: p.stisknuto } }
        })
      },
    })
    spravaRef.current = sprava
    return () => sprava.zrusit()
  }, [kod])

  useEffect(() => {
    if (!hrac2) {
      setIntroAktivni(true)
      return
    }
    const id = window.setTimeout(() => setIntroAktivni(false), INTRO_MS)
    return () => window.clearTimeout(id)
  }, [!!hrac2])

  useEffect(() => {
    if (!hrac2 || introAktivni) return
    const moznosti: SoubojMoznosti = { treninkovyRezim: false, handicapManaRegen: [1, 1], hazardOkraju: false, udalostAreny: null }
    const novyStav = vytvorSoubojStav(POZICE_START[0], POZICE_START[1], mojePostava, postavaSoupere, moznosti)
    soubojStavRef.current = novyStav
    setSoubojStav(novyStav)
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

      const aktualniHrac2 = hrac2Ref.current
      if (aktualniHrac2 && soubojStavRef.current) {
        const vstup0 = sestavVstup(smerZTlacitek(mujSmer.current), mojeTlacitkaPredchozi.current, mojeTlacitka.current)
        mojeTlacitkaPredchozi.current = { ...mojeTlacitka.current }
        const vstup1 = sestavVstup(aktualniHrac2.smer, hrac2TlacitkaPredchozi.current, aktualniHrac2.tlacitka)
        hrac2TlacitkaPredchozi.current = { ...aktualniHrac2.tlacitka }

        const stavPredTikem = soubojStavRef.current.stavKola
        const hpPredTikem: [number, number] = [soubojStavRef.current.hraci[0].hp, soubojStavRef.current.hraci[1].hp]
        soubojStavRef.current = krokSouboje(soubojStavRef.current, [vstup0, vstup1], deltaMs)
        setSoubojStav(soubojStavRef.current)
        nastavNapjatostHudby(soubojStavRef.current.suddenDeath)
        // Appka rozešle hotový stav KAŽDÝ tik — jediné, co druhá strana
        // (OnlineGuest.tsx) potřebuje k vykreslení, žádnou vlastní
        // simulaci na svojí straně nepočítá.
        spravaRef.current?.oznamStavZapasu(soubojStavRef.current)

        const hpKleslo =
          soubojStavRef.current.hraci[0].hp < hpPredTikem[0] || soubojStavRef.current.hraci[1].hp < hpPredTikem[1]
        if (hpKleslo) {
          const koTetoRundy =
            (soubojStavRef.current.hraci[0].hp <= 0 && hpPredTikem[0] > 0) ||
            (soubojStavRef.current.hraci[1].hp <= 0 && hpPredTikem[1] > 0)
          hitStopMsRef.current = koTetoRundy ? KO_HIT_STOP_MS : HIT_STOP_MS
        }

        if (stavPredTikem === 'probiha' && soubojStavRef.current.stavKola === 'konec' && !vyhodnoceno.current) {
          vyhodnoceno.current = true
          const vitez = soubojStavRef.current.vitez
          zpracujVysledekZapasu(1, vitez === null ? null : vitez === 0 ? 1 : 2, mojePostava, postavaSoupere)
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
  }, [!!hrac2, introAktivni])

  return (
    <div className="souboj-page souboj-page--tv">
      <header className="souboj-top-bar">
        <button className="souboj-back-btn" onClick={onZpet}>
          ← Zpět
        </button>
        <h1 className="souboj-title">Souboj online</h1>
      </header>

      {!hrac2 ? (
        <p className="souboj-sub">Čekám, až se soupeř připojí…</p>
      ) : introAktivni ? (
        <div className="souboj-intro" aria-label="Zápas začíná">
          <div className="souboj-intro-bojovnik souboj-intro-bojovnik--1">
            <PostavaGrafika postavaId={mojePostava} size={96} />
            <span className="souboj-intro-jmeno">Ty</span>
            <span className="souboj-intro-hlaska">„{POSTAVY[mojePostava].hlaska}“</span>
          </div>
          <span className="souboj-intro-vs">VS</span>
          <div className="souboj-intro-bojovnik souboj-intro-bojovnik--2">
            <PostavaGrafika postavaId={postavaSoupere} size={96} />
            <span className="souboj-intro-jmeno">Soupeř</span>
            <span className="souboj-intro-hlaska">„{POSTAVY[postavaSoupere].hlaska}“</span>
          </div>
          <IntroPocitadlo celkovaDelkaMs={INTRO_MS} />
        </div>
      ) : (
        soubojStav && (
          <>
            <Bojiste stav={soubojStav} jmena={['Ty', 'Soupeř']} arenaId={arenaId} emotes={[null, null]} kolo={1} />
            {soubojStav.stavKola === 'konec' && (
              <p className="souboj-sub souboj-vysledek-info">
                {soubojStav.vitez === 0 ? '🏆 Vyhrál jsi!' : soubojStav.vitez === 1 ? '💀 Prohrál jsi.' : '🤝 Remíza.'}
              </p>
            )}
          </>
        )
      )}

      {hrac2 && !introAktivni && (
        <div className="souboj-lokal-ovladace souboj-lokal-ovladace--jeden">
          <div className="souboj-lokal-klastr">
            <div className="souboj-lokal-smer">
              <button
                type="button"
                className="souboj-lokal-smer-btn souboj-lokal-smer-btn--nahoru"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  mujSmer.current.nahoru = true
                }}
                onPointerUp={() => (mujSmer.current.nahoru = false)}
                onPointerCancel={() => (mujSmer.current.nahoru = false)}
              >
                ▲
              </button>
              <button
                type="button"
                className="souboj-lokal-smer-btn souboj-lokal-smer-btn--vlevo"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  mujSmer.current.vlevo = true
                }}
                onPointerUp={() => (mujSmer.current.vlevo = false)}
                onPointerCancel={() => (mujSmer.current.vlevo = false)}
              >
                ◀
              </button>
              <button
                type="button"
                className="souboj-lokal-smer-btn souboj-lokal-smer-btn--vpravo"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  mujSmer.current.vpravo = true
                }}
                onPointerUp={() => (mujSmer.current.vpravo = false)}
                onPointerCancel={() => (mujSmer.current.vpravo = false)}
              >
                ▶
              </button>
              <button
                type="button"
                className="souboj-lokal-smer-btn souboj-lokal-smer-btn--dolu"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  mujSmer.current.dolu = true
                }}
                onPointerUp={() => (mujSmer.current.dolu = false)}
                onPointerCancel={() => (mujSmer.current.dolu = false)}
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
                    mojeTlacitka.current[tlacitko] = true
                    zavibrujTlacitko()
                  }}
                  onPointerUp={() => (mojeTlacitka.current[tlacitko] = false)}
                  onPointerCancel={() => (mojeTlacitka.current[tlacitko] = false)}
                >
                  {IKONA_TLACITKA[tlacitko]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
