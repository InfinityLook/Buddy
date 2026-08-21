import React, { useEffect, useState } from 'react'
import { nactiChybyAplikace } from '../api'
import { APP_BUILD_ID } from '@/core/utils/registerSW'
import type { ChybaAplikace } from '../types'

const STRANKA = 50

const cas = (iso: string) =>
  new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

// ==========================================
// Systém — chyby zachycené přímo v prohlížeči (window.onerror,
// unhandledrejection), viz core/utils/errorReporting.ts. Na rozdíl od
// "Aplikace" v Přehledu (živé parametry TÉHLE relace admina) je tohle
// historie napříč všemi uživateli, kterým appka doopravdy spadla.
// ==========================================

export const SystemPanel: React.FC = () => {
  const [chyby, setChyby] = useState<ChybaAplikace[]>([])
  const [nacita, setNacita] = useState(true)
  const [nactiVice, setNactiVice] = useState(false)
  const [vseNacteno, setVseNacteno] = useState(false)

  useEffect(() => {
    void (async () => {
      setChyby(await nactiChybyAplikace(STRANKA, 0))
      setNacita(false)
    })()
  }, [])

  const dalsiStranka = async () => {
    setNactiVice(true)
    const dalsi = await nactiChybyAplikace(STRANKA, chyby.length)
    setChyby((s) => [...s, ...dalsi])
    if (dalsi.length < STRANKA) setVseNacteno(true)
    setNactiVice(false)
  }

  return (
    <div className="admin-prehled">
      <section className="admin-card">
        <span className="admin-card-title">Chyby aplikace</span>
        <p className="admin-empty">
          Neošetřené chyby zachycené přímo v prohlížeči uživatelů. Nejvýš 5 hlášení za jednu relaci
          stránky, ať rozbitá komponenta v nekonečné smyčce tabulku nezaplaví.
        </p>

        {nacita ? (
          <p className="admin-empty">Načítám…</p>
        ) : chyby.length === 0 ? (
          <p className="admin-empty">Zatím žádná zachycená chyba. 🎉</p>
        ) : (
          <>
            <div className="admin-report-list">
              {chyby.map((c) => (
                <article key={c.id} className="admin-report">
                  <div className="admin-report-head">
                    <span className="admin-report-cas">{cas(c.createdAt)}</span>
                    {c.buildId && (
                      <span className="admin-report-id">
                        {c.buildId}
                        {c.buildId === APP_BUILD_ID ? ' · aktuální' : ''}
                      </span>
                    )}
                  </div>
                  <p className="admin-notif-text-preview">{c.message}</p>
                  <p className="admin-empty">
                    {c.uzivatelJmeno ?? 'Neznámý uživatel'}
                    {c.url ? ` · ${c.url}` : ''}
                  </p>
                  {c.stack && <p className="admin-chyba-stack">{c.stack}</p>}
                </article>
              ))}
            </div>

            {!vseNacteno && (
              <button className="admin-btn" onClick={dalsiStranka} disabled={nactiVice}>
                {nactiVice ? 'Načítám…' : 'Načíst starší'}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  )
}
