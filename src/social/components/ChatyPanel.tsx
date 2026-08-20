import React, { useState } from 'react'
import { SocialIcon } from './SocialIcon'
import * as api from '../api'
import type { SocialStav } from '../useSocial'

interface Props {
  stav: SocialStav
  onOtevritChat: (chatId: string) => void
}

const casKratce = (iso: string | null): string => {
  if (!iso) return ''

  const kdy = new Date(iso)
  const dnes = new Date()
  const stejnyDen = kdy.toDateString() === dnes.toDateString()

  // Dnešní zprávy mají čas, starší datum — u hodiny z minulého týdne
  // by nikdo nepoznal, o který den šlo.
  return stejnyDen
    ? kdy.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
    : kdy.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
}

export const ChatyPanel: React.FC<Props> = ({ stav, onOtevritChat }) => {
  const [zakladaSkupinu, setZakladaSkupinu] = useState(false)
  const [nazev, setNazev] = useState('')
  const [vybrani, setVybrani] = useState<string[]>([])

  const prepnout = (id: string) =>
    setVybrani((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))

  const zalozit = async () => {
    const v = await api.zalozitChat(vybrani, true, nazev.trim() || 'Skupina')

    if (v.ok && v.chatId) {
      setZakladaSkupinu(false)
      setNazev('')
      setVybrani([])
      await stav.obnovit()
      onOtevritChat(v.chatId)
    } else {
      stav.rekni(v.chyba ?? 'Skupinu se nepovedlo založit.')
    }
  }

  return (
    <div className="social-panel">
      <section className="social-card">
        <div className="social-card-head">
          <span className="social-card-label">SKUPINA</span>
          <button
            className="social-btn social-btn--small"
            onClick={() => setZakladaSkupinu((z) => !z)}
          >
            <SocialIcon name={zakladaSkupinu ? 'x' : 'plus'} size={14} />
            {zakladaSkupinu ? 'Zrušit' : 'Založit'}
          </button>
        </div>

        {zakladaSkupinu && (
          <>
            <input
              className="social-input social-input--full"
              placeholder="Název skupiny"
              value={nazev}
              maxLength={40}
              onChange={(e) => setNazev(e.target.value)}
            />

            {/* Do skupiny jde přidat jen přítel — hlídá to i databáze */}
            {stav.pratele.length === 0 ? (
              <p className="social-empty-note">
                Nejdřív si přidej někoho mezi přátele.
              </p>
            ) : (
              <>
                <p className="social-hint">Koho pozveš?</p>
                {stav.pratele.map((p) => (
                  <button
                    key={p.vazbaId}
                    className={`social-row social-row--volba ${
                      vybrani.includes(p.profil.id) ? 'is-vybrany' : ''
                    }`}
                    onClick={() => prepnout(p.profil.id)}
                  >
                    <span className="social-avatar" aria-hidden="true">
                      {p.profil.displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="social-row-name">{p.profil.displayName}</span>
                    {vybrani.includes(p.profil.id) && <SocialIcon name="check" size={16} />}
                  </button>
                ))}

                <button
                  className="social-btn social-btn--full"
                  disabled={vybrani.length === 0}
                  onClick={zalozit}
                >
                  Založit skupinu ({vybrani.length})
                </button>
              </>
            )}
          </>
        )}
      </section>

      <section className="social-card">
        <span className="social-card-label">CHATY ({stav.chaty.length})</span>

        {stav.chaty.length === 0 ? (
          <p className="social-empty-note">
            Zatím žádný chat. Otevři ho u někoho v seznamu přátel.
          </p>
        ) : (
          stav.chaty.map((ch) => (
            <button key={ch.id} className="social-row social-row--chat" onClick={() => onOtevritChat(ch.id)}>
              <span className={`social-avatar ${ch.jeSkupina ? 'is-skupina' : ''}`} aria-hidden="true">
                {ch.jeSkupina ? '#' : ch.nazev.charAt(0).toUpperCase()}
              </span>

              <span className="social-chat-text">
                <span className="social-chat-nazev">{ch.nazev}</span>
                <span className="social-chat-nahled">
                  {ch.posledniZprava ?? 'Zatím bez zpráv'}
                </span>
              </span>

              <span className="social-chat-meta">
                <span className="social-chat-cas">{casKratce(ch.posledniCas)}</span>
                {ch.neprectene > 0 && (
                  <span className="social-odznak">{ch.neprectene}</span>
                )}
              </span>
            </button>
          ))
        )}
      </section>
    </div>
  )
}
