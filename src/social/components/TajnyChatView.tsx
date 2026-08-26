import React, { useEffect, useRef, useState } from 'react'
import { SocialIcon } from './SocialIcon'
import * as api from '../api'
import type { TajnaZprava, TajnyChat } from '../types'

interface Props {
  chat: TajnyChat
  mujId: string | null
  rekni: (text: string) => void
  onZpet: () => void
}

const cas = (iso: string) =>
  new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })

// ==========================================
// Rozhovor v tajném chatu.
//
// Vědomě chudší než ChatView.tsx — žádné mazání/nahlašování zpráv, žádná
// přítomnost/psaní, žádné opuštění chatu. Nic z toho pro tenhle rozsah
// nebylo požadované a zprávy tu samy mizí za 48 h, takže "smazat ručně"
// řeší jen o málo dřív totéž, co udělá čas sám.
// ==========================================

export const TajnyChatView: React.FC<Props> = ({ chat, mujId, rekni, onZpet }) => {
  const [zpravy, setZpravy] = useState<TajnaZprava[]>([])
  const [text, setText] = useState('')
  const [posila, setPosila] = useState(false)
  const konecRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let platne = true

    // Líný úklid při každém otevření — viz komentář u
    // vycistiExpirovaneTajneZpravy v api.ts, chyba se schválně ignoruje.
    void api.vycistiExpirovaneTajneZpravy()

    void api.nactiTajneZpravy(chat.id).then((z) => {
      if (platne) setZpravy(z)
    })

    const zrusit = api.sledovatTajnyChat(chat.id, (nova) => {
      setZpravy((stare) => (stare.some((z) => z.id === nova.id) ? stare : [...stare, nova]))
    })

    return () => {
      platne = false
      zrusit()
    }
  }, [chat.id])

  useEffect(() => {
    konecRef.current?.scrollIntoView({ block: 'end' })
  }, [zpravy])

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (posila || !text.trim()) return

    setPosila(true)
    const v = await api.posliTajnouZpravu(chat.id, text)
    setPosila(false)

    if (v.ok && v.zprava) {
      setText('')
      setZpravy((s) => (s.some((z) => z.id === v.zprava?.id) ? s : [...s, v.zprava as TajnaZprava]))
    } else {
      // Sem spadne i "Oprávnění na tajný chat mezitím vypršelo." — třeba
      // VIP mezitím vypršelo. Databázová hláška je dost srozumitelná
      // sama o sobě, není co k ní dodávat.
      rekni(v.chyba ?? 'Zpráva neodešla.')
    }
  }

  return (
    <div className="social-chat-view">
      <header className="social-chat-header">
        <button className="social-icon-btn" onClick={onZpet} aria-label="Zpět na tajné chaty">
          <SocialIcon name="arrow-left" size={18} />
        </button>

        <span className="social-chat-title">
          <span className="social-chat-nazev-radek">
            <SocialIcon name="lock" size={14} />
            {chat.druhy.displayName}
          </span>
        </span>
      </header>

      <p className="social-hint social-hint--tajny">
        Zprávy tady mizí 48 hodin po odeslání.
      </p>

      <div className="social-zpravy">
        {zpravy.length === 0 && (
          <p className="social-empty-note social-empty-note--stred">
            Zatím tu nikdo nic nenapsal. Začni.
          </p>
        )}

        {zpravy.map((z) => {
          const moje = z.odesilatelId === mujId

          return (
            <div key={z.id} className={`social-bublina-obal ${moje ? 'je-moje' : ''}`}>
              <div className={`social-bublina ${moje ? 'je-moje' : ''}`}>
                <span className="social-bublina-text">{z.text}</span>
                <span className="social-bublina-cas">{cas(z.createdAt)}</span>
              </div>
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
        <button className="social-send-btn" type="submit" disabled={posila || !text.trim()}>
          <SocialIcon name="send" size={18} />
        </button>
      </form>
    </div>
  )
}
