import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LOKACE, POPIS_TYPU } from '../lokace'
import { NEPRATELE_PODLE_LOKACE } from '../combat/nepratele'
import { Postava } from '../types'
import './MapaSveta.css'

interface Props {
  postava: Postava
  /** Volá se po potvrzení vstupu do boje na místě, které ho nabízí (zatím jen aréna). */
  onVstoupitDoBoje: (lokaceId: string) => void
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

/** Barevné mlhoviny v pozadí — vzaté z barvy nejbližší lokace, takže
 *  krajina opticky ladí s tím, co v ní stojí, místo náhodné zeleně. */
const OBLASTI: { cx: number; cy: number; rx: number; ry: number; barva: string }[] = [
  { cx: 12, cy: 85, rx: 18, ry: 10, barva: '#f59e0b' },
  { cx: 88, cy: 72, rx: 15, ry: 9, barva: '#7c3aed' },
  { cx: 10, cy: 55, rx: 16, ry: 9, barva: '#35c4f0' },
  { cx: 85, cy: 40, rx: 17, ry: 10, barva: '#ef4444' },
  { cx: 15, cy: 26, rx: 15, ry: 9, barva: '#22c55e' },
  { cx: 80, cy: 12, rx: 19, ry: 11, barva: '#35c4f0' },
]

// ==========================================
// Mapa světa. Cesta od vesnice dole až po hlavní město nahoře — appka
// se scrolluje, ne přibližuje/otáčí jako bývalé 3D město. Míst je pár
// od každého druhu (viz lokace.ts), každé zatím otevře jen list
// "brzy". Hlavní město má text navíc — je vyhrazené pro dějovou linku,
// až vznikne.
//
// Vzhled cílí na "profesionální herní mapu": mlhoviny + konturové
// prstence (topografická mapa), jemná mřížka, zlato-fialovo-modrá
// stezka s tekoucím leskem, piny ve tvaru klasické kapky s leskem a
// stínem na zemi, a dekorativní kompas jako HUD prvek.
// ==========================================

export const MapaSveta: React.FC<Props> = ({ postava, onVstoupitDoBoje }) => {
  const navigate = useNavigate()
  const [otevrena, setOtevrena] = useState<string | null>(null)

  const detail = LOKACE.find((l) => l.id === otevrena) ?? null
  const nepritel = detail ? NEPRATELE_PODLE_LOKACE[detail.id] : undefined
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

      {/* Dekorativní kompas — čistě orientační HUD prvek, nic neovládá. */}
      <svg className="mapa-kompas" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="17" fill="rgba(10,8,20,0.55)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <path d="M20 5 L23 20 L20 35 L17 20 Z" fill="rgba(251,191,36,0.85)" />
        <circle cx="20" cy="20" r="2.2" fill="#0c0a16" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
        <text x="20" y="10.5" textAnchor="middle" fontSize="5" fill="rgba(255,255,255,0.7)" fontWeight="800">
          S
        </text>
      </svg>

      <div className="mapa-platno">
        <div className="mapa-svet">
          <svg className="mapa-terren" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              {OBLASTI.map((o, i) => (
                <radialGradient key={i} id={`mapa-oblast-${i}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={o.barva} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={o.barva} stopOpacity="0" />
                </radialGradient>
              ))}
              <linearGradient id="mapa-cesta-barva" x1="0" y1="100%" x2="0" y2="0%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#35c4f0" />
              </linearGradient>
              <pattern id="mapa-mrizka" width="6" height="6" patternUnits="userSpaceOnUse">
                <path d="M 6 0 L 0 0 0 6" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.25" />
              </pattern>
              <filter id="mapa-zar" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="0.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Jemná mřížka přes celou plochu — kartografický, ne herní pocit */}
            <rect x="0" y="0" width="100" height="100" fill="url(#mapa-mrizka)" />

            {/* Barevné mlhoviny + konturové prstence okolo nich (topografická mapa) */}
            {OBLASTI.map((o, i) => (
              <ellipse key={`glow-${i}`} cx={o.cx} cy={o.cy} rx={o.rx} ry={o.ry} fill={`url(#mapa-oblast-${i})`} />
            ))}
            {OBLASTI.map((o, i) => (
              <ellipse
                key={`k1-${i}`}
                cx={o.cx}
                cy={o.cy}
                rx={o.rx * 1.35}
                ry={o.ry * 1.35}
                fill="none"
                stroke={o.barva}
                strokeOpacity="0.14"
                strokeWidth="0.22"
              />
            ))}
            {OBLASTI.map((o, i) => (
              <ellipse
                key={`k2-${i}`}
                cx={o.cx}
                cy={o.cy}
                rx={o.rx * 1.7}
                ry={o.ry * 1.7}
                fill="none"
                stroke={o.barva}
                strokeOpacity="0.07"
                strokeWidth="0.18"
              />
            ))}

            {/* Řeka podél cesty — vodní stopa vedle míst, ne skrz ně */}
            <path d={reka} fill="none" stroke="#35c4f0" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="round" />

            {/* Cesta spojující jednotlivá místa — tekoucí zlato-fialovo-modrý lesk */}
            <path
              className="mapa-cesta"
              d={cesta}
              fill="none"
              stroke="url(#mapa-cesta-barva)"
              strokeOpacity="0.8"
              strokeWidth="0.55"
              strokeDasharray="1.6 1.4"
              strokeLinecap="round"
              filter="url(#mapa-zar)"
            />
          </svg>

          {/* Vinětace — okraje mapy jemně ztmavené, ať plátno nepůsobí jako plochý výřez */}
          <div className="mapa-vinetace" aria-hidden="true" />

          {LOKACE.map((l) => (
            <button
              key={l.id}
              className={`mapa-pin mapa-pin--${l.typ}`}
              style={{ left: `${l.x}%`, top: `${l.y}%`, '--mp-barva': l.barva } as React.CSSProperties}
              onClick={() => setOtevrena(l.id)}
            >
              <span className="mapa-pin-znacka">
                <span className="mapa-pin-ikona" aria-hidden="true">
                  {l.ikona}
                </span>
              </span>
              <span className="mapa-pin-stin" aria-hidden="true" />
              <span className="mapa-pin-nazev">{l.nazev}</span>
            </button>
          ))}
        </div>
      </div>

      {detail && (
        <>
          <div className="mapa-sheet-overlay" onClick={() => setOtevrena(null)} />
          <div className="mapa-sheet" style={{ borderColor: detail.barva }}>
            <span className="mapa-sheet-znak" style={{ '--mp-barva': detail.barva } as React.CSSProperties}>
              <span className="mapa-sheet-ikona" aria-hidden="true">
                {detail.ikona}
              </span>
            </span>
            <span className="mapa-sheet-typ" style={{ color: detail.barva }}>
              {POPIS_TYPU[detail.typ]}
            </span>
            <h2 className="mapa-sheet-nazev">{detail.nazev}</h2>
            <p className="mapa-sheet-text">
              {nepritel
                ? `${nepritel.jmeno} tě čeká v kruhu — troufneš si na souboj?`
                : detail.typ === 'hlavni-mesto'
                  ? 'Hlavní město je vyhrazené pro dějovou linku hry — ta zatím nevznikla, přijde v některém z dalších kroků.'
                  : 'Tohle místo zatím nikam nevede — je připravené a obsah do něj teprve přibude.'}
            </p>
            {nepritel && (
              <button
                className="mapa-sheet-boj"
                onClick={() => {
                  onVstoupitDoBoje(detail.id)
                  setOtevrena(null)
                }}
              >
                ⚔️ Vstoupit do boje
              </button>
            )}
            <button className="mapa-sheet-close" onClick={() => setOtevrena(null)}>
              Zavřít
            </button>
          </div>
        </>
      )}
    </div>
  )
}
