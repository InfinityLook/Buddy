import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { nactiTikety, nactiZpravyTiketu, poslatZpravuTiketu, sledovatZpravyTiketu, vyriditTiket, zalozitTiket } from '@/core/support/api'
import type { Tiket, ZpravaTiketu } from '@/core/support/types'
import { useHasPermission } from '@/core/role'
import './SupportModule.css'

const cas = (iso: string) =>
  new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

// ==========================================
// Podpora — uživatel si založí tiket a píše si s podporou ve vlákně.
// Admin vidí stejnou obrazovku, jen mu RLS pustí i cizí tikety
// (core/support/api.ts slouží oběma pohledům stejnými funkcemi).
//
// Žádná vlastní brána — /podpora je jako /social a /hra, stačí
// přihlášení, kontroluje se jen v App.tsx.
// ==========================================

export const SupportModule: React.FC = () => {
  const navigate = useNavigate()
  const smiAdmin = useHasPermission('admin.panel')

  const [tikety, setTikety] = useState<Tiket[]>([])
  const [nacita, setNacita] = useState(true)
  const [otevrenyId, setOtevrenyId] = useState<string | null>(null)
  const [novy, setNovy] = useState(false)
  const [predmet, setPredmet] = useState('')
  const [prvniZprava, setPrvniZprava] = useState('')
  const [zaklada, setZaklada] = useState(false)
  const [hlaska, setHlaska] = useState<string | null>(null)

  const nacti = async () => setTikety(await nactiTikety())

  useEffect(() => {
    void (async () => {
      await nacti()
      setNacita(false)
    })()
  }, [])

  const oznam = (t: string) => {
    setHlaska(t)
    window.setTimeout(() => setHlaska(null), 2800)
  }

  const zalozit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!predmet.trim() || !prvniZprava.trim() || zaklada) return

    setZaklada(true)
    const v = await zalozitTiket(predmet, prvniZprava)
    setZaklada(false)

    if (!v.ok || !v.ticketId) {
      oznam(v.chyba ?? 'Nepovedlo se to.')
      return
    }

    setPredmet('')
    setPrvniZprava('')
    setNovy(false)
    await nacti()
    setOtevrenyId(v.ticketId)
  }

  const otevreny = tikety.find((t) => t.id === otevrenyId) ?? null

  if (otevreny) {
    return (
      <VlakloTiketu
        tiket={otevreny}
        smiAdmin={smiAdmin}
        onZpet={() => {
          setOtevrenyId(null)
          void nacti()
        }}
      />
    )
  }

  return (
    <div className="support-page">
      <div className="support-top-bar">
        <button className="support-back-btn" onClick={() => navigate('/nastaveni')}>
          ← Zpět do nastavení
        </button>
        <h1 className="support-title">{smiAdmin ? 'Podpora — všechny tikety' : 'Podpora'}</h1>
        <p className="support-subtitle">
          {smiAdmin ? 'Tikety od všech uživatelů, nejnovější aktivita nahoře.' : 'Máš dotaz nebo problém? Napiš nám.'}
        </p>
      </div>

      {!smiAdmin && (
        <section className="support-card">
          {novy ? (
            <form className="support-form" onSubmit={zalozit}>
              <input
                className="support-input"
                type="text"
                placeholder="Předmět (např. Nejde mi otevřít Flashcards)"
                value={predmet}
                maxLength={200}
                onChange={(e) => setPredmet(e.target.value)}
              />
              <textarea
                className="support-textarea"
                placeholder="Popiš, co se děje…"
                value={prvniZprava}
                maxLength={2000}
                rows={4}
                onChange={(e) => setPrvniZprava(e.target.value)}
              />
              <div className="support-form-akce">
                <button type="button" className="support-btn support-btn--tlumene" onClick={() => setNovy(false)}>
                  Zrušit
                </button>
                <button type="submit" className="support-btn support-btn--ano" disabled={!predmet.trim() || !prvniZprava.trim() || zaklada}>
                  {zaklada ? 'Zakládám…' : 'Odeslat'}
                </button>
              </div>
            </form>
          ) : (
            <button className="support-btn support-btn--ano support-novy-btn" onClick={() => setNovy(true)}>
              ✉️ Nový tiket
            </button>
          )}
        </section>
      )}

      <section className="support-card">
        <span className="support-card-title">{smiAdmin ? 'Tikety' : 'Tvoje tikety'}</span>

        {nacita ? (
          <p className="support-empty">Načítám…</p>
        ) : tikety.length === 0 ? (
          <p className="support-empty">{smiAdmin ? 'Zatím žádné tikety.' : 'Zatím jsi nic nenapsal/a.'}</p>
        ) : (
          <div className="support-tiket-list">
            {tikety.map((t) => (
              <button key={t.id} className="support-tiket-radek" onClick={() => setOtevrenyId(t.id)}>
                <span className="support-tiket-hlavicka">
                  <strong>{t.subject}</strong>
                  <span className={`support-stav support-stav--${t.status}`}>
                    {t.status === 'otevreny' ? 'Otevřený' : 'Vyřízený'}
                  </span>
                </span>
                <span className="support-tiket-meta">
                  {t.uzivatelJmeno && <>{t.uzivatelJmeno} · </>}
                  {cas(t.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {hlaska && <div className="support-toast">{hlaska}</div>}
    </div>
  )
}

const VlakloTiketu: React.FC<{ tiket: Tiket; smiAdmin: boolean; onZpet: () => void }> = ({ tiket, smiAdmin, onZpet }) => {
  const [zpravy, setZpravy] = useState<ZpravaTiketu[]>([])
  const [nacita, setNacita] = useState(true)
  const [text, setText] = useState('')
  const [odesila, setOdesila] = useState(false)
  const [vyrizuje, setVyrizuje] = useState(false)
  const [stav, setStav] = useState(tiket.status)
  const konec = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void (async () => {
      setZpravy(await nactiZpravyTiketu(tiket.id))
      setNacita(false)
    })()

    return sledovatZpravyTiketu(tiket.id, (z) => setZpravy((s) => (s.some((x) => x.id === z.id) ? s : [...s, z])))
  }, [tiket.id])

  useEffect(() => {
    konec.current?.scrollIntoView({ behavior: 'smooth' })
  }, [zpravy.length])

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || odesila) return

    setOdesila(true)
    const v = await poslatZpravuTiketu(tiket.id, text, smiAdmin)
    setOdesila(false)

    if (v.ok) {
      setText('')
      // Nespoléhat jen na realtime echo vlastní zprávy zpátky — stejný
      // důvod jako u ChatView.tsx v Socialu: dokud se odběr nepřipojí
      // (nebo síť realtime nedovolí), odesílatel by svou vlastní zprávu
      // ve vlákně neviděl vůbec.
      setZpravy(await nactiZpravyTiketu(tiket.id))
      // Zrcadlí trigger oznac_ticket_po_zprave(): zpráva od uživatele
      // (ne od podpory) tiket v databázi mlčky znovu otevře.
      if (!smiAdmin) setStav('otevreny')
    }
  }

  const prepnoutStav = async () => {
    const novy = stav === 'otevreny' ? 'vyrizeny' : 'otevreny'
    setVyrizuje(true)
    const v = await vyriditTiket(tiket.id, novy)
    setVyrizuje(false)
    if (v.ok) setStav(novy)
  }

  return (
    <div className="support-page support-page--vlakno">
      <div className="support-top-bar">
        <button className="support-back-btn" onClick={onZpet}>
          ← Zpět na tikety
        </button>
        <h1 className="support-title">{tiket.subject}</h1>
        <p className="support-subtitle">
          {tiket.uzivatelJmeno && <>{tiket.uzivatelJmeno} · </>}
          <span className={`support-stav support-stav--${stav}`}>{stav === 'otevreny' ? 'Otevřený' : 'Vyřízený'}</span>
        </p>
      </div>

      <div className="support-vlakno">
        {nacita ? (
          <p className="support-empty">Načítám…</p>
        ) : (
          zpravy.map((z) => (
            <div key={z.id} className={`support-bublina-obal ${z.jeOdPodpory ? 'je-podpora' : ''}`}>
              <div className={`support-bublina ${z.jeOdPodpory ? 'je-podpora' : ''}`}>
                <span className="support-bublina-text">{z.text}</span>
                <span className="support-bublina-cas">{cas(z.createdAt)}</span>
              </div>
            </div>
          ))
        )}
        <div ref={konec} />
      </div>

      {smiAdmin && (
        <button className="support-btn support-btn--tlumene" onClick={prepnoutStav} disabled={vyrizuje}>
          {stav === 'otevreny' ? '✓ Označit jako vyřízené' : '↺ Otevřít znovu'}
        </button>
      )}

      <form className="support-odpoved-form" onSubmit={odeslat}>
        <input
          className="support-input"
          type="text"
          placeholder="Napiš odpověď…"
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="support-btn support-btn--ano" type="submit" disabled={!text.trim() || odesila}>
          {odesila ? '…' : 'Poslat'}
        </button>
      </form>
    </div>
  )
}

export default SupportModule
