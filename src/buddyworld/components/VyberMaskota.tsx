import React from 'react'
import { MASKOTI } from '../data/maskoti'
import { obrazekKonceptu } from '../data/koncept'

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
//
// Každá karta appku zkusí vykreslit reálnou 2D koncept-ilustraci z
// appčina BuddyWorld_ArtPack.zip (data/koncept.ts's obrazekKonceptu) —
// appka pro žádný dnešní maskot nemá hotový .glb model (viz
// data/assets.ts), tahle ilustrace je appčina dočasná, appkou
// nahraditelná vizuální identita, ne appčin finální 3D vzhled. Appka
// se vždycky umí vrátit k appčině dřívější emoji ikoně, kterou appka
// drží jako svůj fallback, nesmazala ji — pro případ, že appka
// obrázek nenajde (appčin budoucí pátý maskot bez vlastní koncept-art
// by jinak zůstal úplně bez ikony).
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
          const ilustrace = obrazekKonceptu(`maskot.${maskot.id}`)

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
              {ilustrace ? (
                <img src={ilustrace} alt="" className="bw-maskot-ilustrace" />
              ) : (
                <span className="bw-maskot-ikona-velka">{maskot.ikona}</span>
              )}
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
