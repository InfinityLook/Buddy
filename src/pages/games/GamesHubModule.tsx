import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { getLevelProgress } from '@/core/utils/gamificationUtils'
import { SocialIcon } from '@/social/components/SocialIcon'
import './GamesHubModule.css'

// ==========================================
// BuddyZone — rozcestník her za tlačítkem Play v Hubu.
//
// Přestavěno podle dodaného "BuddyZone" landscape návrhu (boční menu +
// horní lišta + velký hero banner + "Vyber si hru"), s appkou vlastní
// úpravou: telefon se snaží po vstupu zamknout na šířku
// (screen.orientation.lock, stejný best-effort postup jako Ovladac.tsx
// v Souboji — nefunguje mimo fullscreen a vůbec ne na iOS Safari, proto
// appka MÍSTO spoléhání na zámek ukazuje čistě CSS "otoč telefon" výzvu
// přes @media (orientation: portrait) a skutečný obsah schová, dokud
// telefon doopravdy na šířku neleží — stejná dvojice appka už jednou
// postavila pro Souboj a dokumentuje v CLAUDE.md).
//
// Appčiny tři hry — Buddyheim (RPG, src/game/), Souboj (bojovka pro
// dva, src/fighting/) a Buddyho Trh (deskovka, src/boardgame/) — jsou
// na žádost dočasně SCHOVANÉ, ne smazané: appka začíná hry stavět
// úplně od znova, tahle obrazovka mezitím tam, kde by byla mřížka
// "Dostupné hry", ukazuje jen "Připravuje se". Žádný soubor ve všech
// třech herních složkách se kvůli tomu nemění — jen tahle obrazovka
// přestala nabízet karty a routy v App.tsx přestaly na ně odkazovat
// (viz komentář tam u zakomentovaných lazy importů). Vrátit některou
// hru zpátky znamená: přidat jí sem znovu skutečnou mřížku karet,
// odkomentovat její lazy import v App.tsx a přehodit její routu
// z <Navigate to="/hra" replace /> zpátky na skutečný element —
// stejný "hide, keep documented, one-line revert" postup, co appka
// použila jako první na samotného Buddyheima.
//
// Boční menu mapuje jen to, co appka doopravdy má — Nastavení a
// Achievementy (appčina existující obrazovka odměn na /odmeny) vedou
// na reálné cíle, Úkoly a Inventář zůstávají viditelné, ale netykové
// (appka pro ně dnes nemá kam vést, žádný úkolový/inventářový systém
// není bez her dostupný) — stejná "řekni, co to je, nevymýšlej
// náhradu" zdrženlivost jako appčina Library dlaždice nebo admin
// panelu BRZY přepínače.
// ==========================================

export const GamesHubModule: React.FC = () => {
  const navigate = useNavigate()
  const { xp, level } = useGamificationStore()
  const progres = getLevelProgress(xp)

  useEffect(() => {
    // `lock` chybí v TS DOM typech (experimentální, vendor-specific
    // podpora) — stejný důvod jako speechTypes.d.ts/barcodeTypes.d.ts
    // jinde v appce, tady stačí místní cast, ne celý ambientní soubor
    // pro jedinou metodu jednoho volání. Bez fullscreenu/mimo
    // nainstalovanou PWA prohlížeč zámek typicky tiše odmítne — proto
    // appka spoléhá hlavně na CSS "otoč telefon" výzvu níž, tohle je
    // jen bonusový pokus, ne jediná záruka.
    const orientaceSZamkem = screen.orientation as ScreenOrientation & {
      lock?: (orientace: string) => Promise<void>
    }
    orientaceSZamkem.lock?.('landscape').catch(() => {})
  }, [])

  return (
    <div className="bz-page">
      <div className="bz-rotate-prompt" aria-hidden="true">
        <span className="bz-rotate-ikona">🔄</span>
        <p>Otoč telefon na šířku</p>
      </div>

      <div className="bz-shell">
        <aside className="bz-sidebar">
          <div className="bz-sidebar-logo">
            <span className="bz-logo-znak">🎮</span>
            <span className="bz-logo-text">
              Buddy<span className="bz-logo-zone">Zone</span>
            </span>
          </div>

          <nav className="bz-nav" aria-label="Menu her">
            <span className="bz-nav-item bz-nav-item--active">
              <SocialIcon name="gamepad" size={16} />
              Hry
            </span>
            <span className="bz-nav-item bz-nav-item--inert" aria-disabled="true">
              <SocialIcon name="check" size={16} />
              Úkoly
            </span>
            <button className="bz-nav-item" onClick={() => navigate('/odmeny')}>
              <SocialIcon name="star" size={16} />
              Achievementy
            </button>
            <span className="bz-nav-item bz-nav-item--inert" aria-disabled="true">
              <SocialIcon name="bag" size={16} />
              Inventář
            </span>
            <button className="bz-nav-item" onClick={() => navigate('/nastaveni')}>
              <SocialIcon name="settings" size={16} />
              Nastavení
            </button>
          </nav>

          <button className="bz-sidebar-back" onClick={() => navigate('/hub')}>
            <SocialIcon name="arrow-left" size={14} />
            Zpět do Hubu
          </button>
        </aside>

        <main className="bz-main">
          <div className="bz-topbar">
            <div className="bz-search" aria-hidden="true">
              <SocialIcon name="search" size={14} />
              <span>Hledat hru…</span>
            </div>
            <div className="bz-top-actions">
              <span className="bz-icon-btn" aria-hidden="true">
                <SocialIcon name="bell" size={15} />
              </span>
              <span
                className="bz-level"
                aria-label={`Úroveň ${level}`}
                style={{
                  background: `conic-gradient(var(--accent-cyan) 0deg ${progres * 3.6}deg, rgba(255,255,255,0.12) ${progres * 3.6}deg 360deg)`,
                }}
              >
                <span>Lv {level}</span>
              </span>
              <span className="bz-icon-btn bz-avatar" aria-hidden="true">
                <SocialIcon name="user" size={15} />
              </span>
            </div>
          </div>

          <div className="bz-hero">
            <div className="bz-hero-jiskry" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="bz-hero-znak" aria-hidden="true">
              🕹️
            </span>
          </div>

          <div className="bz-hlavicka">
            <h1 className="bz-nadpis">Vyber si hru</h1>
            <p className="bz-podnadpis">Nové hry se teprve staví</p>
          </div>

          <div className="bz-obsah">
            <div className="bz-brzy">
              <span className="bz-brzy-znak" aria-hidden="true">
                🛠️
              </span>
              <h2 className="bz-brzy-nadpis">Připravuje se</h2>
              <p className="bz-brzy-popis">
                BuddyZone prochází přestavbou — hry tu brzy budou zase k mání. Díky za trpělivost!
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default GamesHubModule
