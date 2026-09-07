import React, { useState } from 'react'
import { nahodnaPostava } from '../combat/ai'
import { nahodnaArena } from '../arena/areny'
import { ProtiPocitaci } from './ProtiPocitaci'

interface Props {
  onZpet: () => void
}

// ==========================================
// Dvanácté kolo vylepšení — Rychlý start. Vlastní, malý komponent
// místo definování uvnitř FightingModule.tsx's vlastního renderu —
// appka losuje postavu/bota/arénu JEDNOU při připojení (lazy
// inicializátory useState), a jde o skutečnou komponentu appky, ne o
// funkci definovanou znovu na každý render rodiče (což by appku nutilo
// re-mountovat ProtiPocitaci pokaždé, co by se FightingModule.tsx z
// jakéhokoli důvodu překreslil).
// ==========================================

export const RychlyStart: React.FC<Props> = ({ onZpet }) => {
  const [hrac] = useState(() => nahodnaPostava())
  const [bot] = useState(() => {
    // Appka schválně losuje bota, dokud nevyjde JINÝ než hráč —
    // "Rychlý start" má být zajímavý souboj dvou postav, ne appka
    // proti sobě samé.
    let b = nahodnaPostava()
    while (b === hrac) b = nahodnaPostava()
    return b
  })
  const [arena] = useState(() => nahodnaArena())

  return (
    <ProtiPocitaci
      postavaHrace={hrac}
      postavaBota={bot}
      arenaId={arena}
      obtiznost="normalni"
      onVysledek={onZpet}
      onZpet={onZpet}
    />
  )
}
