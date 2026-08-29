import React, { useState } from 'react'
import { SocialAvatar } from './SocialAvatar'
import * as api from '../api'
import type { SocialStav } from '../useSocial'

interface Props {
  postId: string
  stav: SocialStav
  onZavrit: () => void
}

// ==========================================
// Sdílet příspěvek do chatu — výběr z už schválených přátel (appka
// sdílení nenabízí komukoli, jen lidem, se kterými se dá normálně
// psát), stejný dialogový tvar jako NahlasitDialog.tsx (.social-overlay
// + .social-dialog, žádný portál — malý dialog, ne celoobrazovkový
// prohlížeč).
// ==========================================
export const SdiletPrispevekDialog: React.FC<Props> = ({ postId, stav, onZavrit }) => {
  const [odesilaKomu, setOdesilaKomu] = useState<string | null>(null)
  const [odeslanoKomu, setOdeslanoKomu] = useState<Set<string>>(new Set())

  const poslat = async (prijemceId: string) => {
    if (odesilaKomu) return
    setOdesilaKomu(prijemceId)
    const vysledek = await api.sdiletPrispevekDoChatu(postId, prijemceId)
    setOdesilaKomu(null)
    if (vysledek.ok) {
      setOdeslanoKomu((s) => new Set(s).add(prijemceId))
      stav.rekni('Odesláno.')
    } else {
      stav.rekni(vysledek.chyba ?? 'Nepovedlo se to.')
    }
  }

  return (
    <>
      <div className="social-overlay" onClick={onZavrit} />
      <div className="social-dialog">
        <h3 className="social-dialog-title">Poslat příspěvek</h3>

        <div className="social-sledujici-seznam">
          {stav.pratele.length === 0 ? (
            <p className="social-empty-note">Zatím nikdo. Najdi si někoho ve Vyhledávači.</p>
          ) : (
            stav.pratele.map((p) => (
              <div key={p.profil.id} className="social-row">
                <span className="social-row-otevrit">
                  <SocialAvatar id={p.profil.id} jmeno={p.profil.displayName} avatarUrl={p.profil.avatarUrl} />
                  <span className="social-row-name">{p.profil.displayName}</span>
                </span>
                <button
                  className="social-btn social-btn--small"
                  disabled={odesilaKomu === p.profil.id || odeslanoKomu.has(p.profil.id)}
                  onClick={() => poslat(p.profil.id)}
                >
                  {odeslanoKomu.has(p.profil.id) ? 'Odesláno ✓' : 'Poslat'}
                </button>
              </div>
            ))
          )}
        </div>

        <button className="social-btn social-btn--full social-btn--tlumene" onClick={onZavrit}>
          Zavřít
        </button>
      </div>
    </>
  )
}
