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

export const PratelePanel: React.FC<Props> = ({ stav, onOtevritChat, onOtevritProfil }) => {
  const [dotaz, setDotaz] = useState('')
  const [vysledky, setVysledky] = useState<SocialProfil[]>([])
  const [hleda, setHleda] = useState(false)
  const [hledano, setHledano] = useState(false)
  const [hledatPratele, setHledatPratele] = useState('')
  // Nahlásit dřív šlo jen z konkrétní zprávy v chatu (NahlasitDialog v
  // ChatView.tsx) — kdo obtěžoval mimo chat (třeba žádostmi o přátelství),
  // neměl jak ho nahlásit, aniž by s ním napřed musel/a psát. Dialog
  // zpravaId od začátku bral jako nepovinné, jen tady na něj nebylo tlačítko.
  const [nahlasit, setNahlasit] = useState<SocialProfil | null>(null)

  const prichozi = stav.zadosti.filter((z) => z.smer === 'prichozi')
  const odchozi = stav.zadosti.filter((z) => z.smer === 'odchozi')

  // Hledání jen v už schválených přátelích, ne v celé appce — to dělá
  // sekce NAJÍT LIDI výš, tohle je filtr nad seznamem, co uživatel
  // už na obrazovce má.
  const filtrovaniPratele = useMemo(() => {
    const dotaz = normalizeText(hledatPratele.trim())
    if (!dotaz) return stav.pratele
    return stav.pratele.filter((p) => normalizeText(p.profil.displayName).includes(dotaz))
  }, [stav.pratele, hledatPratele])

  const hledatLidi = async (e: React.FormEvent) => {
    e.preventDefault()
    if (dotaz.trim().length < 2) return

    setHleda(true)
    const vysledek = await api.hledejPodleJmena(dotaz)
    setVysledky(vysledek)
    setHledano(true)
    setHleda(false)
  }

  const pridatPritele = async (profil: SocialProfil) => {
    const ok = await stav.provest(() => api.poslatZadost(profil.id), 'Žádost odeslána.')
    if (ok) setVysledky((v) => v.filter((p) => p.id !== profil.id))
  }

  return (
    <div className="social-panel">
      {/* Najít lidi podle jména */}
      <section className="social-card">
        <span className="social-card-label">NAJÍT LIDI</span>
        <form className="social-add-row" onSubmit={hledatLidi}>
          <input
            className="social-input"
            placeholder="Jméno…"
            value={dotaz}
            maxLength={40}
            onChange={(e) => {
              setDotaz(e.target.value)
              setHledano(false)
            }}
          />
          <button className="social-btn" type="submit" disabled={hleda || dotaz.trim().length < 2}>
            {hleda ? '…' : 'Hledat'}
          </button>
        </form>

        {hledano && vysledky.length === 0 && (
          <p className="social-empty-note">Nikoho takového jsme nenašli.</p>
        )}

        {vysledky.map((profil) => (
          <div key={profil.id} className="social-row">
            <button className="social-row-otevrit" onClick={() => onOtevritProfil(profil.id)}>
              <SocialAvatar id={profil.id} jmeno={profil.displayName} avatarUrl={profil.avatarUrl} />
              <span className="social-row-name">{profil.displayName}</span>
            </button>
            <button className="social-btn social-btn--small" onClick={() => pridatPritele(profil)}>
              <SocialIcon name="plus" size={14} />
              Přidat
            </button>
          </div>
        ))}
      </section>

      {/* Došlé žádosti */}
      {prichozi.length > 0 && (
        <section className="social-card">
          <span className="social-card-label">ŽÁDOSTI ({prichozi.length})</span>
          {prichozi.map((z) => (
            <div key={z.id} className="social-row">
              <button className="social-row-otevrit" onClick={() => onOtevritProfil(z.profil.id)}>
                <SocialAvatar id={z.profil.id} jmeno={z.profil.displayName} avatarUrl={z.profil.avatarUrl} pulzuje />
                <span className="social-row-name">{z.profil.displayName}</span>
              </button>
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
              <button className="social-row-otevrit" onClick={() => onOtevritProfil(z.profil.id)}>
                <SocialAvatar id={z.profil.id} jmeno={z.profil.displayName} avatarUrl={z.profil.avatarUrl} />
                <span className="social-row-name">{z.profil.displayName}</span>
              </button>
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
            Zatím nikdo. Najdi si někoho podle jména výš.
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
