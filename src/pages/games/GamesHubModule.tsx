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
// Appčiny STARŠÍ hry — Buddyheim (RPG, src/game/), Souboj (bojovka pro
// dva, src/fighting/) a Buddyho Trh (deskovka, src/boardgame/) — byly
// na žádost dočasně SCHOVANÉ, ne smazané: žádný soubor v žádné herní
// složce se kvůli tomu neměnil, jen tahle obrazovka jim nenabízela
// kartu a routy v App.tsx na ně přestaly odkazovat. SOUBOJ appka
// vrátila zpátky jako první — uživatel ho vyzkoušel na reálné TV +
// mobilu a potvrdil, že síťové párování funguje (to byl jediný důvod,
// proč byl schovaný). BUDDYHEIM appka vrací zpátky hned potom — ten
// byl schovaný čistě kvůli soustředění release na Souboj, ne kvůli
// nehotovosti (postavy, levelování, výbava, inventář, 3D průzkum,
// questy i příběh Season 1 napříč pěti lokacemi jsou dávno hotové,
// chybí jen 25 z 30 plánovaných vedlejších questů). BUDDYHO TRH je
// poslední odkrytá hra — na uživatelovu výslovnou žádost ("ještě tu
// poslední hru odkrej, přidej jj do menu v play") dostává svou vlastní
// kartu, i když appčina vlastní dokumentace (CLAUDE.md) pořád vědomě
// přiznává chybějící síťový režim telefon+TV jako jedinou dál odloženou
// položku — hra je plně hratelná lokálně (pass-and-play i sólo proti
// botům), ekonomika/karty/sabotáž/obchodování/minihry i profesionální
// grafika (Fáze 1–7) jsou dávno hotové.
//
// SURVIVAL NIGHT (src/survival/) je čtvrtá, nová hra a PRVNÍ, co se
// tu doopravdy hraje — nahrazuje bývalé "Připravuje se" skutečnou,
// spustitelnou kartou.
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
            <p className="bz-podnadpis">Buddyheim je zpátky. Souboj, Survival Night i Buddyho Trh tě taky čekají.</p>
          </div>

          <div className="bz-obsah">
            <button className="bz-hra-karta bz-hra-karta--buddyheim" onClick={() => navigate('/hra/buddyheim')}>
              <span className="bz-hra-karta-znak" aria-hidden="true">
                🗺️
              </span>
              <span className="bz-hra-karta-text">
                <span className="bz-hra-karta-nazev">Buddyheim</span>
                <span className="bz-hra-karta-popis">
                  RPG se čtyřmi královstvími — postavy, levelování, výbava, questy a příběh napříč pěti lokacemi.
                </span>
              </span>
              <span className="bz-hra-karta-hrat">HRÁT ▶</span>
            </button>

            <button className="bz-hra-karta bz-hra-karta--souboj" onClick={() => navigate('/hra/souboj')}>
              <span className="bz-hra-karta-znak" aria-hidden="true">
                ⚔️
              </span>
              <span className="bz-hra-karta-text">
                <span className="bz-hra-karta-nazev">Souboj</span>
                <span className="bz-hra-karta-popis">
                  Bojovka pro dva — telefon jako ovladač, TV jako obrazovka. Nebo sólo proti botovi, lokálně na
                  jednom telefonu.
                </span>
              </span>
              <span className="bz-hra-karta-hrat">HRÁT ▶</span>
            </button>

            <button className="bz-hra-karta" onClick={() => navigate('/hra/survival-night')}>
              <span className="bz-hra-karta-znak" aria-hidden="true">
                🌙
              </span>
              <span className="bz-hra-karta-text">
                <span className="bz-hra-karta-nazev">Survival Night</span>
                <span className="bz-hra-karta-popis">Temná noční aréna. Vlny monster. Přežij co nejdéle.</span>
              </span>
              <span className="bz-hra-karta-hrat">HRÁT ▶</span>
            </button>

            <button className="bz-hra-karta bz-hra-karta--deskova" onClick={() => navigate('/hra/deskova-hra')}>
              <span className="bz-hra-karta-znak" aria-hidden="true">
                🎲
              </span>
              <span className="bz-hra-karta-text">
                <span className="bz-hra-karta-nazev">Čtyři království</span>
                <span className="bz-hra-karta-popis">Souboj o trůn pro 2–4 hráče. Sbírej zlato a drahokamy — vyhrává nejbohatší, ne nejrychlejší.</span>
              </span>
              <span className="bz-hra-karta-hrat">HRÁT ▶</span>
            </button>

            <button className="bz-hra-karta bz-hra-karta--trh" onClick={() => navigate('/hra/trh')}>
              <span className="bz-hra-karta-znak" aria-hidden="true">
                🏪
              </span>
              <span className="bz-hra-karta-text">
                <span className="bz-hra-karta-nazev">Buddyho Trh</span>
                <span className="bz-hra-karta-popis">
                  Deskovka pro 2–6 hráčů (i sólo proti botům) — kup obchody, vybírej nájem, obchoduj, sabotuj a
                  zkoušej minihry na otevřené herní desce.
                </span>
              </span>
              <span className="bz-hra-karta-hrat">HRÁT ▶</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}

export default GamesHubModule
