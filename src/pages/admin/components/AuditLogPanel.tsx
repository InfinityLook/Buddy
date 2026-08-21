import React, { useEffect, useState } from 'react'
import { nactiAuditLog } from '../api'
import type { AuditLogRadek } from '../types'

const STRANKA = 50

const cas = (iso: string) =>
  new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

/** Čitelné popisky pro akce zapisované `zapis_audit_log()` — viz migrace
 *  audit_log_admin_akci. Neznámý kód (např. po budoucím přidání akce,
 *  než se sem doplní popisek) se zobrazí syrový, ne jako prázdno. */
const POPIS_AKCE: Record<string, string> = {
  ban_social: 'Zákaz Socialu',
  unban_social: 'Zrušení zákazu Socialu',
  ban_app: 'Zákaz celé appky',
  unban_app: 'Zrušení zákazu appky',
  vyridit_hlaseni: 'Vyřízení hlášení',
  poslat_oznameni: 'Odeslání oznámení',
  smazat_oznameni: 'Smazání oznámení',
}

/** Detail je volný jsonb — zobrazí se jen pár známých klíčů čitelně,
 *  zbytek se schová, ať se panel nezaplní syrovým JSONem. */
const popisDetailu = (detail: Record<string, unknown> | null): string | null => {
  if (!detail) return null
  const vysledek = typeof detail.vysledek === 'string' ? detail.vysledek : null
  const text = typeof detail.text === 'string' ? detail.text : null
  if (vysledek) return `Výsledek: ${vysledek}`
  if (text) return `„${text}“`
  return null
}

// ==========================================
// Audit log — kdo z adminů/moderátorů co udělal a kdy. Čte se přes
// nacti_audit_log(), admin-gated stejně jako zbytek Přehledu; zápisy
// sem nejdou z tohohle souboru vůbec, viz komentář v api.ts.
// ==========================================

export const AuditLogPanel: React.FC = () => {
  const [zaznamy, setZaznamy] = useState<AuditLogRadek[]>([])
  const [nacita, setNacita] = useState(true)
  const [nactiVice, setNactiVice] = useState(false)
  const [vseNacteno, setVseNacteno] = useState(false)

  useEffect(() => {
    void (async () => {
      setZaznamy(await nactiAuditLog(STRANKA, 0))
      setNacita(false)
    })()
  }, [])

  const dalsiStranka = async () => {
    setNactiVice(true)
    const dalsi = await nactiAuditLog(STRANKA, zaznamy.length)
    setZaznamy((s) => [...s, ...dalsi])
    if (dalsi.length < STRANKA) setVseNacteno(true)
    setNactiVice(false)
  }

  return (
    <div className="admin-prehled">
      <section className="admin-card">
        <span className="admin-card-title">Audit log</span>
        <p className="admin-empty">
          Historie privilegovaných akcí administrátorů a moderátorů — bany, vyřízená hlášení, oznámení.
        </p>

        {nacita ? (
          <p className="admin-empty">Načítám…</p>
        ) : zaznamy.length === 0 ? (
          <p className="admin-empty">Zatím žádné záznamy.</p>
        ) : (
          <>
            <div className="admin-report-list">
              {zaznamy.map((z) => (
                <article key={z.id} className="admin-report">
                  <div className="admin-report-head">
                    <span className="admin-report-cas">{cas(z.vytvorenoV)}</span>
                  </div>
                  <p className="admin-notif-text-preview">
                    <strong>{z.adminJmeno ?? 'Neznámý admin'}</strong> — {POPIS_AKCE[z.akce] ?? z.akce}
                    {z.cilJmeno && <> · cíl: {z.cilJmeno}</>}
                  </p>
                  {popisDetailu(z.detail) && (
                    <p className="admin-notif-text-preview">{popisDetailu(z.detail)}</p>
                  )}
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
