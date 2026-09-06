import React, { useEffect, useState } from 'react'
import { oznamOdpocet } from '../komentator'

interface Props {
  /** Celková délka intra (combat/loop.ts's INTRO_MS) — odpočet zabírá
   *  jen jeho POSLEDNÍCH pár sekund, ne celé intro od začátku, ať
   *  hráči nejdřív stihnou vidět, proti komu vlastně hrají (VS karty
   *  vedle týhle komponenty), a teprve pak se rozjede odpočet těsně
   *  před startem. */
  celkovaDelkaMs: number
}

const KROK_MS = 500
const KROKY: (number | 'FIGHT')[] = [3, 2, 1, 'FIGHT']
const DELKA_ODPOCTU_MS = KROKY.length * KROK_MS

// ==========================================
// Desáté kolo vylepšení — "3-2-1-BOJ!" odpočet nad úvodní "VS"
// obrazovkou. Vlastní, nezávislé časování na tom, co appka pro celý
// zbytek intra už má (TvHost.tsx/LocalniZapas.tsx's introAktivni
// setTimeout) — appka radši spočítá zpoždění dopředu z celkové délky
// intra (celkovaDelkaMs - DELKA_ODPOCTU_MS), než aby dvě různé
// komponenty musely koordinovat jeden sdílený časovač.
// ==========================================

export const IntroPocitadlo: React.FC<Props> = ({ celkovaDelkaMs }) => {
  const [krok, setKrok] = useState<number | 'FIGHT' | null>(null)

  useEffect(() => {
    const zpozdeni = Math.max(0, celkovaDelkaMs - DELKA_ODPOCTU_MS)
    const timeouty: number[] = []
    KROKY.forEach((hodnota, i) => {
      const id = window.setTimeout(() => {
        setKrok(hodnota)
        oznamOdpocet(hodnota)
      }, zpozdeni + i * KROK_MS)
      timeouty.push(id)
    })
    return () => timeouty.forEach((id) => window.clearTimeout(id))
  }, [celkovaDelkaMs])

  if (krok === null) return null
  return (
    // `key={String(krok)}` je schválně tady — appka potřebuje, aby se
    // na KAŽDÝ krok odpočtu vytvořil nový DOM uzel (jinak by se CSS
    // `animation` na stejném elementu spustila jen jednou, na první
    // krok, a další čísla by se jen tiše přepsala beze švihu, viz
    // FightingModule.css's souboj-pocitadlo-skok).
    <div
      key={String(krok)}
      className={`souboj-intro-pocitadlo ${krok === 'FIGHT' ? 'souboj-intro-pocitadlo--boj' : ''}`}
      aria-live="polite"
    >
      {krok === 'FIGHT' ? 'BOJ!' : krok}
    </div>
  )
}
