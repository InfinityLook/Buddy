import React, { useState } from 'react'

const BARVY = ['#f97316', '#facc15', '#22d3ee', '#d946ef', '#4ade80']
const POCET_KUSU = 26

interface Kus {
  left: number
  zpozdeniS: number
  trvaniS: number
  barva: string
  rotace: number
}

// ==========================================
// Desáté kolo vylepšení — konfety na obrazovce vítěze (Bojiste.tsx's
// `souboj-konec-kola`, jen na skutečného vítěze, ne na remízu — viz
// volající). Čisté CSS padání, žádné canvas/knihovna — appka tu
// nepotřebuje nic přesného ani interaktivní, jen krátkou oslavnou
// "šťávu" nad tlačítkem Nový zápas. Pozice/barva/zpoždění každého
// kusu se losuje JEDNOU při mountu (useState's lazy initializer), ne
// znovu na každém renderu — appka nechce, aby konfety "poskakovaly" na
// nové náhodné pozici při každém re-renderu rodiče.
// ==========================================

export const Konfety: React.FC = () => {
  const [kusy] = useState<Kus[]>(() =>
    Array.from({ length: POCET_KUSU }, () => ({
      left: Math.random() * 100,
      zpozdeniS: Math.random() * 0.4,
      trvaniS: 1.1 + Math.random() * 0.7,
      barva: BARVY[Math.floor(Math.random() * BARVY.length)],
      rotace: Math.random() * 360,
    }))
  )

  return (
    <div className="souboj-konfety" aria-hidden="true">
      {kusy.map((k, i) => (
        <span
          key={i}
          className="souboj-konfeta"
          style={
            {
              left: `${k.left}%`,
              '--zpozdeni': `${k.zpozdeniS}s`,
              '--trvani': `${k.trvaniS}s`,
              '--rotace': `${k.rotace}deg`,
              background: k.barva,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
