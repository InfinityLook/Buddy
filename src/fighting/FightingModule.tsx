import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured } from '@/core/supabase/client'
import { TvHost } from './components/TvHost'
import { Ovladac } from './components/Ovladac'
import './FightingModule.css'

// ==========================================
// Souboj — pracovní název, druhá hra v rozcestníku her
// (pages/games/GamesHubModule.tsx; sem se zatím nenapojuje jako
// skutečná karta — přijde ve Fázi 4 podle plánu v CLAUDE.md, dokud je
// dostupná jen přímo na téhle routě).
//
// Tohle je Fáze 0: čistě síťové párování telefon-ovladač <-> TV
// (network.ts), žádná herní grafika ani pravidla zápasu ještě
// neexistují — cíl je ověřit, že vstup z ovladače doopravdy a rychle
// dorazí na druhou obrazovku, než se do toho investuje cokoli dalšího
// (postavy, aréna, souboj samotný).
// ==========================================

type Role = 'vyber' | 'tv' | 'ovladac'

export const FightingModule: React.FC = () => {
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('vyber')

  if (!isSupabaseConfigured) {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={() => navigate('/hra')}>
            ← Zpět do her
          </button>
          <h1 className="souboj-title">Souboj</h1>
        </header>
        <p className="souboj-bez-cloudu">
          Tahle hra potřebuje připojení ke cloudu (spojuje telefon a TV přes síť) —
          v tomhle sestavení appky není nastavené.
        </p>
      </div>
    )
  }

  if (role === 'tv') return <TvHost onZpet={() => setRole('vyber')} />
  if (role === 'ovladac') return <Ovladac onZpet={() => setRole('vyber')} />

  return (
    <div className="souboj-page">
      <header className="souboj-top-bar">
        <button className="souboj-back-btn" onClick={() => navigate('/hra')}>
          ← Zpět do her
        </button>
        <h1 className="souboj-title">Souboj</h1>
        <p className="souboj-sub">Ve vývoji — zatím jen zkouška spojení telefon ↔ TV.</p>
      </header>

      <div className="souboj-vyber">
        <button className="souboj-volba" onClick={() => setRole('tv')}>
          <span className="souboj-volba-ikona" aria-hidden="true">📺</span>
          <span className="souboj-volba-text">
            <span className="souboj-volba-nazev">Hostovat na TV</span>
            <span className="souboj-volba-popis">
              Tohle zařízení ukáže hru — otevři na obrazovce u televize.
            </span>
          </span>
        </button>

        <button className="souboj-volba" onClick={() => setRole('ovladac')}>
          <span className="souboj-volba-ikona" aria-hidden="true">🎮</span>
          <span className="souboj-volba-text">
            <span className="souboj-volba-nazev">Připojit se jako ovladač</span>
            <span className="souboj-volba-popis">Telefon se změní na joystick a tlačítka.</span>
          </span>
        </button>
      </div>
    </div>
  )
}

export default FightingModule
