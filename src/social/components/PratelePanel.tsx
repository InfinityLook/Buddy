import React, { useState } from 'react'
import { SocialIcon } from './SocialIcon'
import * as api from '../api'
import type { SocialStav } from '../useSocial'
import type { SocialProfil } from '../types'

interface Props {
  stav: SocialStav
  onOtevritChat: (chatId: string) => void
}

export const PratelePanel: React.FC<Props> = ({ stav, onOtevritChat }) => {
  const [kod, setKod] = useState('')
  const [nalezeny, setNalezeny] = useState<SocialProfil | null>(null)
  const [hleda, setHleda] = useState(false)
  const [nenalezeno, setNenalezeno] = useState(false)

  const prichozi = stav.zadosti.filter((z) => z.smer === 'prichozi')
  const odchozi = stav.zadosti.filter((z) => z.smer === 'odchozi')

  const hledat = async () => {
    setHleda(true)
    setNenalezeno(false)
    setNalezeny(null)

    const profil = await api.najdiPodleKodu(kod)
    setHleda(false)

    if (profil) setNalezeny(profil)
    else setNenalezeno(true)
  }

  const kopirovatKod = async () => {
    if (!stav.profil) return
    try {
      await navigator.clipboard.writeText(api.formatujKod(stav.profil.friendCode))
      stav.rekni('Kód zkopírován.')
    } catch {
      // Schránka bez povolení nebo v nezabezpečeném kontextu — kód je
      // stejně vidět na obrazovce, takže to není konec světa.
      stav.rekni('Zkopírovat se nepovedlo, přepiš ho ručně.')
    }
  }

  return (
    <div className="social-panel">
      {/* Můj kód */}
      <section className="social-card social-code-card">
        <span className="social-card-label">TVŮJ KÓD</span>
        <div className="social-code-row">
          <span className="social-code">
            {stav.profil ? api.formatujKod(stav.profil.friendCode) : '········'}
          </span>
          <button className="social-icon-btn" onClick={kopirovatKod} aria-label="Zkopírovat kód">
            <SocialIcon name="copy" size={16} />
          </button>
        </div>
        <p className="social-hint">
          Pošli ho tomu, s kým se chceš spojit. Bez kódu tě nikdo nenajde.
        </p>
      </section>

      {/* Přidat podle kódu */}
      <section className="social-card">
        <span className="social-card-label">PŘIDAT KAMARÁDA</span>
        <div className="social-add-row">
          <input
            className="social-input"
            placeholder="ABCD-2345"
            value={kod}
            maxLength={9}
            onChange={(e) => {
              setKod(e.target.value.toUpperCase())
              setNenalezeno(false)
              setNalezeny(null)
            }}
          />
          <button className="social-btn" onClick={hledat} disabled={hleda || kod.length < 8}>
            {hleda ? '…' : 'Najít'}
          </button>
        </div>

        {nenalezeno && <p className="social-empty-note">Takový kód nikomu nepatří.</p>}

        {nalezeny && (
          <div className="social-row">
            <span className="social-avatar" aria-hidden="true">
              {nalezeny.displayName.charAt(0).toUpperCase()}
            </span>
            <span className="social-row-name">{nalezeny.displayName}</span>
            <button
              className="social-btn social-btn--small"
              onClick={async () => {
                const ok = await stav.provest(
                  () => api.poslatZadost(nalezeny.id),
                  'Žádost odeslána.'
                )
                if (ok) {
                  setNalezeny(null)
                  setKod('')
                }
              }}
            >
              <SocialIcon name="plus" size={14} />
              Přidat
            </button>
          </div>
        )}
      </section>

      {/* Došlé žádosti */}
      {prichozi.length > 0 && (
        <section className="social-card">
          <span className="social-card-label">ŽÁDOSTI ({prichozi.length})</span>
          {prichozi.map((z) => (
            <div key={z.id} className="social-row">
              <span className="social-avatar" aria-hidden="true">
                {z.profil.displayName.charAt(0).toUpperCase()}
              </span>
              <span className="social-row-name">{z.profil.displayName}</span>
              <button
                className="social-icon-btn social-icon-btn--ano"
                aria-label="Přijmout"
                onClick={() => stav.provest(() => api.prijmoutZadost(z.id), 'Máte se rádi 🎉')}
              >
                <SocialIcon name="check" size={16} />
              </button>
              <button
                className="social-icon-btn social-icon-btn--ne"
                aria-label="Odmítnout"
                onClick={() => stav.provest(() => api.zrusitVazbu(z.id), 'Žádost odmítnuta.')}
              >
                <SocialIcon name="x" size={16} />
              </button>
            </div>
          ))}
        </section>
      )}

      {odchozi.length > 0 && (
        <section className="social-card">
          <span className="social-card-label">ČEKÁ NA ODPOVĚĎ ({odchozi.length})</span>
          {odchozi.map((z) => (
            <div key={z.id} className="social-row">
              <span className="social-avatar" aria-hidden="true">
                {z.profil.displayName.charAt(0).toUpperCase()}
              </span>
              <span className="social-row-name">{z.profil.displayName}</span>
              <button
                className="social-icon-btn social-icon-btn--ne"
                aria-label="Zrušit žádost"
                onClick={() => stav.provest(() => api.zrusitVazbu(z.id), 'Žádost zrušena.')}
              >
                <SocialIcon name="x" size={16} />
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Přátelé */}
      <section className="social-card">
        <span className="social-card-label">PŘÁTELÉ ({stav.pratele.length})</span>

        {stav.pratele.length === 0 ? (
          <p className="social-empty-note">
            Zatím nikdo. Pošli někomu svůj kód nebo zadej jeho.
          </p>
        ) : (
          stav.pratele.map((p) => (
            <div key={p.vazbaId} className="social-row">
              <span className="social-avatar" aria-hidden="true">
                {p.profil.displayName.charAt(0).toUpperCase()}
              </span>
              <span className="social-row-name">{p.profil.displayName}</span>

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
    </div>
  )
}
