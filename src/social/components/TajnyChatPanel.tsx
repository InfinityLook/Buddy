import React, { useState } from 'react'
import { SocialIcon } from './SocialIcon'
import { SocialAvatar } from './SocialAvatar'
import * as api from '../api'
import type { TajnyChatStav } from '../useTajnyChat'

interface Props {
  tajnyStav: TajnyChatStav
  rekni: (text: string) => void
  onOtevrit: (chatId: string) => void
}

// ==========================================
// Založení a seznam tajných chatů.
//
// Cíl se hledá pořád podle kódu, ne podle jména — přesně proto kód
// (najdiPodleKodu, formatujKod/ocistiKod) v api.ts zůstal beze změny,
// i když si přátele Social teď hledá jinak (viz PratelePanel.tsx).
// Tady je to konečně jeho použití, s jakým se od začátku počítalo.
// ==========================================

export const TajnyChatPanel: React.FC<Props> = ({ tajnyStav, rekni, onOtevrit }) => {
  const [kod, setKod] = useState('')
  const [hleda, setHleda] = useState(false)

  const cekajiciNaMe = tajnyStav.chaty.filter((c) => c.stav === 'cekajici' && !c.zalozilJa)
  const cekajiciOdMe = tajnyStav.chaty.filter((c) => c.stav === 'cekajici' && c.zalozilJa)
  const aktivni = tajnyStav.chaty.filter((c) => c.stav === 'aktivni')
  // Dřív slepá ulička — zaloz_tajny_chat teď zamítnutou pozvánku umí
  // znovupoužít jako novou (viz migrace), takže tahle sekce jen dává
  // vědět, že šlo o zamítnutí, ne že appka mlčí o tom, co se stalo.
  const zamitnute = tajnyStav.chaty.filter((c) => c.stav === 'zamitnuto')

  const zalozit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (api.ocistiKod(kod).length !== 8 || hleda) return

    setHleda(true)
    const nalez = await api.najdiPodleKodu(kod)

    if (nalez.stav !== 'nalezen') {
      setHleda(false)
      rekni(
        nalez.stav === 'vlastni'
          ? 'To je tvůj vlastní kód.'
          : nalez.stav === 'chyba'
            ? (nalez.chyba ?? 'Nepovedlo se to.')
            : 'Takový kód nikomu nepatří.'
      )
      return
    }

    const v = await api.zalozTajnyChat(nalez.profil.id)
    setHleda(false)

    if (v.ok) {
      setKod('')
      rekni('Pozvánka do tajného chatu odeslána.')
      await tajnyStav.obnovit()
    } else {
      // Databáze tady odmítne i cíl bez VIP/moderátora/admina — chyba()
      // vrátí přesně tuhle hlášku ze SQL výjimky (zaloz_tajny_chat).
      rekni(v.chyba ?? 'Nepovedlo se to.')
    }
  }

  return (
    <div className="social-panel">
      <section className="social-card">
        <span className="social-card-label">
          <SocialIcon name="lock" size={13} /> ZALOŽIT TAJNÝ CHAT
        </span>
        <p className="social-hint">
          Jen mezi VIP, moderátory a adminy. End-to-end šifrované, zprávy samy
          mizí — časovač nastavíš uvnitř chatu.
        </p>
        <form className="social-add-row" onSubmit={zalozit}>
          <input
            className="social-input"
            placeholder="ABCD-2345"
            value={kod}
            maxLength={9}
            onChange={(e) => setKod(api.formatujKod(api.ocistiKod(e.target.value)))}
          />
          <button
            className="social-btn"
            type="submit"
            disabled={hleda || api.ocistiKod(kod).length !== 8}
          >
            {hleda ? '…' : 'Pozvat'}
          </button>
        </form>
      </section>

      {cekajiciNaMe.length > 0 && (
        <section className="social-card">
          <span className="social-card-label">ČEKÁ NA TEBE ({cekajiciNaMe.length})</span>
          {cekajiciNaMe.map((c) => (
            <div key={c.id} className="social-row">
              <SocialAvatar id={c.druhy.id} jmeno={c.druhy.displayName} pulzuje />
              <span className="social-row-name">{c.druhy.displayName}</span>
              <button
                className="social-icon-btn social-icon-btn--ano"
                aria-label="Přijmout"
                onClick={async () => {
                  const v = await api.potvrdTajnyChat(c.id, true)
                  if (v.ok) {
                    rekni('Tajný chat je aktivní.')
                    await tajnyStav.obnovit()
                  } else {
                    rekni(v.chyba ?? 'Nepovedlo se to.')
                  }
                }}
              >
                <SocialIcon name="check" size={16} />
              </button>
              <button
                className="social-icon-btn social-icon-btn--ne"
                aria-label="Odmítnout"
                onClick={async () => {
                  const v = await api.potvrdTajnyChat(c.id, false)
                  if (v.ok) await tajnyStav.obnovit()
                  else rekni(v.chyba ?? 'Nepovedlo se to.')
                }}
              >
                <SocialIcon name="x" size={16} />
              </button>
            </div>
          ))}
        </section>
      )}

      {cekajiciOdMe.length > 0 && (
        <section className="social-card">
          <span className="social-card-label">ČEKÁ NA DRUHOU STRANU ({cekajiciOdMe.length})</span>
          {cekajiciOdMe.map((c) => (
            <div key={c.id} className="social-row">
              <SocialAvatar id={c.druhy.id} jmeno={c.druhy.displayName} />
              <span className="social-row-name">{c.druhy.displayName}</span>
              <span className="social-hlaseni-stav">Čeká na potvrzení</span>
            </div>
          ))}
        </section>
      )}

      {zamitnute.length > 0 && (
        <section className="social-card">
          <span className="social-card-label">ZAMÍTNUTÉ ({zamitnute.length})</span>
          {zamitnute.map((c) => (
            <div key={c.id} className="social-row">
              <SocialAvatar id={c.druhy.id} jmeno={c.druhy.displayName} tlumeny />
              <span className="social-row-name">{c.druhy.displayName}</span>
              <span className="social-hlaseni-stav">Zamítnuto</span>
            </div>
          ))}
          <p className="social-hint">Zkus to znovu — pozvi znovu jeho kódem výš.</p>
        </section>
      )}

      <section className="social-card">
        <span className="social-card-label">TAJNÉ CHATY ({aktivni.length})</span>

        {aktivni.length === 0 ? (
          <p className="social-empty-note">
            Zatím žádný. Pozvi někoho jeho kódem výš.
          </p>
        ) : (
          aktivni.map((c) => (
            <button key={c.id} className="social-row social-row--chat" onClick={() => onOtevrit(c.id)}>
              <SocialAvatar id={c.druhy.id} jmeno={c.druhy.displayName} />
              <span className="social-chat-text">
                <span className="social-chat-nazev">{c.druhy.displayName}</span>
                <span className="social-chat-nahled">Tajný chat</span>
              </span>
            </button>
          ))
        )}
      </section>
    </div>
  )
}
