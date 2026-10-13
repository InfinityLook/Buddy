import React from 'react'
import { SocialAvatar } from './SocialAvatar'
import * as api from '../api'
import type { SocialStav } from '../useSocial'

interface Props {
  stav: SocialStav
}

/** Zrcadlí BlokovaniPanel.tsx — stejný seznam, stejné "odebrat" tlačítko,
 *  jen jiný vztah a jiná hláška: ztlumený dál smí psát/sledovat, appka
 *  mu jen přestane ukazovat příspěvky ve feedu. */
export const ZtlumeniPanel: React.FC<Props> = ({ stav }) => (
  <div className="social-panel">
    <section className="social-card">
      <span className="social-card-label">ZTLUMENÍ ({stav.utlumeni.length})</span>
      <p className="social-hint">
        Ztlumený účet dál smí sledovat, psát i komentovat — appka jen přestane ukazovat jeho
        příspěvky ve feedu "Nejnovější" i "Pro tebe".
      </p>
      {stav.utlumeni.length === 0 ? (
        <p className="social-empty-note">Nikoho jsi neztlumil.</p>
      ) : (
        stav.utlumeni.map((p) => (
          <div key={p.id} className="social-row">
            <SocialAvatar id={p.id} jmeno={p.displayName} avatarUrl={p.avatarUrl} />
            <span className="social-row-name">{p.displayName}</span>
            <button
              className="social-btn social-btn--small social-btn--tlumene"
              onClick={() => stav.provest(() => api.odtlumitUcet(p.id), `${p.displayName} je odtlumený.`)}
            >
              Odtlumit
            </button>
          </div>
        ))
      )}
    </section>
  </div>
)
