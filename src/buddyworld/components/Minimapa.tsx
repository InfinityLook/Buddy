import React from 'react'
import { OBLASTI_SVETA } from '../data/oblasti'
import type { Pozice2D } from '../types'
import { cilNavigace, navigacniUdaje } from '../data/navigace'

const ROZSAH = 38
const STRED = 100
const MERITKO = 94 / ROZSAH
const sx = (x: number) => STRED + x * MERITKO
const sy = (z: number) => STRED + z * MERITKO

interface Props {
  pozice: Pozice2D
  objevene: readonly string[]
  navigaceId?: string | null
}

/** Lehká SVG minimapa bez dalšího Three.js rendereru; sever = záporné Z. */
export const Minimapa: React.FC<Props> = ({ pozice, objevene, navigaceId }) => (
  <div className="bw-minimapa" aria-label="Minimapa světa">
    <svg viewBox="0 0 200 200" role="img" aria-label={`Hráč: X ${pozice.x.toFixed(1)}, Z ${pozice.z.toFixed(1)}`}>
      <circle cx="100" cy="100" r="96" fill="#182e29" stroke="#cfba7b" strokeWidth="2" />
      <path d="M100 6V194M6 100H194" stroke="#759081" strokeWidth=".7" strokeDasharray="3 5" />
      {OBLASTI_SVETA.map((oblast) => {
        const viditelna = objevene.includes(oblast.id)
        return <g key={oblast.id}>
          <circle cx={sx(oblast.stred.x)} cy={sy(oblast.stred.z)} r={oblast.polomer * MERITKO}
            fill={viditelna ? oblast.barva : '#35433e'} fillOpacity={viditelna ? .35 : .12}
            stroke={viditelna ? oblast.barva : '#61716a'} strokeWidth="1.2" strokeDasharray={viditelna ? undefined : '2 3'} />
          {viditelna && <text x={sx(oblast.stred.x)} y={sy(oblast.stred.z) + 4}
            fill="#fff7df" fontSize="12" textAnchor="middle">{oblast.symbol}</text>}
        </g>
      })}
      {(() => {
        const cil = cilNavigace(navigaceId ?? null)
        if (!cil) return null
        const udaje = navigacniUdaje(pozice, cil.stred)
        return <g aria-label={`Navigace: ${cil.nazev}, ${Math.round(udaje.vzdalenost)} metrů`}>
          <line x1={sx(pozice.x)} y1={sy(pozice.z)} x2={sx(cil.stred.x)} y2={sy(cil.stred.z)}
            stroke="#ffe49b" strokeWidth="1.8" strokeDasharray="4 3" />
          <circle cx={sx(cil.stred.x)} cy={sy(cil.stred.z)} r="7" fill="none" stroke="#ffe49b" strokeWidth="2" />
        </g>
      })()}
      <circle cx={sx(pozice.x)} cy={sy(pozice.z)} r="5.5" fill="#fff4b0" stroke="#23332e" strokeWidth="2" />
      <text x="100" y="14" fill="#f8ebc5" fontSize="10" textAnchor="middle">S</text>
    </svg>
    <span>🧭 MAPA</span>
  </div>
)
