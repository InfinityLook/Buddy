import React, { useEffect, useState } from 'react'
import { nactiOznameni, poslatOznameni, smazatOznameni } from '@/core/notifications/api'
import type { Oznameni } from '@/core/notifications/types'

const MAX_DELKA = 500

const cas = (iso: string) =>
  new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

// ==========================================
// Oznámení pro všechny — na update, soutěže apod.
//
// Odesláním se řádek objeví v core/notifications a odtud ho vyzvedne
// zvonek v Profilu/rozcestníku aplikací u KAŽDÉHO přihlášeného, živě
// přes stejný Realtime kanál. Panel je jen tenké okno do
// core/notifications/api.ts — žádná logika navíc, ať zůstane pravda,
// že ten soubor je jediné místo, které s tabulkou oznameni mluví.
// ==========================================

export const NotifikacePanel: React.FC = () => {
  const [seznam, setSeznam] = useState<Oznameni[]>([])
  const [text, setText] = useState('')
  const [odesila, setOdesila] = useState(false)
  const [nacita, setNacita] = useState(true)
  const [hlaska, setHlaska] = useState<string | null>(null)

  const nacti = async () => {
    setSeznam(await nactiOznameni())
    setNacita(false)
  }

  useEffect(() => {
    void nacti()
  }, [])

  const oznam = (t: string) => {
    setHlaska(t)
    window.setTimeout(() => setHlaska(null), 2800)
  }

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || odesila) return

    setOdesila(true)
    const v = await poslatOznameni(text)
    setOdesila(false)

    oznam(v.ok ? 'Oznámení odesláno všem.' : v.chyba ?? 'Nepovedlo se to.')
    if (v.ok) {
      setText('')
      await nacti()
    }
  }

  const smazat = async (id: string) => {
    if (!window.confirm('Smazat tohle oznámení? Zmizí i těm, kdo ho ještě nečetli.')) return
    const v = await smazatOznameni(id)
    oznam(v.ok ? 'Smazáno.' : v.chyba ?? 'Nepovedlo se to.')
    if (v.ok) await nacti()
  }

  return (
    <div className="admin-prehled">
      <section className="admin-card">
        <span className="admin-card-title">Nové oznámení</span>
        <p className="admin-empty">
          Uvidí ho každý přihlášený uživatel ve zvonku upozornění — na update, soutěž a podobně.
        </p>

        <form className="admin-notif-form" onSubmit={odeslat}>
          <textarea
            className="admin-notif-textarea"
            placeholder="Např. Vyšla nová verze appky s hlasovým Buddym! 🎉"
            value={text}
            maxLength={MAX_DELKA}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
          <div className="admin-notif-form-foot">
            <span className="admin-notif-pocitadlo">{text.length} / {MAX_DELKA}</span>
            <button className="admin-btn admin-btn--ano" type="submit" disabled={!text.trim() || odesila}>
              {odesila ? 'Odesílám…' : '📣 Odeslat všem'}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <span className="admin-card-title">Poslední oznámení</span>

        {nacita ? (
          <p className="admin-empty">Načítám…</p>
        ) : seznam.length === 0 ? (
          <p className="admin-empty">Zatím nic nebylo odesláno.</p>
        ) : (
          <div className="admin-report-list">
            {seznam.map((o) => (
              <article key={o.id} className="admin-report">
                <div className="admin-report-head">
                  <span className="admin-report-cas">{cas(o.createdAt)}</span>
                  <button
                    className="admin-icon-btn"
                    aria-label="Smazat oznámení"
                    onClick={() => smazat(o.id)}
                  >
                    🗑
                  </button>
                </div>
                <p className="admin-notif-text-preview">{o.text}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {hlaska && <div className="admin-toast">{hlaska}</div>}
    </div>
  )
}
