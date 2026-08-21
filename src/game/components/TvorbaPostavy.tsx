import React, { useState } from 'react'
import { Postava, PostavaId } from '../types'
import { PostavaKarta } from './PostavaKarta'
import './TvorbaPostavy.css'

interface Props {
  /** Postavy k výběru — všech pět napoprvé, jen ty ještě nevytvořené
   *  při přidávání další do rozehrané party. */
  dostupnePostavy: Postava[]
  nadpis: string
  podnadpis: string
  zpetText: string
  onZpet: () => void
  onVytvoreno: (id: PostavaId) => void
}

// ==========================================
// Vytvoření nové postavy — použije se jak napoprvé (prázdná party),
// tak při přidávání další postavy k těm už rozehraným (viz
// GameModule.tsx, které rozhoduje, které postavy nabídnout a kam
// vede tlačítko zpět).
//
// Výběr je dvoukrokový schválně: klepnutí na kartu jen zvýrazní,
// teprve tlačítko dole ji potvrdí. Bez toho by nepozorné klepnutí
// rovnou založilo postavu bez šance si to rozmyslet.
// ==========================================

export const TvorbaPostavy: React.FC<Props> = ({
  dostupnePostavy,
  nadpis,
  podnadpis,
  zpetText,
  onZpet,
  onVytvoreno,
}) => {
  const [vybrana, setVybrana] = useState<PostavaId | null>(null)

  const detail = dostupnePostavy.find((p) => p.id === vybrana) ?? null

  return (
    <div className="tvorba-postavy">
      <div className="tp-top-bar">
        <button className="game-back-btn" onClick={onZpet}>
          ← {zpetText}
        </button>
        <h1 className="tp-title">{nadpis}</h1>
        <p className="tp-hint">{podnadpis}</p>
      </div>

      {dostupnePostavy.length === 0 ? (
        <p className="tp-prazdno">Všechny postavy už máš vytvořené — smaž nějakou, chceš-li zkusit jinou.</p>
      ) : (
        <div className="tp-mrizka">
          {dostupnePostavy.map((p) => (
            <PostavaKarta key={p.id} postava={p} vybrana={vybrana === p.id} onClick={() => setVybrana(p.id)} />
          ))}
        </div>
      )}

      <div className="tp-akce">
        <button
          className={`tp-pokracovat ${detail ? 'tp-pokracovat--zvolena' : ''}`}
          style={detail ? ({ '--tp-barva': detail.barva } as React.CSSProperties) : undefined}
          disabled={!detail}
          onClick={() => detail && onVytvoreno(detail.id)}
        >
          {detail ? `Vytvořit postavu ${detail.jmeno}` : 'Vyber postavu'}
        </button>
      </div>
    </div>
  )
}
