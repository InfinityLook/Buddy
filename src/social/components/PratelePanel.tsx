import React, { useMemo, useState } from 'react'
import { SocialIcon } from './SocialIcon'
import { SocialAvatar } from './SocialAvatar'
import { NahlasitDialog } from './NahlasitDialog'
import * as api from '../api'
import { normalizeText } from '@/core/utils/text'
import type { SocialStav } from '../useSocial'
import type { SocialProfil } from '../types'

interface Props {
  stav: SocialStav
  onOtevritChat: (chatId: string) => void
  onOtevritProfil: (userId: string) => void
}

// ==========================================
// Seznam už schválených přátel — vyhledávání nových lidí, návrhy
// a žádosti o přátelství mají od Fáze 2 rozvržení vlastní záložku
// (VyhledavacPanel.tsx); tenhle panel zůstává jen to, co je "moje",
// vykreslený jako součást Profilu (MujProfilPanel.tsx), ne vedle něj.
// ==========================================

export const PratelePanel: React.FC<Props> = ({ stav, onOtevritChat, onOtevritProfil }) => {
  const [hledatPratele, setHledatPratele] = useState('')
  // Nahlásit dřív šlo jen z konkrétní zprávy v chatu (NahlasitDialog v
  // ChatView.tsx) — kdo obtěžoval mimo chat (třeba žádostmi o přátelství),
  // neměl jak ho nahlásit, aniž by s ním napřed musel/a psát. Dialog
  // zpravaId od začátku bral jako nepovinné, jen tady na něj nebylo tlačítko.
  const [nahlasit, setNahlasit] = useState<SocialProfil | null>(null)

  // Hledání jen v už schválených přátelích, ne v celé appce — to dělá
  // Vyhledávač, tohle je filtr nad seznamem, co uživatel už na
  // obrazovce má.
  const filtrovaniPratele = useMemo(() => {
    const dotaz = normalizeText(hledatPratele.trim())
    if (!dotaz) return stav.pratele
    return stav.pratele.filter((p) => normalizeText(p.profil.displayName).includes(dotaz))
  }, [stav.pratele, hledatPratele])

  return (
    <div className="social-panel">
      <section className="social-card">
        <span className="social-card-label">PŘÁTELÉ ({stav.pratele.length})</span>

        {stav.pratele.length > 0 && (
          <input
            type="search"
            className="social-input social-input--full"
            placeholder="Hledat mezi přáteli…"
            value={hledatPratele}
            onChange={(e) => setHledatPratele(e.target.value)}
          />
        )}

        {stav.pratele.length === 0 ? (
          <p className="social-empty-note">
            Zatím nikdo. Najdi si někoho ve Vyhledávači.
          </p>
        ) : filtrovaniPratele.length === 0 ? (
          <p className="social-empty-note">Nikdo takový mezi přáteli není.</p>
        ) : (
          filtrovaniPratele.map((p) => (
            <div key={p.vazbaId} className="social-row">
              <button className="social-row-otevrit" onClick={() => onOtevritProfil(p.profil.id)}>
                <SocialAvatar id={p.profil.id} jmeno={p.profil.displayName} avatarUrl={p.profil.avatarUrl} />
                <span className="social-row-name">{p.profil.displayName}</span>
              </button>

              <button
                className="social-icon-btn"
                aria-label={`Napsat ${p.profil.displayName}`}
                onClick={async () => {
                  const v = await api.otevritChatSPritelem(p.profil.id)
                  if (v.ok && v.chatId) onOtevritChat(v.chatId)
                  else stav.rekni(v.chyba ?? 'Chat se nepovedlo otevřít.')
                }}
              >
                <SocialIcon name="chat" size={16} />
              </button>

              <button
                className="social-icon-btn"
                aria-label={`Nahlásit ${p.profil.displayName}`}
                onClick={() => setNahlasit(p.profil)}
              >
                <SocialIcon name="flag" size={16} />
              </button>

              <button
                className="social-icon-btn social-icon-btn--ne"
                aria-label={`Zablokovat ${p.profil.displayName}`}
                onClick={() =>
                  stav.provest(
                    () => api.zablokovat(p.profil.id),
                    `${p.profil.displayName} je zablokovaný.`
                  )
                }
              >
                <SocialIcon name="block" size={16} />
              </button>
            </div>
          ))
        )}
      </section>

      {nahlasit && (
        <NahlasitDialog userId={nahlasit.id} stav={stav} onZavrit={() => setNahlasit(null)} />
      )}
    </div>
  )
}
