import React, { useEffect, useRef, useState } from 'react'
import { pripojSeJakoOvladac } from '../network'
import { INTRO_MS } from '../combat/loop'
import type { PostavaId } from '../combat/postavy'
import { POSTAVY } from '../combat/postavy'
import type { PripojenoPayload, SmerVektor, Tlacitko } from '../types'
import type { SoubojStav } from '../combat/types'
import { VYCHOZI_ARENA } from '../arena/areny'
import { zpracujVysledekZapasu } from '../xpZaZapas'
import { Bojiste } from './Bojiste'
import { IntroPocitadlo } from './IntroPocitadlo'
import { PostavaGrafika } from './PostavaGrafika'
import { zavibrujTlacitko } from '../haptika'
import '../FightingModule.css'

interface Props {
  kod: string
  mujHracId: string
  jmeno: string
  mojePostava: PostavaId
  postavaSoupere: PostavaId
  onZpet: () => void
}

const PORADI_TLACITEK: Tlacitko[] = ['udar', 'kop', 'blok', 'specialni']
const IKONA_TLACITKA: Record<Tlacitko, string> = { udar: '👊', kop: '🦵', blok: '🛡️', specialni: '✨' }

// ==========================================
// Dvanácté kolo vylepšení — souboj na dálku, strana vyzyvatele
// (spárovaná přes OnlineLobby.tsx, druhá strana OnlineHost.tsx). Na
// rozdíl od Ovladac.tsx (telefon-ovladač <-> TV, appka tam žádnou hru
// nekreslí) appka tady vstup POSÍLÁ (stejný pripojSeJakoOvladac,
// poslatVstup jako Ovladac.tsx) A ZÁROVEŇ vykresluje zápas z hotového
// SoubojStav, co appce hostitel posílá po každém tiku (network.ts's
// prisalStavZapasu) — appka sama nic nesimuluje, jen zobrazuje, co jí
// hostitel řekl, že se stalo.
//
// Konec zápasu appka pozná ze STEJNÉHO přijatého proudu stavů (přechod
// 'probiha' → 'konec'), ne z druhé, samostatné síťové zprávy — appka
// v přijatém SoubojStav už má obě postavy (hraci[0]/[1].postavaId), takže
// nepotřebuje čekat na network.ts's KonecZapasuPayload jako
// Ovladac.tsx (ten sám žádný plný SoubojStav nikdy nedostává).
// ==========================================

