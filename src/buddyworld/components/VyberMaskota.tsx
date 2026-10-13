import React from 'react'
import { MASKOTI } from '../data/maskoti'

// ==========================================
// Výběr aktivního maskota — zobrazuje všechny čtyři elementální
// společníky (EMBER/MOSS/NYX/FROST), i když dnes doopravdy odemčený
// a hratelný je jen EMBER. Zbylé tři appka ukazuje jako viditelné,
// ale zamčené — appka je "vidí, nepoužije", ne appka je skryje,
// stejná zásada jako jinde v kódu (VIP šablony, locked achievementy).
//
// Tahle obrazovka appku žádá vybrat jen mezi odemčenými maskoty —
// appka klik na zamčenou kartu tiše ignoruje, appka nic nenabízí
// předstírat, co ještě neumí.
// ==========================================

interface Props {
  aktivniMaskotId: string
  odemceneMaskoty: string[]
  onVybrat: (id: string) => void
  onPokracovat: () => void
  onZpet: () => void
}

export const VyberMaskota: React.FC<Props> = ({ aktivniMaskotId, odemceneMaskoty, onVybrat, onPokracovat, onZpet }) => {
  return (
    <div className="bw-vyber">
      <div className="bw-vyber-hlavicka">
        <button type="button" className="bw-vyber-zpet" onClick={onZpet} aria-label="Zpět do Hubu">
          ←
        </button>
        <div className="bw-vyber-titul">
          <h1>Buddy World</h1>
          <p>Vyber si svého společníka</p>
        </div>
      </div>

      <div className="bw-vyber-mrizka">
        {MASKOTI.map((maskot) => {
          const odemceny = odemceneMaskoty.includes(maskot.id)
          const aktivni = maskot.id === aktivniMaskotId

          return (
            <button
              key={maskot.id}
              type="button"
              className={`bw-maskot-karta${aktivni ? ' bw-maskot-karta--aktivni' : ''}${
                odemceny ? '' : ' bw-maskot-karta--zamceno'
              }`}
              style={{ '--maskot-barva': maskot.barvaJadro } as React.CSSProperties}
              onClick={() => odemceny && onVybrat(maskot.id)}
              disabled={!odemceny}
            >
              {aktivni && (
                <span className="bw-maskot-znacka bw-maskot-znacka--aktivni" aria-hidden="true">
                  ✓
                </span>
              )}
              {!odemceny && (
                <span className="bw-maskot-znacka" aria-hidden="true">
                  🔒
                </span>
              )}
              <span className="bw-maskot-ikona-velka">{maskot.ikona}</span>
              <span className="bw-maskot-jmeno">{maskot.jmeno}</span>
              <span className="bw-maskot-element">{maskot.element}</span>
              <span className="bw-maskot-popis">{odemceny ? maskot.popis : 'Zatím zamčeno'}</span>
            </button>
          )
        })}
      </div>

      <div className="bw-vyber-spodek">
        <button type="button" className="bw-vyber-pokracovat" onClick={onPokracovat}>
          ▶ Pokračovat
        </button>
      </div>
    </div>
  )
}
