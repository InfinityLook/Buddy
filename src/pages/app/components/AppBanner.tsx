import React from 'react'
import mascot from '../../../assets/mascot.png'

export const AppBanner: React.FC = () => (
  <section className="app-banner">
    <div className="app-banner-mascot-area">
      <div className="app-banner-glow" />
      <img src={mascot} alt="Buddy Maskot" className="app-banner-mascot-img" />
    </div>

    <div className="app-banner-content">
      <h2>
        Vytvoř další aplikaci 🚀
      </h2>
      <p>Popusť uzdu své kreativitiě a vytvoř něco úžasného!</p>
    </div>
  </section>
)
