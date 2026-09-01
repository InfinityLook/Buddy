import React from 'react'
import { ARENA_SIRKA } from '../combat/engine'
import { POSTAVY } from '../combat/postavy'
import { hpProcenta, manaProcenta, poziceProcenta, vizualniStavBojovnika } from '../combat/loop'
import type { SoubojStav } from '../combat/types'

interface Props {
  stav: SoubojStav
  jmena: [string, string]
}

// ==========================================
// Fáze 3 — čistě prezentační komponenta: dostane hotový SoubojStav a
// jména obou hráčů jako props, nic sama nepočítá (veškerá matematika
// je v combat/loop.ts) a nesahá na requestAnimationFrame ani na síť —
// to dělá výhradně TvHost.tsx. Stejná hranice "engine neví, odkud
// vstup přišel" (viz engine.ts) platí i tady na vykreslovací straně:
// Bojiste neví, odkud SoubojStav přišel, ani jak se aktualizuje.
// ==========================================

export const Bojiste: React.FC<Props> = ({ stav, jmena }) => {
  return (
    <div className="souboj-bojiste">
      <div className="souboj-bojiste-hlavicky">
        {([0, 1] as const).map((i) => {
          const b = stav.hraci[i]
          const postava = POSTAVY[b.postavaId]
          return (
            <div key={i} className={`souboj-bojovnik-hlavicka souboj-bojovnik-hlavicka--${i + 1}`}>
              <span className="souboj-bojovnik-jmeno">
                {postava.ikona} {jmena[i]}
              </span>
              <div className="souboj-hp-bar">
                <div className="souboj-hp-bar-vypln" style={{ width: `${hpProcenta(b)}%` }} />
              </div>
              <div className="souboj-mana-bar">
                <div className="souboj-mana-bar-vypln" style={{ width: `${manaProcenta(b)}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="souboj-arena">
        {([0, 1] as const).map((i) => {
          const b = stav.hraci[i]
          const postava = POSTAVY[b.postavaId]
          const vizualniStav = vizualniStavBojovnika(b)
          return (
            <div
              key={i}
              className={`souboj-bojovnik souboj-bojovnik--${i + 1} souboj-bojovnik--${vizualniStav}`}
              style={{ left: `${poziceProcenta(b, ARENA_SIRKA)}%` }}
            >
              <span className="souboj-bojovnik-ikona" aria-hidden="true">
                {postava.ikona}
              </span>
            </div>
          )
        })}
      </div>

      {stav.stavKola === 'konec' && (
        <div className="souboj-konec-kola">
          <span className="souboj-konec-text">{stav.vitez === null ? 'Remíza!' : `${jmena[stav.vitez]} vyhrává!`}</span>
        </div>
      )}
    </div>
  )
}
