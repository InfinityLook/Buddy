import React from 'react'
import { Postava } from '../types'
import './PostavaKarta.css'

interface Props {
  postava: Postava
  vybrana: boolean
  onClick: () => void
  /** Když je zadané, karta dostane tlačítko smazání navíc. */
  onSmazat?: () => void
  /** Úroveň postavy — zobrazí se jako odznak přes roh portrétu (viz
   *  leveling.ts). Nezadané na obrazovce tvorby, kde postava ještě
   *  neexistuje. */
  uroven?: number
}

// ==========================================
// Sdílená karta postavy — používá ji jak tvorba nové postavy
// (TvorbaPostavy), tak výběr, za koho tuhle hru hrát (VyberPostavy).
// Obě obrazovky ji řadí do vodorovného karuselu (viz jejich vlastní
// CSS), tahle karta jen definuje, jak vypadá JEDNA položka v něm.
//
// Portrét (postava.portret) je oříznutá karta přímo z referenčního
// obrázku hrdinů — jméno, titul, živel i role jsou v ní zapečené
// jako ilustrace, takže se tu nezdvojují jako text. Co v obrázku
// není — herní bonusy, případná nevýhoda, odznak úrovně — jde přes
// něj nebo pod něj jako skutečný UI text.
//
// Tlačítko smazání je schválně SOUROZENEC vybíratelného tlačítka, ne
// vnořené uvnitř něj — vnořené tlačítko v tlačítku je neplatné HTML
// a láme se s ním čtečky obrazovky i klávesnicová navigace.
// ==========================================

export const PostavaKarta: React.FC<Props> = ({ postava, vybrana, onClick, onSmazat, uroven }) => {
  return (
    <div className="postava-karta-wrap">
      <button
        className={`postava-karta ${vybrana ? 'is-vybrana' : ''}`}
        style={{ '--tp-barva': postava.barva } as React.CSSProperties}
        onClick={onClick}
      >
        <span className="postava-karta-portret-wrap">
          <img
            className="postava-karta-portret"
            src={postava.portret}
            alt={`${postava.jmeno} — ${postava.popis}`}
            draggable={false}
          />
          <span className="postava-karta-odznak" aria-hidden="true">
            {postava.ikona}
          </span>
          {uroven !== undefined && <span className="postava-karta-uroven">Lv {uroven}</span>}
          {vybrana && (
            <span className="postava-znacka" aria-hidden="true">
              ✓
            </span>
          )}
        </span>

        <span className="postava-bonusy">
          {postava.bonusy.map((b) => (
            <span key={b} className="postava-bonus">
              <span className="postava-bonus-znak" aria-hidden="true">✓</span>
              {b}
            </span>
          ))}
          {postava.nevyhoda && (
            <span className="postava-nevyhoda">
              <span aria-hidden="true">⚠️</span>
              {postava.nevyhoda}
            </span>
          )}
        </span>
      </button>

      {onSmazat && (
        <button className="postava-karta-smazat" aria-label={`Smazat postavu ${postava.jmeno}`} onClick={onSmazat}>
          🗑️
        </button>
      )}
    </div>
  )
}