export const OnlineGuest: React.FC<Props> = ({ kod, mujHracId, jmeno, mojePostava, postavaSoupere, onZpet }) => {
  const [pripojeno, setPripojeno] = useState(false)
  const [introAktivni, setIntroAktivni] = useState(true)
  const [soubojStav, setSoubojStav] = useState<SoubojStav | null>(null)
  const predchoziStavKolaRef = useRef<'probiha' | 'konec' | null>(null)
  const vyhodnocenoRef = useRef(false)
  const spravaRef = useRef<ReturnType<typeof pripojSeJakoOvladac> | null>(null)

  useEffect(() => {
    const sprava = pripojSeJakoOvladac(kod, mujHracId, jmeno, mojePostava, {
      pripojeno: (_p: PripojenoPayload) => setPripojeno(true),
      konecZapasu: () => {}, // Online режим appka vyhodnocuje z prisalStavZapasu níž, ne odsud.
      prisalStavZapasu: (stav: SoubojStav) => {
        setSoubojStav(stav)
        if (predchoziStavKolaRef.current === 'probiha' && stav.stavKola === 'konec' && !vyhodnocenoRef.current) {
          vyhodnocenoRef.current = true
          const vitezSlot: 1 | 2 | null = stav.vitez === null ? null : stav.vitez === 0 ? 1 : 2
          zpracujVysledekZapasu(2, vitezSlot, stav.hraci[0].postavaId, stav.hraci[1].postavaId)
        }
        predchoziStavKolaRef.current = stav.stavKola
      },
    })
    spravaRef.current = sprava
    return () => sprava.zrusit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kod])

  useEffect(() => {
    if (!pripojeno) return
    const id = window.setTimeout(() => setIntroAktivni(false), INTRO_MS)
    return () => window.clearTimeout(id)
  }, [pripojeno])

  const posliSmer = (smer: SmerVektor | null) => {
    spravaRef.current?.poslatVstup({ hracId: mujHracId, typ: 'smer', smer })
  }
  const posliTlacitko = (tlacitko: Tlacitko, stisknuto: boolean) => {
    if (stisknuto) zavibrujTlacitko()
    spravaRef.current?.poslatVstup({ hracId: mujHracId, typ: 'tlacitko', tlacitko, stisknuto })
  }

  const DEADZONA = 0.15
  const PRAH_ZMENY = 0.08
  const posledniSmerRef = useRef<SmerVektor | null>(null)
  const smerDrzen = useRef({ nahoru: false, dolu: false, vlevo: false, vpravo: false })
  const posliSmerZDpadu = () => {
    const s = smerDrzen.current
    const x = (s.vpravo ? 1 : 0) - (s.vlevo ? 1 : 0)
    const z = (s.dolu ? 1 : 0) - (s.nahoru ? 1 : 0)
    const velikost = Math.hypot(x, z)
    const smer: SmerVektor | null = velikost < DEADZONA ? null : { x, z }
    const predchozi = posledniSmerRef.current
    const zmena =
      (smer === null) !== (predchozi === null) ||
      (smer !== null && predchozi !== null && Math.hypot(smer.x - predchozi.x, smer.z - predchozi.z) > PRAH_ZMENY)
    if (zmena) {
      posledniSmerRef.current = smer
      posliSmer(smer)
    }
  }

  if (!pripojeno) {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={onZpet}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Souboj online</h1>
        </header>
        <p className="souboj-sub">Připojuji se k soupeři…</p>
      </div>
    )
  }

  if (introAktivni) {
    return (
      <div className="souboj-page souboj-page--tv">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={onZpet}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Souboj online</h1>
        </header>
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
      </div>
    )
  }

  return (
    <div className="souboj-page souboj-page--tv">
      <header className="souboj-top-bar">
        <button className="souboj-back-btn" onClick={onZpet}>
          ← Zpět
        </button>
        <h1 className="souboj-title">Souboj online</h1>
      </header>

      {soubojStav ? (
        <>
          <Bojiste
            stav={soubojStav}
            jmena={['Soupeř', 'Ty']}
            arenaId={VYCHOZI_ARENA}
            emotes={[null, null]}
            kolo={1}
          />
          {soubojStav.stavKola === 'konec' && (
            <p className="souboj-sub souboj-vysledek-info">
              {soubojStav.vitez === 1 ? '🏆 Vyhrál jsi!' : soubojStav.vitez === 0 ? '💀 Prohrál jsi.' : '🤝 Remíza.'}
            </p>
          )}
        </>
      ) : (
        <p className="souboj-sub">Čekám na první snímek zápasu…</p>
      )}

      <div className="souboj-lokal-ovladace souboj-lokal-ovladace--jeden">
        <div className="souboj-lokal-klastr">
          <div className="souboj-lokal-smer">
            <button
              type="button"
              className="souboj-lokal-smer-btn souboj-lokal-smer-btn--nahoru"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                smerDrzen.current.nahoru = true
                posliSmerZDpadu()
              }}
              onPointerUp={() => {
                smerDrzen.current.nahoru = false
                posliSmerZDpadu()
              }}
              onPointerCancel={() => {
                smerDrzen.current.nahoru = false
                posliSmerZDpadu()
              }}
            >
              ▲
            </button>
            <button
              type="button"
              className="souboj-lokal-smer-btn souboj-lokal-smer-btn--vlevo"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                smerDrzen.current.vlevo = true
                posliSmerZDpadu()
              }}
              onPointerUp={() => {
                smerDrzen.current.vlevo = false
                posliSmerZDpadu()
              }}
              onPointerCancel={() => {
                smerDrzen.current.vlevo = false
                posliSmerZDpadu()
              }}
            >
              ◀
            </button>
            <button
              type="button"
              className="souboj-lokal-smer-btn souboj-lokal-smer-btn--vpravo"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                smerDrzen.current.vpravo = true
                posliSmerZDpadu()
              }}
              onPointerUp={() => {
                smerDrzen.current.vpravo = false
                posliSmerZDpadu()
              }}
              onPointerCancel={() => {
                smerDrzen.current.vpravo = false
                posliSmerZDpadu()
              }}
            >
              ▶
            </button>
            <button
              type="button"
              className="souboj-lokal-smer-btn souboj-lokal-smer-btn--dolu"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                smerDrzen.current.dolu = true
                posliSmerZDpadu()
              }}
              onPointerUp={() => {
                smerDrzen.current.dolu = false
                posliSmerZDpadu()
              }}
              onPointerCancel={() => {
                smerDrzen.current.dolu = false
                posliSmerZDpadu()
              }}
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
                  posliTlacitko(tlacitko, true)
                }}
                onPointerUp={() => posliTlacitko(tlacitko, false)}
                onPointerCancel={() => posliTlacitko(tlacitko, false)}
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
