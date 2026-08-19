import React from 'react'
import mascot from '@/assets/mascot.png'
import { AppIcon } from './AppIcon'
import type { AppItem } from '@/core/store/useAppStore'

interface AppBannerProps {
  // Naposledy otevřená miniaplikace, nebo null, když uživatel zatím
  // žádnou nespustil
  lastApp: AppItem | null
  onOpen: (id: string) => void
  favoriteCount: number
}

// Banner dřív sliboval "Vytvoř další aplikaci", jenže nic takového
// aplikace neumí a tlačítko ani neexistovalo. Místo prázdného slibu
// nabízí návrat k rozdělané práci — to je jediná věc, kterou od
// rozcestníku uživatel opravdu potřebuje.
export const AppBanner: React.FC<AppBannerProps> = ({ lastApp, onOpen, favoriteCount }) => (
  <section className="app-banner">
    <div className="app-banner-mascot-area">
      <div className="app-banner-glow" />
      <img src={mascot} alt="" className="app-banner-mascot-img" />
    </div>

    <div className="app-banner-content">
      {lastApp ? (
        <>
          <span className="app-banner-tag">POKRAČUJ, KDE JSI SKONČIL</span>
          <h2>{lastApp.title}</h2>
          <p>Naposledy jsi pracoval/a tady. Skočíme rovnou zpátky?</p>
          <button className="app-banner-btn" onClick={() => onOpen(lastApp.id)}>
            Otevřít
            <AppIcon name="arrow-right" size={16} />
          </button>
        </>
      ) : (
        <>
          <span className="app-banner-tag">ZAČNI TADY</span>
          <h2>Vyber si první aplikaci 🚀</h2>
          <p>
            {favoriteCount > 0
              ? `Máš ${favoriteCount} označených hvězdičkou — ty najdeš úplně nahoře.`
              : 'Hvězdičkou si označíš oblíbené a vyskočí ti nahoru.'}
          </p>
        </>
      )}
    </div>
  </section>
)
