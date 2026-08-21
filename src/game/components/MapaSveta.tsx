import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LOKACE, POPIS_TYPU } from '../lokace'
import { Postava } from '../types'
import './MapaSveta.css'

interface Props {
  postava: Postava
}

/** Cesta spojující místa na mapě — hladká křivka procházející blízko
 *  každého bodu, ne rovné úsečky. Souřadnice jsou stejný 0–100 prostor
 *  jako pozice míst, takže cesta drží u nich i po přeuspořádání na
 *  jiné šířce displeje. */
const cestaZBodu = (body: { x: number; y: number }[]): string => {
  if (body.length < 2) return ''
  let d = `M ${body[0].x} ${body[0].y}`
  for (let i = 0; i < body.length - 1; i++) {
    const p0 = body[i]
    const p1 = body[i + 1]
    const midX = (p0.x + p1.x) / 2
    const midY = (p0.y + p1.y) / 2
    d += ` Q ${p0.x} ${p0.y}, ${midX} ${midY}`
  }
  const posledni = body[body.length - 1]
  d += ` T ${posledni.x} ${posledni.y}`
  return d
}

// ==========================================
// Mapa světa. Cesta od vesnice dole až po hlavní město nahoře — appka
// se scrolluje, ne přibližuje/otáčí jako bývalé 3D město. Míst je pár
// od každého druhu (viz lokace.ts), každé zatím otevře jen list
// "brzy". Hlavní město má text navíc — je vyhrazené pro dějovou linku,
// až vznikne.
// ==========================================

export const MapaSveta: React.FC<Props> = ({ postava }) => {
  const navigate = useNavigate()
  const [otevrena, setOtevrena] = useState<string | null>(null)

  const detail = LOKACE.find((l) => l.id === otevrena) ?? null
  const cesta = cestaZBodu(LOKACE.map((l) => ({ x: l.x, y: l.y })))
  const reka = cestaZBodu(LOKACE.map((l) => ({ x: l.x + 10, y: l.y - 3 })))

  return (
    <div className="mapa-sveta">
      <div className="mapa-top-bar">
        <button className="game-back-btn" onClick={() => navigate('/hub')}>
          ← Zpět do Hubu
        </button>
        <span className="mapa-postava-znacka" style={{ '--mp-barva': postava.barva } as React.CSSProperties}>
          <span aria-hidden="true">{postava.ikona}</span> {postava.jmeno}
        </span>
      </div>

      <div className="mapa-platno">
        <div className="mapa-svet">
          <svg className="mapa-terren" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <radialGradient id="mapa-kopec" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(34, 197, 94, 0.35)" />
                <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
              </radialGradient>
              <radialGradient id="mapa-hora" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(148, 163, 184, 0.28)" />
                <stop offset="100%" stopColor="rgba(148, 163, 184, 0)" />
              </radialGradient>
            </defs>

            {/* Kopce a hory — jen měkké skvrny, ať pozadí není prázdné */}
            <ellipse cx="12" cy="85" rx="16" ry="9" fill="url(#mapa-kopec)" />
            <ellipse cx="88" cy="72" rx="14" ry="8" fill="url(#mapa-hora)" />
            <ellipse cx="10" cy="55" rx="15" ry="8" fill="url(#mapa-hora)" />
            <ellipse cx="85" cy="40" rx="16" ry="9" fill="url(#mapa-kopec)" />
            <ellipse cx="15" cy="26" rx="14" ry="8" fill="url(#mapa-kopec)" />
            <ellipse cx="80" cy="12" rx="18" ry="10" fill="url(#mapa-hora)" />

            {/* Řeka podél cesty — vodní stopa vedle míst, ne skrz ně */}
            <path d={reka} fill="none" stroke="#35c4f0" strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" />

            {/* Cesta spojující jednotlivá místa */}
            <path
              d={cesta}
              fill="none"
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth="0.6"
              strokeDasharray="1.4 1.4"
              strokeLinecap="round"
            />
          </svg>

          {LOKACE.map((l) => (
            <button
              key={l.id}
              className={`mapa-pin mapa-pin--${l.typ}`}
              style={{ left: `${l.x}%`, top: `${l.y}%`, '--mp-barva': l.barva } as React.CSSProperties}
              onClick={() => setOtevrena(l.id)}
            >
              <span className="mapa-pin-ikona" aria-hidden="true">{l.ikona}</span>
              <span className="mapa-pin-nazev">{l.nazev}</span>
            </button>
          ))}
        </div>
      </div>

      {detail && (
        <>
          <div className="mapa-sheet-overlay" onClick={() => setOtevrena(null)} />
          <div className="mapa-sheet" style={{ borderColor: detail.barva }}>
            <span className="mapa-sheet-ikona" aria-hidden="true">{detail.ikona}</span>
            <span className="mapa-sheet-typ" style={{ color: detail.barva }}>
              {POPIS_TYPU[detail.typ]}
            </span>
            <h2 className="mapa-sheet-nazev">{detail.nazev}</h2>
            <p className="mapa-sheet-text">
              {detail.typ === 'hlavni-mesto'
                ? 'Hlavní město je vyhrazené pro dějovou linku hry — ta zatím nevznikla, přijde v některém z dalších kroků.'
                : 'Tohle místo zatím nikam nevede — je připravené a obsah do něj teprve přibude.'}
            </p>
            <button className="mapa-sheet-close" onClick={() => setOtevrena(null)}>
              Zavřít
            </button>
          </div>
        </>
      )}
    </div>
  )
}
