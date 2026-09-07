import React, { useState } from 'react'
import type { ArenaId } from '../arena/areny'

interface Props {
  arenaId?: ArenaId
}

/** Jedenácté kolo vylepšení — atmosféra podle arény, čistě CSS
 *  částice, žádný Three.js navíc (appka to schválně nedala do 3D
 *  scény samotné — jeden absolutně umístěný overlay nad ní stojí
 *  míň a funguje stejně dobře pro 2D i 3D variantu najednou, viz
 *  Bojiste.tsx, kde se to renderuje). Louka dostává poletující
 *  světlušky (klidná scéna, jemná dekorace), kaňon (pousty) prach
 *  místo doslova nesmyslného deště v poušti, noční aréna
 *  žhnoucí popel/mlhu. Deterministický seznam částic vygenerovaný
 *  JEDNOU přes lazy useState inicializér — stejný trik jako
 *  Konfety.tsx, žádné Math.random() volané znovu na každý render. */

interface Castice {
  left: number
  delay: number
  trvani: number
  velikost: number
}

const vytvorCastice = (pocet: number): Castice[] =>
  Array.from({ length: pocet }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 6,
    trvani: 4 + Math.random() * 5,
    velikost: 0.5 + Math.random() * 1,
  }))

export const Pocasi: React.FC<Props> = ({ arenaId }) => {
  const [svetlusky] = useState(() => vytvorCastice(10))
  const [prach] = useState(() => vytvorCastice(14))
  const [popel] = useState(() => vytvorCastice(12))

  if (arenaId === 'louka') {
    return (
      <div className="souboj-pocasi souboj-pocasi--svetlusky" aria-hidden="true">
        {svetlusky.map((c, i) => (
          <span
            key={i}
            className="souboj-castice souboj-castice--svetluska"
            style={{
              left: `${c.left}%`,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.trvani}s`,
              transform: `scale(${c.velikost})`,
            }}
          />
        ))}
      </div>
    )
  }

  if (arenaId === 'pousty') {
    return (
      <div className="souboj-pocasi souboj-pocasi--prach" aria-hidden="true">
        {prach.map((c, i) => (
          <span
            key={i}
            className="souboj-castice souboj-castice--prach"
            style={{
              left: `${c.left}%`,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.trvani}s`,
              transform: `scale(${c.velikost})`,
            }}
          />
        ))}
      </div>
    )
  }

  if (arenaId === 'noc') {
    return (
      <div className="souboj-pocasi souboj-pocasi--popel" aria-hidden="true">
        {popel.map((c, i) => (
          <span
            key={i}
            className="souboj-castice souboj-castice--popel"
            style={{
              left: `${c.left}%`,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.trvani}s`,
              transform: `scale(${c.velikost})`,
            }}
          />
        ))}
      </div>
    )
  }

  return null
}
