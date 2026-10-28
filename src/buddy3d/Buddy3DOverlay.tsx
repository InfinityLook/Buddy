import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BuddyActor } from './BuddyActor'
import { ScreenBuddyController } from './ScreenBuddyController'
import { BUDDY_THEMES, type Buddy3DThemeId, type BuddyVoicePort } from './types'
import './buddy3d.css'

export interface Buddy3DOverlayProps {
  voice: BuddyVoicePort
  onZavrit: () => void
  /** Pass the resolved theme from the application's ONE existing appearance store. */
  themeId?: Buddy3DThemeId
  /** Pass import.meta.env.BASE_URL when Vite uses a path other than /. */
  baseUrl?: string
  autoRoam?: boolean
}
const STATUS = { necinny: 'Jsem tady. Co spolu vymyslíme?', posloucha: 'Poslouchám…', premysli: 'Přemýšlím…', mluvi: 'Mluvím…', chyba: 'Zkusíme to znovu?' }

/** Mount this once when the existing AI button is clicked. No new AI service or API key. */
export function Buddy3DOverlay({ voice, onZavrit, themeId = 'zlaty-soumrak', baseUrl = '/', autoRoam = true }: Buddy3DOverlayProps) {
  const host = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), hit = useRef<HTMLButtonElement>(null)
  const actor = useRef<BuddyActor | null>(null), movement = useRef<ScreenBuddyController | null>(null)
  const input = useRef<HTMLInputElement>(null), messages = useRef<HTMLDivElement>(null)
  const voiceRef = useRef(voice); voiceRef.current = voice
  const closeRef = useRef(onZavrit); closeRef.current = onZavrit
  const [panel, setPanel] = useState(false), [text, setText] = useState('')
  const [loaded, setLoaded] = useState(false), [renderError, setRenderError] = useState('')
  const [reduced, setReduced] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  const palette = BUDDY_THEMES[themeId]
  const busy = voice.stav === 'premysli' || voice.stav === 'posloucha'
  const close = () => { voiceRef.current.zastavit(); closeRef.current() }

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media.matches); media.addEventListener('change', change)
    return () => { media.removeEventListener('change', change); voiceRef.current.zastavit(); previousFocus?.focus({ preventScroll: true }) }
  }, [])
  useEffect(() => {
    if (!host.current || !canvas.current || !hit.current) return
    try {
      const instance = new BuddyActor(canvas.current, { baseUrl, reducedMotion: reduced, onReady: () => { setLoaded(true); setRenderError('') }, onError: error => { setRenderError(error.message); setLoaded(false) } })
      const controller = new ScreenBuddyController(host.current, hit.current, instance, { autoRoam, reducedMotion: reduced })
      actor.current = instance; movement.current = controller
      instance.setVoiceState(voiceRef.current.stav)
      return () => { controller.dispose(); instance.dispose(); if (actor.current === instance) actor.current = null; if (movement.current === controller) movement.current = null }
    } catch { setRenderError('Tento přístroj právě neumí zobrazit 3D Buddyho. Můžeme si dál psát.'); setLoaded(false) }
    // The theme, conversation and motion preferences are updated below without making another WebGL context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, autoRoam])
  useEffect(() => { if (actor.current) { setLoaded(false); void actor.current.setTheme(themeId) } }, [themeId, baseUrl, autoRoam])
  useEffect(() => { actor.current?.setVoiceState(voice.stav); movement.current?.setPaused(panel || voice.stav !== 'necinny') }, [voice.stav, panel])
  useEffect(() => { actor.current?.setReducedMotion(reduced); movement.current?.setReducedMotion(reduced) }, [reduced])
  useEffect(() => { movement.current?.setPanel(panel ? document.getElementById('buddy3d-chat') : null); if (panel) input.current?.focus({ preventScroll: true }) }, [panel])
  useEffect(() => { if (messages.current) messages.current.scrollTop = messages.current.scrollHeight }, [voice.zpravy.length, voice.stav, panel])
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); if (panel) setPanel(false); else close() } }
    document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel])
  const send = (event: React.FormEvent) => { event.preventDefault(); const value = text.trim(); if (!value || busy) return; voice.posliText(value); setText('') }
  const rootStyle = { '--b3-accent': palette.accent, '--b3-panel': palette.panel, '--b3-text': palette.text } as React.CSSProperties
  const fallback = `${baseUrl.replace(/\/?$/, '/')}buddy-3d/posters/buddy-${themeId}.png`

  return createPortal(<div className="buddy3d-root" data-buddy3d-theme={themeId} data-chat-open={panel} style={rootStyle}>
    <div className="buddy3d-puppet" ref={host}>
      <div className="buddy3d-status" aria-live="polite" aria-atomic="true">{STATUS[voice.stav]}</div>
      <canvas ref={canvas} aria-hidden="true" className={renderError ? 'buddy3d-hidden' : undefined} />
      {renderError && <img className="buddy3d-poster" src={fallback} alt="Buddy" onError={event => { event.currentTarget.style.visibility = 'hidden' }} />}
      {!loaded && !renderError && <span className="buddy3d-loading" role="status">Buddy přichází…</span>}
      <button ref={hit} className="buddy3d-hit" aria-label="Buddy. Přetáhni pro přesun, dvakrát klepni pro skok. Šipky pro chůzi a J pro skok." />
      <div className="buddy3d-tools">
        <button onClick={() => setPanel(p => !p)} aria-expanded={panel} aria-controls="buddy3d-chat">Chat</button>
        <button onClick={() => actor.current?.play('Jump')} disabled={voice.stav !== 'necinny' || !!renderError} aria-label="Buddy skočí">Skok</button>
        <button onClick={close} aria-label="Skrýt Buddyho">×</button>
      </div>
    </div>
    {panel && <section id="buddy3d-chat" className="buddy3d-chat" role="dialog" aria-modal="false" aria-label="Rozhovor s Buddym">
      <header><span><i /> Buddy</span><div><button onClick={close} aria-label="Skrýt celého Buddyho">Skrýt Buddyho</button><button onClick={() => setPanel(false)} aria-label="Zavřít panel rozhovoru">×</button></div></header>
      <div className="buddy3d-messages" ref={messages} aria-label="Historie rozhovoru">
        {voice.zpravy.length === 0 && <p className="buddy3d-welcome">Ahoj! Jsem tady s tebou. Napiš mi nebo klepni na mikrofon.</p>}
        {voice.zpravy.map(message => <div key={message.id} className={`buddy3d-message${message.odesilatel === 'uzivatel' ? ' buddy3d-message--mine' : ''}`}><small>{message.odesilatel === 'uzivatel' ? 'Ty' : 'Buddy'}</small><p>{message.text}</p></div>)}
      </div>
      <p className="buddy3d-chat-status" role={voice.stav === 'chyba' ? 'alert' : 'status'}>{voice.stav === 'chyba' ? voice.chybaText ?? STATUS.chyba : STATUS[voice.stav]}</p>
      {renderError && <p className="buddy3d-render-note">{renderError}</p>}
      <form onSubmit={send} className="buddy3d-compose"><label className="buddy3d-sr-only" htmlFor="buddy3d-text">Zpráva pro Buddyho</label><input id="buddy3d-text" ref={input} value={text} maxLength={500} onChange={event => setText(event.target.value)} placeholder="Napiš Buddymu…" disabled={busy} autoComplete="off" /><button type="submit" disabled={busy || !text.trim()} aria-label="Odeslat zprávu">➤</button></form>
      <div className="buddy3d-voice">{voice.podporujeRozpoznavani ? <button onClick={voice.zacniMluvit} disabled={busy}>Mluvit s Buddym</button> : <span>Hlasový vstup tu není dostupný. Můžeš psát.</span>}{voice.stav !== 'necinny' && <button onClick={voice.zastavit}>Zastavit</button>}</div>
    </section>}
  </div>, document.body)
}

export default Buddy3DOverlay
