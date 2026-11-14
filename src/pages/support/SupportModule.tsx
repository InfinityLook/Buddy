import { BuddyPage } from '@/components/buddy-ui/BuddyPage'
import { BuddyDialog } from '@/components/buddy-ui/BuddyDialog'
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
  const [chybaNacteni, setChybaNacteni] = useState(false)
  const [hlaska, setHlaska] = useState<string | null>(null)

  const nacti = async () => {
    setNacita(true)
    setChybaNacteni(false)
    try {
      setTikety(await nactiTikety())
    } catch {
      setChybaNacteni(true)
    } finally {
      setNacita(false)
    }
  }

  useEffect(() => { void nacti() }, [])

  const zalozit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!predmet.trim() || !prvniZprava.trim() || zaklada) return

    setZaklada(true)
    setHlaska(null)
    try {
      const v = await zalozitTiket(predmet, prvniZprava)
      if (!v.ok || !v.ticketId) {
        setHlaska(v.chyba ?? 'Tiket se nepodařilo odeslat.')
        return
      }
      setPredmet('')
      setPrvniZprava('')
      setNovy(false)
      setOtevrenyId(v.ticketId)
      await nacti()
    } catch {
      setHlaska('Tiket se nepodařilo odeslat.')
    } finally {
      setZaklada(false)
    }
  }

  const otevreny = tikety.find((t) => t.id === otevrenyId) ?? null

  if (otevreny) {
    return (
      <VlakloTiketu
        key={otevreny.id}
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
    <BuddyPage className="support-page" surfaceId="support" title={smiAdmin ? 'Podpora · všechny tikety' : 'Podpora'}
      backLabel="Zpět do nastavení" onBack={() => navigate('/nastaveni')}>
      {!smiAdmin && (
        <button type="button" className="buddy-ui-button buddy-ui-button--primary support-novy-btn" onClick={() => {
          setHlaska(null)
          setNovy(true)
        }}>Nový tiket</button>
      )}

      {novy && (
        <BuddyDialog surfaceId="support" title="Nový tiket" presentation="sheet"
          onClose={() => { if (!zaklada) setNovy(false) }}>
          <form className="support-form" onSubmit={zalozit} aria-busy={zaklada}>
            <label className="support-field">
              Předmět
              <input className="support-input" value={predmet} maxLength={200} required disabled={zaklada}
                onChange={event => setPredmet(event.target.value)} />
            </label>
            <label className="support-field">
              Zpráva
              <textarea className="support-textarea" value={prvniZprava} maxLength={2000} rows={4} required disabled={zaklada}
                onChange={event => setPrvniZprava(event.target.value)} />
            </label>
            {hlaska && <p className="buddy-ui-alert" role="alert">{hlaska}</p>}
            <div className="support-form-akce">
              <button type="button" className="buddy-ui-button" disabled={zaklada} onClick={() => setNovy(false)}>Zrušit</button>
              <button type="submit" className="buddy-ui-button buddy-ui-button--primary" disabled={!predmet.trim() || !prvniZprava.trim() || zaklada}>
                {zaklada ? 'Odesílám…' : 'Odeslat'}
              </button>
            </div>
          </form>
        </BuddyDialog>
      )}

      <section className="support-card">
        <h2 className="support-card-title">{smiAdmin ? 'Tikety' : 'Tvoje tikety'}</h2>

        {nacita ? (
          <p className="support-empty" role="status">Načítám tikety…</p>
        ) : chybaNacteni ? (
          <div className="buddy-ui-alert">
            <p role="alert">Tikety se nepodařilo načíst.</p>
            <button type="button" className="buddy-ui-button" onClick={() => void nacti()}>Zkusit znovu</button>
          </div>
        ) : tikety.length === 0 ? (
          <p className="support-empty">{smiAdmin ? 'Zatím žádné tikety.' : 'Zatím jsi nic nenapsal/a.'}</p>
        ) : (
          <div className="support-tiket-list">
            {tikety.map((t) => (
              <button key={t.id} className="support-tiket-radek" type="button" onClick={() => setOtevrenyId(t.id)}>
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

    </BuddyPage>
  )
}


const VlakloTiketu: React.FC<{ tiket: Tiket; smiAdmin: boolean; onZpet: () => void }> = ({ tiket, smiAdmin, onZpet }) => {
  const [zpravy, setZpravy] = useState<ZpravaTiketu[]>([])
  const [nacita, setNacita] = useState(true)
  const [text, setText] = useState('')
  const [odesila, setOdesila] = useState(false)
  const [vyrizuje, setVyrizuje] = useState(false)
  const [stav, setStav] = useState(tiket.status)
  const vlakno = useRef<HTMLDivElement>(null)
  const [chybaNacteni, setChybaNacteni] = useState(false)
  const [chybaAkce, setChybaAkce] = useState<string | null>(null)
  const [pokus, setPokus] = useState(0)

  useEffect(() => {
    let live = true
    setNacita(true)
    setChybaNacteni(false)
    void nactiZpravyTiketu(tiket.id).then(loaded => {
      if (live) setZpravy(current => [...loaded, ...current.filter(message => !loaded.some(item => item.id === message.id))])
    }).catch(() => {
      if (live) setChybaNacteni(true)
    }).finally(() => {
      if (live) setNacita(false)
    })
    const unsubscribe = sledovatZpravyTiketu(tiket.id, message => setZpravy(current => (
      current.some(item => item.id === message.id) ? current : [...current, message]
    )))
    return () => {
      live = false
      unsubscribe()
    }
  }, [tiket.id, pokus])

  useEffect(() => {
    if (vlakno.current) vlakno.current.scrollTop = vlakno.current.scrollHeight
  }, [zpravy.length, chybaNacteni])

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || odesila) return

    setOdesila(true)
    setChybaAkce(null)
    try {
      const v = await poslatZpravuTiketu(tiket.id, text, smiAdmin)
      if (!v.ok) {
        setChybaAkce(v.chyba ?? 'Zprávu se nepodařilo odeslat.')
        return
      }
      setText('')
      if (!smiAdmin) setStav('otevreny')
      setPokus(value => value + 1)
    } catch {
      setChybaAkce('Zprávu se nepodařilo odeslat.')
    } finally {
      setOdesila(false)
    }
  }

  const prepnoutStav = async () => {
    if (vyrizuje) return
    const novy = stav === 'otevreny' ? 'vyrizeny' : 'otevreny'
    setVyrizuje(true)
    setChybaAkce(null)
    try {
      const v = await vyriditTiket(tiket.id, novy)
      if (v.ok) setStav(novy)
      else setChybaAkce(v.chyba ?? 'Stav se nepodařilo změnit.')
    } catch {
      setChybaAkce('Stav se nepodařilo změnit.')
    } finally {
      setVyrizuje(false)
    }
  }

  return (
    <BuddyPage surfaceId="support-conversation" className="support-page support-page--vlakno"
      title={tiket.subject} backLabel="Zpět na tikety" onBack={onZpet}>
      <p className="support-subtitle">
        {tiket.uzivatelJmeno && <>{tiket.uzivatelJmeno} · </>}
        <span role="status" className={`support-stav support-stav--${stav}`}>{stav === 'otevreny' ? 'Otevřený' : 'Vyřízený'}</span>
      </p>
      <div className="support-vlakno" ref={vlakno} role="log" aria-label="Zprávy podpory">
        {nacita && zpravy.length === 0 ? (
          <p className="support-empty" role="status">Načítám zprávy…</p>
        ) : chybaNacteni ? (
          <div className="buddy-ui-alert">
            <p role="alert">Zprávy se nepodařilo načíst.</p>
            <button type="button" className="buddy-ui-button" onClick={() => setPokus(value => value + 1)}>Zkusit znovu</button>
          </div>
        ) : zpravy.length === 0 ? (
          <p className="support-empty">V tiketu zatím nejsou zprávy.</p>
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
      </div>

      {smiAdmin && (
        <button className="support-btn support-btn--tlumene" onClick={prepnoutStav} disabled={vyrizuje}>
          {stav === 'otevreny' ? '✓ Označit jako vyřízené' : '↺ Otevřít znovu'}
        </button>
      )}

      {chybaAkce && <p className="buddy-ui-alert" role="alert">{chybaAkce}</p>}
      <form className="support-odpoved-form" onSubmit={odeslat}>
        <input
          className="support-input"
          type="text"
          aria-label="Odpověď"
          placeholder="Napiš odpověď…"
          disabled={odesila}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="support-btn support-btn--ano" type="submit" disabled={!text.trim() || odesila}>
          {odesila ? '…' : 'Poslat'}
        </button>
      </form>
    </BuddyPage>
  )
}

export default SupportModule
