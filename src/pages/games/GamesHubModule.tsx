import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { getLevelProgress } from '@/core/utils/gamificationUtils'
import { SocialIcon } from '@/social/components/SocialIcon'
import './GamesHubModule.css'

// ==========================================
// Buddy Arcade — konzolové menu her za tlačítkem Play v Hubu.
//
// Nahrazuje dřívější prostou mřížku karet: velká "hero" karta
// zaměřené hry nahoře + vodorovná polička dlaždic dole, po vzoru
// domovské obrazovky konzole (PlayStation/Xbox), ale s vlastní
// identitou appky, ne kopie — Buddyho vlastní úrovňový prstenec
// v hlavičce, dýchající orb v doku dole, a "impact spark" motiv za
// hrou v hero kartě, co appka sama používá v aréně Souboje
// (viz Bojiste.tsx v CLAUDE.md — tady jako trvalá dekorace, ne
// reakce na zásah). Schváleno jako statický Artifact návrh, než šel
// kód — stejný postup jako u Economy/Music/Writer's Room. Rozsah byl
// výslovně zúžený na tuhle obrazovku — Hubova dlaždice "Play" se
// nemění, pořád jen odkazuje sem.
//
// Buddyheim je na žádost dočasně vyřazený z nabídky, ne smazaný —
// appka se nejdřív soustředí na dotažení Souboje (hry pro dva) do
// 100 %, RPG (25 vedlejších questů, viz CLAUDE.md) počká na později.
// Vrátit dlaždici zpátky je jedna položka v HRY níž + odkomentovat
// lazy import GameModule a routu /hra/buddyheim v App.tsx — nic
// v src/game/ samotném se kvůli tomuhle nemění.
// ==========================================

interface Hra {
  id: string
  nazev: string
  popis: string
  cesta: string
  /** Obrázkový náhled zatím žádná hra nemá (ani Souboj, viz
   *  src/fighting/ v CLAUDE.md — appka nemá 3D/postavovou grafickou
   *  pipeline pro tuhle hru) — emoji kreslí náhled misto toho,
   *  stejné "neházet tam cizí obrázek jen aby tam něco bylo"
   *  pravidlo jako appka jinde. */
  emoji: string
  /** Skutečné, zdokumentované vlastnosti hry — ne vymyšlené pro
   *  vyplnění místa (viz Souboj v CLAUDE.md: 2 hráči přes telefon
   *  jako ovladač + TV, sólo mód proti botovi z Fáze 5). */
  chips: string[]
}

const HRY: Hra[] = [
  // Buddyheim (RPG) je tu dočasně vyřazený — viz komentář nahoře.
  // {
  //   id: 'buddyheim',
  //   nazev: 'Buddyheim',
  //   popis: 'RPG dobrodružství — postava, mapa světa, souboje karet',
  //   cesta: '/hra/buddyheim',
  //   emoji: '🗺️',
  //   chips: ['🧙 5 postav', '⚔️ Souboje karet', '🌲 3D průzkum'],
  // },
  {
    id: 'souboj',
    nazev: 'Souboj',
    popis: 'Bojovka pro dva — telefon jako ovladač, hraje se na TV. Umí i sólo proti počítači.',
    cesta: '/hra/souboj',
    emoji: '🥊',
    chips: ['👥 2 hráči', '📺 TV mód', '🤖 Sólo vs. bot'],
  },
]

export const GamesHubModule: React.FC = () => {
  const navigate = useNavigate()
  const { xp, level } = useGamificationStore()
  const [vybranaId, setVybranaId] = useState(HRY[0].id)

  const vybrana = HRY.find((h) => h.id === vybranaId) ?? HRY[0]
  const progres = getLevelProgress(xp)

  return (
    <div className="arc-page">
      <div className="arc-top">
        <button className="arc-back" onClick={() => navigate('/hub')} aria-label="Zpět do Hubu">
          <SocialIcon name="arrow-left" size={15} />
        </button>
        <div className="arc-title-wrap">
          <div className="arc-title">
            <span className="arc-vsuvka">🎮</span> Buddy Arcade
          </div>
          <p className="arc-sub">Vyber si, do čeho se dnes pustíš</p>
        </div>
        <span
          className="arc-level"
          aria-label={`Úroveň ${level}`}
          style={{
            background: `conic-gradient(var(--accent-cyan) 0deg ${progres * 3.6}deg, rgba(255,255,255,0.1) ${progres * 3.6}deg 360deg)`,
          }}
        >
          <span>Lv {level}</span>
        </span>
      </div>

      <p className="arc-eyebrow">Vybráno</p>

      <div className="arc-hero">
        <div className="arc-hero-plocha">
          <div className="arc-jiskry" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="arc-hero-znak">{vybrana.emoji}</span>
        </div>
        <div className="arc-hero-info">
          <h3 className="arc-hero-nazev">{vybrana.nazev}</h3>
          <p className="arc-hero-popis">{vybrana.popis}</p>
          <div className="arc-chipy">
            {vybrana.chips.map((c) => (
              <span className="arc-chip" key={c}>
                {c}
              </span>
            ))}
          </div>
          <button className="arc-cta" onClick={() => navigate(vybrana.cesta)}>
            <SocialIcon name="play" size={14} />
            Spustit
          </button>
        </div>
      </div>

      <div className="arc-shelf-hlavicka">
        <h2>Všechny hry</h2>
        <span className="arc-pocet">
          {HRY.length} z {HRY.length + 1}
        </span>
      </div>

      <div className="arc-shelf">
        {HRY.map((hra) => (
          <button
            key={hra.id}
            className={`arc-dlazdice${hra.id === vybranaId ? ' arc-dlazdice--vybrana' : ''}`}
            onClick={() => setVybranaId(hra.id)}
            aria-pressed={hra.id === vybranaId}
          >
            <span className="arc-dlazdice-plocha">
              {hra.emoji}
              {hra.id === vybranaId && (
                <span className="arc-znacka-vybrano" aria-hidden="true">
                  <SocialIcon name="check" size={9} />
                </span>
              )}
            </span>
            <span className="arc-dlazdice-popisek">{hra.nazev}</span>
          </button>
        ))}

        <div className="arc-dlazdice arc-dlazdice--zamceno" aria-hidden="true">
          <span className="arc-dlazdice-plocha">
            <SocialIcon name="lock" size={20} />
          </span>
          <span className="arc-dlazdice-popisek">Již brzy</span>
        </div>
      </div>

      <p className="arc-hint">↔ Přejeď prstem pro další hry</p>

      <div className="arc-dok-wrap">
        <div className="arc-dok">
          <button className="arc-dok-btn" onClick={() => navigate('/hub')}>
            <SocialIcon name="home" size={13} />
            Domů
          </button>
          <span className="arc-orb" aria-hidden="true"></span>
          <span className="arc-dok-btn arc-dok-btn--info">
            Lv {level} · {xp} XP
          </span>
        </div>
      </div>
    </div>
  )
}

export default GamesHubModule
