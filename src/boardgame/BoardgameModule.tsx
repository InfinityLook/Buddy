import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NastaveniHry } from './components/NastaveniHry'
import { Deska } from './components/Deska'
import type { Hrac } from './types'
import './BoardgameModule.css'

// ==========================================
// Buddyho Trh — pracovní název, sedmá hra v rozcestníku her
// (pages/games/GamesHubModule.tsx). Fáze 0: síťová/telefonová verze
// (víc telefonů + sdílená TV) je plánovaná pozdější fáze — tahle
// verze staví jen lokální pass-and-play/sólo-proti-botům režim,
// vybraný jako první proto, že je jediný, který appka umí v tomhle
// sandboxu skutečně otestovat od začátku do konce (Souboj má stejnou
// zkušenost zdokumentovanou v CLAUDE.md — síťové párování telefon↔TV
// nejde přes proxy prostředí ověřit vůbec).
//
// Na rozdíl od Souboje appka tahle hra NEPOTŘEBUJE Supabase/cloud
// vůbec — celá hra běží na jednom zařízení, žádná síť není potřeba,
// takže appka tu nemá žádnou "bez cloudu to nejde" hlášku jako
// FightingModule.tsx.
// ==========================================

type Krok = 'menu' | 'nastaveni' | 'hra'

export const BoardgameModule: React.FC = () => {
  const navigate = useNavigate()
  const [krok, setKrok] = useState<Krok>('menu')
  const [hraci, setHraci] = useState<Hrac[]>([])

  const zpetDoMenu = () => {
    setHraci([])
    setKrok('menu')
  }

  if (krok === 'nastaveni') {
    return (
      <NastaveniHry
        onZpet={() => setKrok('menu')}
        onSpustit={(noviHraci) => {
          setHraci(noviHraci)
          setKrok('hra')
        }}
      />
    )
  }

  if (krok === 'hra') {
    return <Deska pocatecniHraci={hraci} onZpet={zpetDoMenu} />
  }

  return (
    <div className="trh-page">
      <header className="trh-top-bar">
        <button className="trh-back-btn" onClick={() => navigate('/hra')}>
          ← Zpět do her
        </button>
        <h1 className="trh-title">Buddyho Trh</h1>
        <p className="trh-sub">Deskovka pro 2–6 hráčů — skupujte obchody, ať vám na konci zbyde nejvíc.</p>
      </header>

      <button className="trh-volba" onClick={() => setKrok('nastaveni')}>
        <span className="trh-volba-ikona" aria-hidden="true">
          🎲
        </span>
        <span className="trh-volba-text">
          <strong>Hrát lokálně</strong>
          <span>Na jednom zařízení, s kamarády nebo proti botům</span>
        </span>
      </button>

      <p className="trh-faze-poznamka">
        Fáze 0 — základní mřížka, kostka a pohyb. Nákup obchodů, karty a hraní přes víc telefonů přijdou
        v dalších fázích.
      </p>
    </div>
  )
}

export default BoardgameModule
