import React, { useEffect, useState } from 'react'
import { Postava, Lokace } from '../types'
import { SVETY_PODLE_LOKACE } from '../data/world'
import { QUESTS, QUEST_PODLE_LOKACE } from '../data/quests'
import { usePlayerWorld } from '../explorace/usePlayerWorld'
import { VirtualniJoystick } from './VirtualniJoystick'
import './Explorace3D.css'

interface Props {
  postava: Postava
  lokace: Lokace
  /** Volá se, když hráč dojde k nepříteli — GameModule.tsx na to
   *  naváže vstupem do existujícího 2D souboje (Souboj.tsx), tenhle
   *  komponent samotný souboj nezná. */
  onSetkani: () => void
  onOdejit: () => void
}

// ==========================================
// 3D průzkum z první osoby — obal kolem usePlayerWorld.ts (čistý
// Three.js mimo React, viz komentář tam). Tenhle soubor jen skládá
// obrazovku: canvas kontejner, HUD s cílem questu, joystick na
// mobilu, tlačítko zpět. Žádná herní logika tu nežije, ta je celá
// v hooku a v datech (data/world.ts, data/quests.ts).
// ==========================================

export const Explorace3D: React.FC<Props> = ({ postava, lokace, onSetkani, onOdejit }) => {
  const konfigurace = SVETY_PODLE_LOKACE[lokace.id]
  const questId = QUEST_PODLE_LOKACE[lokace.id]
  const quest = questId ? QUESTS.find((q) => q.id === questId) : undefined

  const [napovedaViditelna, setNapovedaViditelna] = useState(true)

  // Bezpečnostní pojistka pro typy — MapaSveta nabízí vstup jen tam,
  // kde konfigurace existuje (viz SVETY_PODLE_LOKACE), tenhle stav by
  // nikdy neměl nastat. Kdyby přece, vrátí hráče na mapu, ne bílou
  // obrazovku.
  useEffect(() => {
    if (!konfigurace) onOdejit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { containerRef, selhalo, nastavJoystick } = usePlayerWorld({
    konfigurace: konfigurace ?? SVETY_PODLE_LOKACE.emberfall,
    onSetkani,
  })

  useEffect(() => {
    if (!napovedaViditelna) return
    const t = window.setTimeout(() => setNapovedaViditelna(false), 4200)
    return () => window.clearTimeout(t)
  }, [napovedaViditelna])

  if (!konfigurace) return null

  if (selhalo) {
    return (
      <div className="explorace-selhani">
        <span className="explorace-selhani-ikona" aria-hidden="true">⚠️</span>
        <h2>3D průzkum se nepodařilo spustit</h2>
        <p>Tenhle prohlížeč nejspíš nepodporuje WebGL. Zkus to na jiném zařízení, nebo se vrať na mapu.</p>
        <button className="game-back-btn" style={{ position: 'static' }} onClick={onOdejit}>
          ← Zpět na mapu
        </button>
      </div>
    )
  }

  return (
    <div className="explorace">
      <div ref={containerRef} className="explorace-platno" />

      <div className="explorace-top-bar">
        <button className="game-back-btn" onClick={onOdejit}>
          ← Opustit průzkum
        </button>
        <span className="explorace-nadpis">
          {lokace.ikona} {lokace.nazev}
        </span>
      </div>

      {quest && (
        <div className="explorace-quest-hud">
          <span className="explorace-quest-jmeno">📜 {quest.nazev}</span>
          <span className="explorace-quest-cil">{quest.cil}</span>
        </div>
      )}

      <div className="explorace-zamerovac" aria-hidden="true" />

      {napovedaViditelna && (
        <div className="explorace-napoveda" onClick={() => setNapovedaViditelna(false)}>
          <p>🖱️ Táhni pro rozhlédnutí</p>
          <p>⌨️ WASD / šipky pro pohyb (na mobilu joystick vlevo dole)</p>
          <p>{postava.ikona} Buddy tě doprovází — {lokace.nazev} zkoumáte spolu.</p>
        </div>
      )}

      <VirtualniJoystick onZmena={nastavJoystick} />
    </div>
  )
}
