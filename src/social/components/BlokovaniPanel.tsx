import React from 'react'
import { SocialIcon } from './SocialIcon'
import * as api from '../api'
import type { SocialStav } from '../useSocial'

interface Props {
  stav: SocialStav
}

export const BlokovaniPanel: React.FC<Props> = ({ stav }) => (
  <div className="social-panel">
    <section className="social-card">
      <span className="social-card-label">ZABLOKOVANÍ ({stav.bloky.length})</span>

      <p className="social-hint">
        Zablokovaný ti nemůže napsat ani poslat žádost a jeho zprávy se ti
        vůbec nenačtou — ani ve skupině.
      </p>

      {stav.bloky.length === 0 ? (
        <p className="social-empty-note">Nikoho jsi nezablokoval.</p>
      ) : (
        stav.bloky.map((p) => (
          <div key={p.id} className="social-row">
            <span className="social-avatar" aria-hidden="true">
              {p.displayName.charAt(0).toUpperCase()}
            </span>
            <span className="social-row-name">{p.displayName}</span>
            <button
              className="social-btn social-btn--small social-btn--tlumene"
              onClick={() =>
                stav.provest(() => api.odblokovat(p.id), `${p.displayName} je odblokovaný.`)
              }
            >
              Odblokovat
            </button>
          </div>
        ))
      )}
    </section>

    <section className="social-card">
      <span className="social-card-label">JAK TO FUNGUJE</span>
      <ul className="social-info-list">
        <li>Najít tě může jen ten, komu dáš svůj kód.</li>
        <li>Blokování zruší i přátelství, pokud jste ho měli.</li>
        <li>
          <SocialIcon name="flag" size={12} /> Nahlásit najdeš u každé cizí zprávy
          v chatu.
        </li>
      </ul>
    </section>
  </div>
)
