import React, { useEffect, useState } from 'react'
import { pripravSmerBota } from '../ai'
import { aktivniHrac, krokHodu, krokPohybu, ukonciTah, vytvorTrhStav } from '../engine'
import { POSTAVY } from '../postavy'
import { useTrhScene } from '../scene/useTrhScene'
import type { Hrac, Smer } from '../types'

// ==========================================
// Buddyho Trh — herní obrazovka pro Fázi 0: 3D deska + kostka + pohyb,
// žádná ekonomika. Boti hrají automaticky přes efekt sledující `stav` —
// stejný "efekt reaguje na změnu stavu, nastaví jeden timeout, sám se
// uklidí" vzor jako typing indikátor/notifikace jinde v appce, ne
// samostatná herní smyčka.
// ==========================================

const ZPOZDENI_HODU_MS = 650
const ZPOZDENI_KROKU_MS = 420
const ZPOZDENI_KONCE_TAHU_MS = 500

interface Props {
  pocatecniHraci: Hrac[]
  onZpet: () => void
}

const NAZEV_SMERU: Record<Smer, string> = {
  nahoru: '↑',
  dolu: '↓',
  vlevo: '←',
  vpravo: '→',
}

export const Deska: React.FC<Props> = ({ pocatecniHraci, onZpet }) => {
  const [stav, setStav] = useState(() => vytvorTrhStav(pocatecniHraci))
  const { containerRef, selhalo } = useTrhScene({ stav })

  // Automatický konec tahu, jakmile dojdou kroky — hráč nemusí sám
  // klikat na "Ukončit tah", pokud kroky vyčerpal doopravdy do nuly.
  useEffect(() => {
    if (stav.faze !== 'konec-tahu') return
    const cas = window.setTimeout(() => setStav((s) => ukonciTah(s)), ZPOZDENI_KONCE_TAHU_MS)
    return () => window.clearTimeout(cas)
  }, [stav.faze])

  // Bot hraje sám — hodí kostkou, pak krok po kroku dojde, kam může.
  useEffect(() => {
    const hrac = aktivniHrac(stav)
    if (!hrac?.jeBot || stav.faze === 'konec-tahu') return

    const zpozdeni = stav.faze === 'hod' ? ZPOZDENI_HODU_MS : ZPOZDENI_KROKU_MS
    const cas = window.setTimeout(() => {
      setStav((s) => {
        if (s.faze === 'hod') return krokHodu(s)
        if (s.faze === 'pohyb') {
          const aktualni = aktivniHrac(s)
          if (!aktualni) return s
          return krokPohybu(s, pripravSmerBota(aktualni, s))
        }
        return s
      })
    }, zpozdeni)
    return () => window.clearTimeout(cas)
  }, [stav])

  const hrac = aktivniHrac(stav)
  const jeNaTahuBot = hrac?.jeBot ?? false

  return (
    <div className="trh-page trh-page--hra">
      <header className="trh-top-bar">
        <button className="trh-back-btn" onClick={onZpet}>
          ← Ukončit hru
        </button>
        <h1 className="trh-title">Buddyho Trh</h1>
      </header>

      <div className="trh-deska-obal">
        {selhalo ? (
          <p className="trh-varovani">3D vykreslení se na tomhle zařízení nepovedlo spustit.</p>
        ) : (
          <div className="trh-deska-canvas" ref={containerRef} />
        )}
      </div>

      <div className="trh-poradi">
        {stav.hraci.map((h) => (
          <span key={h.id} className={`trh-poradi-hrac ${h.id === hrac?.id ? 'je-na-tahu' : ''}`}>
            <span style={{ color: POSTAVY[h.postavaId].barva }}>{POSTAVY[h.postavaId].emoji}</span> {h.jmeno} · {h.penize} Kč
          </span>
        ))}
      </div>

      <div className="trh-ovladani">
        {hrac && (
          <p className="trh-na-tahu">
            Na tahu: <strong>{hrac.jmeno}</strong>
            {jeNaTahuBot && ' (bot)'}
          </p>
        )}

        {stav.faze === 'hod' && (
          <button
            className="trh-kostka-btn"
            disabled={jeNaTahuBot}
            onClick={() => setStav((s) => krokHodu(s))}
          >
            🎲 Hodit kostkou
          </button>
        )}

        {stav.faze === 'pohyb' && (
          <>
            <p className="trh-zbyva">Zbývá kroků: {stav.zbyvaKroku}</p>
            <div className="trh-dpad">
              <button
                className="trh-dpad-btn trh-dpad-btn--nahoru"
                disabled={jeNaTahuBot}
                onClick={() => setStav((s) => krokPohybu(s, 'nahoru'))}
              >
                {NAZEV_SMERU.nahoru}
              </button>
              <button
                className="trh-dpad-btn trh-dpad-btn--vlevo"
                disabled={jeNaTahuBot}
                onClick={() => setStav((s) => krokPohybu(s, 'vlevo'))}
              >
                {NAZEV_SMERU.vlevo}
              </button>
              <button
                className="trh-dpad-btn trh-dpad-btn--vpravo"
                disabled={jeNaTahuBot}
                onClick={() => setStav((s) => krokPohybu(s, 'vpravo'))}
              >
                {NAZEV_SMERU.vpravo}
              </button>
              <button
                className="trh-dpad-btn trh-dpad-btn--dolu"
                disabled={jeNaTahuBot}
                onClick={() => setStav((s) => krokPohybu(s, 'dolu'))}
              >
                {NAZEV_SMERU.dolu}
              </button>
            </div>
            <button className="trh-ukoncit-tah-btn" disabled={jeNaTahuBot} onClick={() => setStav((s) => ukonciTah(s))}>
              Ukončit tah
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Deska
