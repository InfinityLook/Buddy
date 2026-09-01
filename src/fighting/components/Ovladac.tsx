import React, { useEffect, useRef, useState } from 'react'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { pripojSeJakoOvladac } from '../network'
import type { PostavaId } from '../combat/postavy'
import type { PripojenoPayload, Smer, Tlacitko } from '../types'
import { VyberPostavy } from './VyberPostavy'
import '../FightingModule.css'

interface Props {
  onZpet: () => void
}

const vygenerujHracId = () => `hrac-${Math.random().toString(36).slice(2, 10)}`

const SIPKA: Record<Smer, string> = { nahoru: '▲', dolu: '▼', vlevo: '◀', vpravo: '▶' }
const IKONA_TLACITKA: Record<Tlacitko, string> = { udar: '👊', kop: '🦵', blok: '🛡️', specialni: '✨' }
const PORADI_SMERU: Smer[] = ['nahoru', 'vlevo', 'vpravo', 'dolu']
const PORADI_TLACITEK: Tlacitko[] = ['udar', 'kop', 'blok', 'specialni']

type StavSpojeni = 'zadavani' | 'vyberPostavy' | 'pripojovani' | 'pripojeno'

// ==========================================
// Telefon strana — zadání kódu místnosti, pak (Fáze 3, lokálně, bez
// sítě) výběr postavy, pak teprve skutečné síťové připojení, a nakonec
// d-pad + čtyři akční tlačítka. Výběr postavy je schválně zařazený
// PŘED "pripojovani" — viz VyberPostavy.tsx a types.ts's
// PripojitPayload — takže se pošle rovnou s prvním broadcastem, žádný
// druhý krok navíc na síti. Vstupy tlačítek se posílají na
// pointerdown/pointerup, ne na klik — hra potřebuje vědět, jak dlouho
// je tlačítko drženo, ne jen že bylo stisknuto.
// ==========================================

export const Ovladac: React.FC<Props> = ({ onZpet }) => {
  const { profile } = useProfileData()
  const [kodVstup, setKodVstup] = useState('')
  const [kod, setKod] = useState<string | null>(null)
  const [postavaId, setPostavaId] = useState<PostavaId | null>(null)
  const [slot, setSlot] = useState<1 | 2 | null>(null)
  const [stavSpojeni, setStavSpojeni] = useState<StavSpojeni>('zadavani')
  const hracIdRef = useRef(vygenerujHracId())
  const spravaRef = useRef<ReturnType<typeof pripojSeJakoOvladac> | null>(null)

  useEffect(() => {
    if (stavSpojeni !== 'pripojovani' || !kod || !postavaId) return

    const sprava = pripojSeJakoOvladac(kod, hracIdRef.current, profile.name || 'Hráč', postavaId, {
      pripojeno: (p: PripojenoPayload) => {
        setSlot(p.slot)
        setStavSpojeni('pripojeno')
      },
    })
    spravaRef.current = sprava
    return () => sprava.zrusit()
    // profile.name se čte jen v okamžiku připojení, ne živě po celou dobu hry —
    // proto v poli závislostí schválně chybí.
  }, [stavSpojeni, kod, postavaId])

  const posliSmer = (smer: Smer | null) => {
    spravaRef.current?.poslatVstup({ hracId: hracIdRef.current, typ: 'smer', smer })
  }

  const posliTlacitko = (tlacitko: Tlacitko, stisknuto: boolean) => {
    spravaRef.current?.poslatVstup({ hracId: hracIdRef.current, typ: 'tlacitko', tlacitko, stisknuto })
  }

  if (stavSpojeni === 'zadavani') {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={onZpet}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Připojit se</h1>
        </header>

        <form
          className="souboj-kod-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (kodVstup.trim().length < 4) return
            setKod(kodVstup.trim().toUpperCase())
            setStavSpojeni('vyberPostavy')
          }}
        >
          <label className="souboj-kod-label">
            Kód místnosti z TV
            <input
              className="souboj-kod-input"
              value={kodVstup}
              onChange={(e) => setKodVstup(e.target.value.toUpperCase())}
              maxLength={4}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="např. K7QZ"
            />
          </label>
          <button className="souboj-kod-submit" type="submit" disabled={kodVstup.trim().length < 4}>
            Pokračovat
          </button>
        </form>
      </div>
    )
  }

  if (stavSpojeni === 'vyberPostavy') {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={() => setStavSpojeni('zadavani')}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Připojit se</h1>
        </header>

        <VyberPostavy
          onVybrano={(id) => {
            setPostavaId(id)
            setStavSpojeni('pripojovani')
          }}
        />
      </div>
    )
  }

  if (stavSpojeni === 'pripojovani') {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={onZpet}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Připojit se</h1>
        </header>
        <p className="souboj-sub">Připojuji…</p>
      </div>
    )
  }

  return (
    <div className="souboj-ovladac">
      <span className={`souboj-ovladac-stav souboj-ovladac-stav--${slot}`}>Jsi Hráč {slot}</span>

      <div className="souboj-ovladac-spodek">
        <div className="souboj-dpad">
          {PORADI_SMERU.map((smer) => (
            <button
              key={smer}
              type="button"
              className={`souboj-dpad-smer souboj-dpad-smer--${smer}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                posliSmer(smer)
              }}
              onPointerUp={() => posliSmer(null)}
              onPointerCancel={() => posliSmer(null)}
            >
              {SIPKA[smer]}
            </button>
          ))}
        </div>

        <div className="souboj-tlacitka">
          {PORADI_TLACITEK.map((tlacitko) => (
            <button
              key={tlacitko}
              type="button"
              className={`souboj-akcni-tlacitko souboj-akcni-tlacitko--${tlacitko}`}
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
  )
}
