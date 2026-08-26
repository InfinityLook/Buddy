import React, { useEffect, useRef, useState } from 'react'
import { SocialIcon } from './SocialIcon'
import { NahlasitDialog } from './NahlasitDialog'
import * as api from '../api'
import type { Chat, Zprava } from '../types'
import type { SocialStav } from '../useSocial'
import { requestNotificationPermission } from '@/core/utils/notify'

interface Props {
  chat: Chat
  stav: SocialStav
  onZpet: () => void
}

const cas = (iso: string) =>
  new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })

export const ChatView: React.FC<Props> = ({ chat, stav, onZpet }) => {
  const [zpravy, setZpravy] = useState<Zprava[]>([])
  const [text, setText] = useState('')
  const [posila, setPosila] = useState(false)
  // Ikona odeslání se na chvíli překlopí na fajfku — drobné potvrzení
  // přímo u tlačítka, než zpráva stihne dorazit přes realtime.
  const [odeslano, setOdeslano] = useState(false)
  const [nahlasit, setNahlasit] = useState<{ userId: string; zpravaId?: string } | null>(null)
  const konecRef = useRef<HTMLDivElement>(null)

  // Načtení a živý odběr. Odběr se ruší při odchodu — bez toho by po
  // každém otevření chatu zůstal viset další otevřený kanál.
  useEffect(() => {
    let platne = true

    void api.nactiZpravy(chat.id).then((z) => {
      if (platne) setZpravy(z)
    })
    void api.oznacitPrecteno(chat.id)

    const zrusit = api.sledovatChat(chat.id, (nova) => {
      setZpravy((stare) => {
        // Realtime posílá i změny (smazání), ne jen nové zprávy
        const i = stare.findIndex((z) => z.id === nova.id)
        if (i === -1) return [...stare, nova]

        const kopie = [...stare]
        kopie[i] = nova
        return kopie
      })
      void api.oznacitPrecteno(chat.id)
    })

    return () => {
      platne = false
      zrusit()
      void stav.obnovit()
    }
    // stav.obnovit se mění s identitou účtu, ne s každým vykreslením
  }, [chat.id, stav.obnovit])

  useEffect(() => {
    konecRef.current?.scrollIntoView({ block: 'end' })
  }, [zpravy])

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (posila || !text.trim()) return

    // Synchronně, ještě před prvním await — odeslání zprávy je nejjasnější
    // gesto "chci vědět, až mi někdo odepíše", a mimo tenhle gestový
    // řetězec by prohlížeč dialog o svolení odmítl zobrazit (viz Pomodoro/
    // Planer, core/utils/notify.ts).
    requestNotificationPermission()

    setPosila(true)
    const vysledek = await api.poslatZpravu(chat.id, text)
    setPosila(false)

    if (vysledek.ok) {
      setText('')
      setOdeslano(true)
      window.setTimeout(() => setOdeslano(false), 900)
      // Vlastní zprávu doplní realtime; kdyby se odběr nestihl navázat,
      // načtení ji dorovná.
      setZpravy(await api.nactiZpravy(chat.id))
    } else {
      stav.rekni(vysledek.chyba ?? 'Zpráva neodešla.')
    }
  }

  return (
    <div className="social-chat-view">
      <header className="social-chat-header">
        <button className="social-icon-btn" onClick={onZpet} aria-label="Zpět na chaty">
          <SocialIcon name="arrow-left" size={18} />
        </button>

        <span className="social-chat-title">
          {chat.nazev}
          {chat.jeSkupina && (
            <span className="social-chat-pocet">{chat.ucastnici.length + 1} lidí</span>
          )}
        </span>

        <button
          className="social-icon-btn social-icon-btn--ne"
          aria-label="Opustit chat"
          onClick={async () => {
            const ok = await stav.provest(() => api.opustitChat(chat.id), 'Chat opuštěn.')
            if (ok) onZpet()
          }}
        >
          <SocialIcon name="leave" size={17} />
        </button>
      </header>

      <div className="social-zpravy">
        {zpravy.length === 0 && (
          <p className="social-empty-note social-empty-note--stred">
            Zatím tu nikdo nic nenapsal. Začni.
          </p>
        )}

        {zpravy.map((z) => {
          const moje = z.odesilatelId === stav.mujId
          const smazana = z.smazanoAt !== null
          const odesilatel = chat.ucastnici.find((u) => u.id === z.odesilatelId)

          return (
            <div key={z.id} className={`social-bublina-obal ${moje ? 'je-moje' : ''}`}>
              {/* Ve skupině je potřeba vědět, kdo píše */}
              {chat.jeSkupina && !moje && (
                <span className="social-bublina-jmeno">
                  {odesilatel?.displayName ?? 'Neznámý'}
                </span>
              )}

              <div className={`social-bublina ${moje ? 'je-moje' : ''} ${smazana ? 'je-smazana' : ''}`}>
                <span className="social-bublina-text">{z.text}</span>
                <span className="social-bublina-cas">{cas(z.createdAt)}</span>
              </div>

              {!smazana && (
                <div className="social-bublina-akce">
                  {moje ? (
                    <button
                      className="social-mini-btn"
                      onClick={async () => {
                        const v = await api.smazatZpravu(z.id)
                        if (v.ok) setZpravy(await api.nactiZpravy(chat.id))
                        else stav.rekni(v.chyba ?? 'Smazat se nepovedlo.')
                      }}
                    >
                      <SocialIcon name="trash" size={12} />
                      Smazat
                    </button>
                  ) : (
                    <button
                      className="social-mini-btn"
                      onClick={() => setNahlasit({ userId: z.odesilatelId, zpravaId: z.id })}
                    >
                      <SocialIcon name="flag" size={12} />
                      Nahlásit
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <div ref={konecRef} />
      </div>

      <form className="social-psani" onSubmit={odeslat}>
        <input
          className="social-input social-input--zprava"
          placeholder="Napiš zprávu…"
          value={text}
          maxLength={4000}
          onChange={(e) => setText(e.target.value)}
          disabled={posila}
        />
        <button
          className={`social-send-btn ${odeslano ? 'je-odeslano' : ''}`}
          type="submit"
          disabled={posila || !text.trim()}
        >
          <SocialIcon name={odeslano ? 'check' : 'send'} size={18} />
        </button>
      </form>

      {nahlasit && (
        <NahlasitDialog
          userId={nahlasit.userId}
          zpravaId={nahlasit.zpravaId}
          stav={stav}
          onZavrit={() => setNahlasit(null)}
        />
      )}
    </div>
  )
}
