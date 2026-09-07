import React, { useEffect, useRef, useState } from 'react'
import { ARENA_SIRKA, krokSouboje, vytvorSoubojStav } from '../combat/engine'
import { HIT_STOP_MS, INTRO_MS, KO_HIT_STOP_MS, sestavVstup } from '../combat/loop'
import { pripravAkciAi, type Obtiznost } from '../combat/ai'
import { POSTAVY } from '../combat/postavy'
import type { PostavaId } from '../combat/postavy'
import type { Pozice2D, SoubojMoznosti, SoubojStav } from '../combat/types'
import type { Tlacitko } from '../types'
import type { ArenaId } from '../arena/areny'
import { Bojiste } from './Bojiste'
import { PostavaGrafika } from './PostavaGrafika'
import { IntroPocitadlo } from './IntroPocitadlo'
import { zpracujVysledekZapasu } from '../xpZaZapas'
import { sdilejText } from '../sdileni'
import { nastavNapjatostHudby, spustitHudbu, zastavitHudbu } from '../sound'
import { zavibrujTlacitko } from '../haptika'
import '../FightingModule.css'

interface Props {
  postavaHrace: PostavaId
  postavaBota: PostavaId
  arenaId: ArenaId
  obtiznost: Obtiznost
  /** Volitelné, výchozí "Počítač" — Žebříček (Zebricek.tsx) sem
   *  posílá "Vlna N", ať appka nemusí ukazovat pořád stejné jméno. */
  jmenoBota?: string
  onVysledek: (vyhralHrac: boolean) => void
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

// ==========================================
// Dvanácté kolo vylepšení — souboj proti počítači na JEDNOM zařízení,
// beze sdílené TV a bez druhého skutečného telefonu (na rozdíl od
// TvHost.tsx's "Hrát proti počítači", které stejnou pripravAkciAi
// (combat/ai.ts) volá, ale pořád vyžaduje aspoň jeden skutečný
// připojený telefon-ovladač jako hráče 1). Tenhle komponent je to, co
// "Rychlý start" (FightingModule.tsx) a Žebříček (Zebricek.tsx) obě
// znovupoužívají jako jediné místo, kde skutečně běží herní smyčka —
// vždycky JEDEN zápas na 1 kolo, žádná délka zápasu/handicap/trénink
// navíc (appka je tu schválně nedává, obojí sem patří na obrazovky,
// co ProtiPocitaci volají, ne sem).
//
// XP/kredity/statistiky se připisují stejně jako u zápasu přes
// telefon-ovladač <-> TV (viz xpZaZapas.ts) — na rozdíl od
// LocalniZapas.tsx (dva LIDÉ na jednom zařízení, kde appka XP schválně
// NEDÁVÁ, ať nejde hrát sám proti sobě zdarma), tady jde vždycky o
// skutečného bota se skutečnou obtížností, přesně jako u řešení na TV,
// jen bez druhého zařízení.
// ==========================================

export const ProtiPocitaci: React.FC<Props> = ({
  postavaHrace,
  postavaBota,
  arenaId,
  obtiznost,
  jmenoBota = 'Počítač',
  onVysledek,
  onZpet,
}) => {
  const [soubojStav, setSoubojStav] = useState<SoubojStav | null>(null)
  const [introAktivni, setIntroAktivni] = useState(true)
  const soubojStavRef = useRef<SoubojStav | null>(null)
  const hitStopMsRef = useRef(0)
  const vyhodnoceno = useRef(false)

  const smer = useRef<StavSmeru>({ ...PRAZDNY_SMER })
  const tlacitka = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })
  const tlacitkaPredchozi = useRef<Record<Tlacitko, boolean>>({ ...PRAZDNA_TLACITKA })

  useEffect(() => {
    const id = window.setTimeout(() => setIntroAktivni(false), INTRO_MS)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (introAktivni) return
    const moznosti: SoubojMoznosti = {
      treninkovyRezim: false,
      handicapManaRegen: [1, 1],
      hazardOkraju: false,
      udalostAreny: null,
    }
    const novyStav = vytvorSoubojStav(POZICE_START[0], POZICE_START[1], postavaHrace, postavaBota, moznosti)
    soubojStavRef.current = novyStav
    setSoubojStav(novyStav)
    vyhodnoceno.current = false
    spustitHudbu()

    let idPozadavku: number
    let posledniCas = performance.now()

    const smerZTlacitek = () => {
      const s = smer.current
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
        const vstupHrac = sestavVstup(smerZTlacitek(), tlacitkaPredchozi.current, tlacitka.current)
        tlacitkaPredchozi.current = { ...tlacitka.current }
        const vstupBot = pripravAkciAi(soubojStavRef.current.hraci[1], soubojStavRef.current.hraci[0], obtiznost)

        const hpPredTikem: [number, number] = [soubojStavRef.current.hraci[0].hp, soubojStavRef.current.hraci[1].hp]
        soubojStavRef.current = krokSouboje(soubojStavRef.current, [vstupHrac, vstupBot], deltaMs)
        setSoubojStav(soubojStavRef.current)
        nastavNapjatostHudby(soubojStavRef.current.suddenDeath)

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
          zpracujVysledekZapasu(1, vitez === null ? null : vitez === 0 ? 1 : 2, postavaHrace, postavaBota)
          window.setTimeout(() => onVysledek(vitez === 0), 1200)
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
  }, [introAktivni])

  return (
    <div className="souboj-page souboj-page--tv">
      <header className="souboj-top-bar">
        <button className="souboj-back-btn" onClick={onZpet}>
          ← Zpět
        </button>
        <h1 className="souboj-title">{jmenoBota}</h1>
      </header>

      {introAktivni ? (
        <div className="souboj-intro" aria-label="Zápas začíná">
          <div className="souboj-intro-bojovnik souboj-intro-bojovnik--1">
            <PostavaGrafika postavaId={postavaHrace} size={96} />
            <span className="souboj-intro-jmeno">Ty</span>
            <span className="souboj-intro-hlaska">„{POSTAVY[postavaHrace].hlaska}“</span>
          </div>
          <span className="souboj-intro-vs">VS</span>
          <div className="souboj-intro-bojovnik souboj-intro-bojovnik--2">
            <PostavaGrafika postavaId={postavaBota} size={96} />
            <span className="souboj-intro-jmeno">{jmenoBota}</span>
            <span className="souboj-intro-hlaska">„{POSTAVY[postavaBota].hlaska}“</span>
          </div>
          <IntroPocitadlo celkovaDelkaMs={INTRO_MS} />
        </div>
      ) : (
        soubojStav && (
          <>
            <Bojiste stav={soubojStav} jmena={['Ty', jmenoBota]} arenaId={arenaId} emotes={[null, null]} kolo={1} />

            {soubojStav.stavKola === 'konec' && (
              <>
                <p className="souboj-sub souboj-vysledek-info">
                  {soubojStav.vitez === 0 ? '🏆 Vyhrál jsi!' : soubojStav.vitez === 1 ? '💀 Prohrál jsi.' : '🤝 Remíza.'}
                </p>
                <button
                  type="button"
                  className="souboj-postava-nahodna"
                  onClick={() =>
                    void sdilejText(
                      soubojStav.vitez === 0
                        ? `Porazil jsem ${jmenoBota} v Souboj! 🏆`
                        : `Zahrál jsem si Souboj proti ${jmenoBota}. ⚔️`
                    )
                  }
                >
                  📤 Sdílet výsledek
                </button>
              </>
            )}
          </>
        )
      )}

      <div className="souboj-lokal-ovladace souboj-lokal-ovladace--jeden">
        <div className="souboj-lokal-klastr">
          <div className="souboj-lokal-smer">
            <button
              type="button"
              className="souboj-lokal-smer-btn souboj-lokal-smer-btn--nahoru"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                smer.current.nahoru = true
              }}
              onPointerUp={() => (smer.current.nahoru = false)}
              onPointerCancel={() => (smer.current.nahoru = false)}
            >
              ▲
            </button>
            <button
              type="button"
              className="souboj-lokal-smer-btn souboj-lokal-smer-btn--vlevo"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                smer.current.vlevo = true
              }}
              onPointerUp={() => (smer.current.vlevo = false)}
              onPointerCancel={() => (smer.current.vlevo = false)}
            >
              ◀
            </button>
            <button
              type="button"
              className="souboj-lokal-smer-btn souboj-lokal-smer-btn--vpravo"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                smer.current.vpravo = true
              }}
              onPointerUp={() => (smer.current.vpravo = false)}
              onPointerCancel={() => (smer.current.vpravo = false)}
            >
              ▶
            </button>
            <button
              type="button"
              className="souboj-lokal-smer-btn souboj-lokal-smer-btn--dolu"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                smer.current.dolu = true
              }}
              onPointerUp={() => (smer.current.dolu = false)}
              onPointerCancel={() => (smer.current.dolu = false)}
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
                  tlacitka.current[tlacitko] = true
                  zavibrujTlacitko()
                }}
                onPointerUp={() => (tlacitka.current[tlacitko] = false)}
                onPointerCancel={() => (tlacitka.current[tlacitko] = false)}
              >
                {IKONA_TLACITKA[tlacitko]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
