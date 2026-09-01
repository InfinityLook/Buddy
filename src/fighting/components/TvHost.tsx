import React, { useEffect, useState } from 'react'
import { hostujMistnost, vygenerujKodMistnosti } from '../network'
import type { PripojitPayload, Smer, Tlacitko, VstupPayload } from '../types'
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
  smer: Smer | null
  tlacitka: Record<Tlacitko, boolean>
}

const PRAZDNA_TLACITKA: Record<Tlacitko, boolean> = {
  udar: false,
  kop: false,
  blok: false,
  specialni: false,
}

// Posun tečky v ukazateli směru — čistě vizuální potvrzení, že d-pad
// z ovladače doopravdy dorazil, žádný herní význam zatím nemá.
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

// ==========================================
// TV strana Fáze 0 — vygeneruje kód místnosti, přiděluje připojující
// se ovladače na sloty 1/2 a vykresluje živou odezvu na jejich vstup
// (tečka pro směr, rozsvícená ikona pro každé držené tlačítko).
// Žádná herní grafika — to je až další fáze (viz FightingModule.tsx).
// ==========================================

export const TvHost: React.FC<Props> = ({ onZpet }) => {
  const [kod] = useState(() => vygenerujKodMistnosti())
  const [hraci, setHraci] = useState<(HracStav | null)[]>([null, null])

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

    return () => sprava.zrusit()
  }, [kod])

  return (
    <div className="souboj-page souboj-page--tv">
      <header className="souboj-top-bar">
        <button className="souboj-back-btn" onClick={onZpet}>
          ← Zpět
        </button>
        <h1 className="souboj-title">Souboj — TV</h1>
      </header>

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
                <span className="souboj-hrac-jmeno">{hrac.jmeno}</span>

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
    </div>
  )
}
