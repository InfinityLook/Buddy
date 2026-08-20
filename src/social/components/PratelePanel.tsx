import React, { useState } from 'react'
import { SocialIcon } from './SocialIcon'
import { SocialAvatar } from './SocialAvatar'
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
  const [potiz, setPotiz] = useState<string | null>(null)
  const [zkopirovano, setZkopirovano] = useState(false)

  const prichozi = stav.zadosti.filter((z) => z.smer === 'prichozi')
  const odchozi = stav.zadosti.filter((z) => z.smer === 'odchozi')

  const hledat = async () => {
    setHleda(true)
    setPotiz(null)
    setNalezeny(null)

    // Vlastní kód se pozná tady, ne v databázi: funkce hledání sama sebe
    // schválně přeskakuje, takže by vrátila prázdno a uživatel by dostal
    // "takový kód nikomu nepatří" u kódu, který má před očima na displeji.
    if (stav.profil && api.ocistiKod(kod) === stav.profil.friendCode) {
      setHleda(false)
      setPotiz('Tohle je tvůj vlastní kód. Potřebuješ kód toho druhého.')
      return
    }

    const vysledek = await api.najdiPodleKodu(kod)
    setHleda(false)

    if (vysledek.stav === 'nalezen') setNalezeny(vysledek.profil)
    else if (vysledek.stav === 'chyba') setPotiz(vysledek.chyba)
    else setPotiz('Takový kód nikomu nepatří. Zkontroluj, jestli sedí každý znak.')
  }

  const kopirovatKod = async () => {
    if (!stav.profil) return
    try {
      await navigator.clipboard.writeText(api.formatujKod(stav.profil.friendCode))
      stav.rekni('Kód zkopírován.')
      // Ikona se na chvíli překlopí na fajfku — vizuální potvrzení hned
      // u tlačítka, ne jen v hlášce dole, na kterou člověk nemusí koukat.
      setZkopirovano(true)
      window.setTimeout(() => setZkopirovano(false), 1400)
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
          <button
            className={`social-icon-btn ${zkopirovano ? 'social-icon-btn--ano' : ''}`}
            onClick={kopirovatKod}
            aria-label="Zkopírovat kód"
          >
            <SocialIcon name={zkopirovano ? 'check' : 'copy'} size={16} />
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
              setPotiz(null)
              setNalezeny(null)
            }}
          />
          <button className="social-btn" onClick={hledat} disabled={hleda || kod.length < 8}>
            {hleda ? '…' : 'Najít'}
          </button>
        </div>

        {potiz && <p className="social-empty-note">{potiz}</p>}

        {nalezeny && (
          <div className="social-row">
            <SocialAvatar id={nalezeny.id} jmeno={nalezeny.displayName} />
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
              <SocialAvatar id={z.profil.id} jmeno={z.profil.displayName} pulzuje />
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
              <SocialAvatar id={z.profil.id} jmeno={z.profil.displayName} />
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
              <SocialAvatar id={p.profil.id} jmeno={p.profil.displayName} />
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
