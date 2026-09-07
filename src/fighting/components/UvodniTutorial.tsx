import React, { useState } from 'react'
import { oznacTutorialZaZobrazeny } from '../tutorial'
import '../FightingModule.css'

interface Props {
  onHotovo: () => void
}

interface Krok {
  emoji: string
  nadpis: string
  text: string
}

const KROKY: Krok[] = [
  {
    emoji: '⚔️',
    nadpis: 'Vítej v Souboji!',
    text: 'Bojuj v aréně proti kamarádovi (na jednom zařízení, na telefonu s TV, nebo online) nebo proti počítači.',
  },
  {
    emoji: '🕹️',
    nadpis: 'Ovládání',
    text: 'Šipky (nebo joystick) tě pohybují po aréně. Čtyři tlačítka útočí: 👊 úder, 🦵 kop, 🛡️ blok, ✨ speciál.',
  },
  {
    emoji: '🤜',
    nadpis: 'Tajná technika',
    text: 'Podrž 👊 úder SPOLU s 🛡️ blokem = neblokovatelný chyt. Zkus to na soupeři, co se jen brání!',
  },
  {
    emoji: '🏆',
    nadpis: 'Jdi na to!',
    text: 'Vyzkoušej Rychlý start pro okamžitý zápas proti botovi, nebo se pusť do Žebříčku a poraz co nejvíc soupeřů v řadě.',
  },
]

// ==========================================
// Vylepšení — úvodní tutorial, zobrazený JEDNOU (viz tutorial.ts) při
// úplně prvním otevření Souboje, ne skryté volitelné "📖 Návod"
// tlačítko (Navod.tsx zůstává beze změny — plné, detailní odkazování
// zpátky ke všem postavám/arénám/technikám, kdykoli si to hráč chce
// znovu přečíst). Tenhle tutorial je záměrně mnohem kratší — čtyři
// krátké karty, ne úplný movelist — a appka ho vynucuje jen jednou,
// aby nestál v cestě hráči, co se do hry vrací podruhé.
// ==========================================

export const UvodniTutorial: React.FC<Props> = ({ onHotovo }) => {
  const [krok, setKrok] = useState(0)
  const posledniKrok = krok === KROKY.length - 1
  const aktualni = KROKY[krok]

  const dokoncit = () => {
    oznacTutorialZaZobrazeny()
    onHotovo()
  }

  return (
    <div className="souboj-page souboj-tutorial-obrazovka">
      <div className="souboj-tutorial-karta">
        <span className="souboj-tutorial-emoji" aria-hidden="true">
          {aktualni.emoji}
        </span>
        <h2 className="souboj-tutorial-nadpis">{aktualni.nadpis}</h2>
        <p className="souboj-tutorial-text">{aktualni.text}</p>

        <div className="souboj-tutorial-tecky" aria-hidden="true">
          {KROKY.map((_, i) => (
            <span key={i} className={`souboj-tutorial-tecka ${i === krok ? 'je-aktivni' : ''}`} />
          ))}
        </div>

        <div className="souboj-tutorial-akce">
          <button type="button" className="souboj-tutorial-preskocit" onClick={dokoncit}>
            Přeskočit
          </button>
          <button
            type="button"
            className="souboj-solo-btn"
            onClick={() => (posledniKrok ? dokoncit() : setKrok((k) => k + 1))}
          >
            {posledniKrok ? 'Rozumím, jdeme hrát!' : 'Dál ▸'}
          </button>
        </div>
      </div>
    </div>
  )
}
