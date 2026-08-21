import React from 'react'
import { useGameCharacter } from '../useGameCharacter'
import { Postava } from '../types'
import {
  Dovednost,
  MAX_DOVEDNOST_RANK,
  MAX_UROVEN,
  POPIS_DOVEDNOSTI,
  vychoziProgres,
  xpProDalsiUroven,
} from '../leveling'
import './Dovednosti.css'

interface Props {
  postava: Postava
  onOdejit: () => void
}

const DOVEDNOSTI: Dovednost[] = ['vydrz', 'sila', 'presnost']

// ==========================================
// Postup a strom dovedností jedné postavy — otevírá se klepnutím na
// značku postavy v horní liště mapy. Úroveň a dovednosti tady čtou
// přímo z useGameCharacter (progres), stejná data, která useSouboj.ts
// promítá do bojových čísel.
// ==========================================

export const Dovednosti: React.FC<Props> = ({ postava, onOdejit }) => {
  const progres = useGameCharacter((s) => s.progres[postava.id]) ?? vychoziProgres()
  const vylepsitDovednost = useGameCharacter((s) => s.vylepsitDovednost)

  const naMaximu = progres.uroven >= MAX_UROVEN
  const potrebaXp = naMaximu ? 0 : xpProDalsiUroven(progres.uroven)
  const postupProcenta = naMaximu ? 100 : Math.min(100, (progres.xp / potrebaXp) * 100)

  return (
    <div className="dovednosti" style={{ '--tp-barva': postava.barva } as React.CSSProperties}>
      <div className="dv-top-bar">
        <button className="game-back-btn" onClick={onOdejit}>
          ← Zpět na mapu
        </button>
      </div>

      <div className="dv-hlavicka">
        <span className="dv-ikona" aria-hidden="true">
          {postava.ikona}
        </span>
        <div className="dv-hlavicka-text">
          <span className="dv-jmeno">{postava.jmeno}</span>
          <span className="dv-uroven">{naMaximu ? 'Maximální úroveň' : `Úroveň ${progres.uroven}`}</span>
        </div>
      </div>

      <div className="dv-postup">
        <div className="dv-postup-track">
          <div className="dv-postup-vypln" style={{ width: `${postupProcenta}%` }} />
        </div>
        <span className="dv-postup-cislo">
          {naMaximu ? `Úroveň ${MAX_UROVEN} — vše otevřeno` : `${progres.xp} / ${potrebaXp} XP do další úrovně`}
        </span>
      </div>

      <div className="dv-body">
        {progres.dovednostniBody > 0
          ? `Máš ${progres.dovednostniBody} ${progres.dovednostniBody === 1 ? 'nevyužitý bod' : 'nevyužité body'} k rozdání.`
          : 'Žádné nevyužité dovednostní body — vyhraj další souboj pro postup.'}
      </div>

      <div className="dv-strom">
        {DOVEDNOSTI.map((dovednost) => {
          const popis = POPIS_DOVEDNOSTI[dovednost]
          const stupen = progres.dovednosti[dovednost]
          const naMaxStupni = stupen >= MAX_DOVEDNOST_RANK
          return (
            <div key={dovednost} className="dv-uzel">
              <span className="dv-uzel-ikona" aria-hidden="true">
                {popis.ikona}
              </span>
              <div className="dv-uzel-text">
                <span className="dv-uzel-jmeno">{popis.nazev}</span>
                <span className="dv-uzel-efekt">{popis.efektNaStupen} za stupeň</span>
                <div className="dv-uzel-tecky">
                  {Array.from({ length: MAX_DOVEDNOST_RANK }, (_, i) => (
                    <span key={i} className={`dv-tecka ${i < stupen ? 'dv-tecka--aktivni' : ''}`} />
                  ))}
                </div>
              </div>
              <button
                className="dv-vylepsit"
                disabled={naMaxStupni || progres.dovednostniBody <= 0}
                onClick={() => vylepsitDovednost(postava.id, dovednost)}
              >
                {naMaxStupni ? 'Max' : '+ Vylepšit'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
