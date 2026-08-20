import React, { useEffect, useRef, useState } from 'react'
import { useBuddyVoice } from './useBuddyVoice'
import './BuddyOverlay.css'

interface Props {
  voice: ReturnType<typeof useBuddyVoice>
  onZavrit: () => void
}

const POPIS_STAVU: Record<string, string> = {
  necinny: 'Klepni na kolečko a mluv.',
  posloucha: 'Poslouchám…',
  premysli: 'Buddy přemýšlí…',
  mluvi: 'Buddy mluví…',
  chyba: '',
}

export const BuddyOverlay: React.FC<Props> = ({ voice, onZavrit }) => {
  const { stav, zpravy, chybaText, podporujeRozpoznavani, zacniMluvit, posliText } = voice
  const [psanyText, setPsanyText] = useState('')
  const konecRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    konecRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [zpravy])

  const odeslatPsany = (e: React.FormEvent) => {
    e.preventDefault()
    if (!psanyText.trim()) return
    posliText(psanyText)
    setPsanyText('')
  }

  const mikrofonZakazan = stav === 'posloucha' || stav === 'premysli'

  return (
    <div className="buddy-overlay">
      <div className="buddy-scrim" onClick={onZavrit} />

      <div className="buddy-panel">
        <header className="buddy-header">
          <span className="buddy-header-title">✦ Buddy</span>
          <button className="buddy-close-btn" onClick={onZavrit} aria-label="Zavřít Buddyho">
            ✕
          </button>
        </header>

        <div className="buddy-prepis">
          {zpravy.length === 0 && (
            <p className="buddy-uvod">
              Ahoj, jsem Buddy. Klepni na kolečko dole a zeptej se mě na cokoliv — ze školy i mimo
              ni.
            </p>
          )}

          {zpravy.map((z) => (
            <div key={z.id} className={`buddy-bublina-obal ${z.odesilatel === 'uzivatel' ? 'je-moje' : ''}`}>
              <div className={`buddy-bublina ${z.odesilatel === 'uzivatel' ? 'je-moje' : ''}`}>
                {z.text}
              </div>
            </div>
          ))}

          <div ref={konecRef} />
        </div>

        <div className="buddy-ovladani">
          <p className={`buddy-stav-text ${stav === 'chyba' ? 'je-chyba' : ''}`}>
            {stav === 'chyba' ? chybaText : POPIS_STAVU[stav]}
          </p>

          {podporujeRozpoznavani && (
            <button
              className={`buddy-mic-btn buddy-mic-btn--${stav}`}
              onClick={zacniMluvit}
              disabled={mikrofonZakazan}
              aria-label="Mluvit s Buddym"
            >
              🎙️
            </button>
          )}

          <form className="buddy-psani" onSubmit={odeslatPsany}>
            <input
              className="buddy-psani-input"
              placeholder={podporujeRozpoznavani ? 'Nebo napiš zprávu…' : 'Napiš zprávu Buddymu…'}
              value={psanyText}
              maxLength={500}
              onChange={(e) => setPsanyText(e.target.value)}
              disabled={stav === 'posloucha' || stav === 'premysli'}
            />
            <button
              className="buddy-psani-btn"
              type="submit"
              disabled={!psanyText.trim() || stav === 'posloucha' || stav === 'premysli'}
            >
              ➤
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
