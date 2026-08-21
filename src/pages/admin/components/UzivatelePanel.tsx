import React, { useEffect, useState } from 'react'
import * as adminApi from '../api'
import { ROLE_REGISTRY, VIP_DURATIONS } from '@/core/role'
import { NASTAVITELNE_ROLE, NastavitelnaRole, UcetRadek } from '../types'

const STRANKA = 30

const formatDo = (iso: string | null) =>
  iso ? `do ${new Date(iso).toLocaleDateString('cs-CZ')}` : 'natrvalo'

// ==========================================
// Uživatelé — procházení/hledání účtů a změna role, mimo kontext
// jednoho konkrétního hlášení (na rozdíl od SocialReportPanelu, kde
// se ban vždycky váže na už existující hlášení). Bany (Social i celá
// appka) jsou beze změny stejné funkce z api.ts jako v SocialReportu
// — panel je jen znovu použije pro libovolný účet.
// ==========================================

export const UzivatelePanel: React.FC = () => {
  const [ucty, setUcty] = useState<UcetRadek[]>([])
  const [hledat, setHledat] = useState('')
  const [nacita, setNacita] = useState(true)
  const [socialBany, setSocialBany] = useState<Set<string>>(new Set())
  const [appBany, setAppBany] = useState<Record<string, boolean>>({})
  const [hlaska, setHlaska] = useState<string | null>(null)
  const [vseNacteno, setVseNacteno] = useState(false)
  const [nactiVice, setNactiVice] = useState(false)

  const oznam = (t: string) => {
    setHlaska(t)
    window.setTimeout(() => setHlaska(null), 2800)
  }

  const nacti = async (dotaz: string) => {
    setNacita(true)
    const [u, b] = await Promise.all([adminApi.nactiUcty(dotaz, STRANKA, 0), adminApi.nactiSocialBany()])
    setUcty(u)
    setSocialBany(b)
    setVseNacteno(u.length < STRANKA)
    setAppBany(await adminApi.nactiAppBanStavy(u.map((r) => r.id)))
    setNacita(false)
  }

  useEffect(() => {
    void nacti('')
  }, [])

  const hledej = (e: React.FormEvent) => {
    e.preventDefault()
    void nacti(hledat)
  }

  const dalsiStranka = async () => {
    setNactiVice(true)
    const dalsi = await adminApi.nactiUcty(hledat, STRANKA, ucty.length)
    setUcty((s) => [...s, ...dalsi])
    const dalsiAppBany = await adminApi.nactiAppBanStavy(dalsi.map((r) => r.id))
    setAppBany((s) => ({ ...s, ...dalsiAppBany }))
    if (dalsi.length < STRANKA) setVseNacteno(true)
    setNactiVice(false)
  }

  const zmenitRoli = async (ucet: UcetRadek, role: NastavitelnaRole) => {
    if (role === ucet.role) return
    const platiDo = role === 'vip' ? new Date(Date.now() + VIP_DURATIONS.month * 86400_000).toISOString() : null

    const v = await adminApi.nastavRoli(ucet.id, role, platiDo)
    oznam(v.ok ? `${ucet.displayName} má teď roli ${ROLE_REGISTRY[role].title}.` : v.chyba ?? 'Nepovedlo se to.')
    if (v.ok) setUcty((s) => s.map((u) => (u.id === ucet.id ? { ...u, role, validUntil: platiDo } : u)))
  }

  const prepnoutBan = async (ucet: UcetRadek, zabanovat: boolean) => {
    const v = await adminApi.zabanujZeSocial(ucet.id, zabanovat)
    oznam(v.ok ? `${ucet.displayName} — Social ${zabanovat ? 'zakázán' : 'povolen'}.` : v.chyba ?? 'Nepovedlo se to.')
    if (v.ok) setSocialBany((s) => new Set(zabanovat ? [...s, ucet.id] : [...s].filter((id) => id !== ucet.id)))
  }

  const prepnoutAppBan = async (ucet: UcetRadek, zabanovat: boolean) => {
    if (zabanovat && !window.confirm(`Opravdu zabanovat ${ucet.displayName} z celé aplikace?`)) return

    const v = await adminApi.zabanujCelouAppku(ucet.id, zabanovat)
    oznam(v.ok ? `${ucet.displayName} — appka ${zabanovat ? 'zakázána' : 'povolena'}.` : v.chyba ?? 'Nepovedlo se to.')
    if (v.ok) setAppBany((s) => ({ ...s, [ucet.id]: zabanovat }))
  }

  return (
    <div className="admin-prehled">
      <section className="admin-card">
        <span className="admin-card-title">Uživatelé</span>
        <form className="admin-hledat-form" onSubmit={hledej}>
          <input
            className="admin-hledat-input"
            type="text"
            placeholder="Jméno, kód přítele nebo id…"
            value={hledat}
            onChange={(e) => setHledat(e.target.value)}
          />
          <button className="admin-btn" type="submit">Hledat</button>
        </form>

        {nacita ? (
          <p className="admin-empty">Načítám…</p>
        ) : ucty.length === 0 ? (
          <p className="admin-empty">Nikdo nenalezen.</p>
        ) : (
          <>
            <div className="admin-report-list">
              {ucty.map((u) => (
                <article key={u.id} className="admin-report">
                  <div className="admin-report-head">
                    <span>
                      <strong>{u.displayName}</strong>{' '}
                      <span className="admin-report-id">{u.friendCode}</span>
                    </span>
                    <span className="admin-report-cas">
                      Lv {u.level} · {u.xp} XP · 🔥 {u.streakDays}
                    </span>
                  </div>

                  <div className="admin-role-toggle">
                    {NASTAVITELNE_ROLE.map((r) => (
                      <button
                        key={r}
                        className={r === u.role ? 'active' : ''}
                        onClick={() => zmenitRoli(u, r)}
                        title={r === 'vip' ? `VIP na ${VIP_DURATIONS.month} dní` : ROLE_REGISTRY[r].title}
                      >
                        {ROLE_REGISTRY[r].icon} {ROLE_REGISTRY[r].title}
                      </button>
                    ))}
                  </div>
                  {u.role !== 'user' && (
                    <p className="admin-empty">Role platí {formatDo(u.validUntil)}.</p>
                  )}

                  <div className="admin-report-akce">
                    {socialBany.has(u.id) ? (
                      <button className="admin-btn admin-btn--ano" onClick={() => prepnoutBan(u, false)}>
                        ✓ Zase povolit Social
                      </button>
                    ) : (
                      <button className="admin-btn admin-btn--ne" onClick={() => prepnoutBan(u, true)}>
                        ⛔ Zakázat Social
                      </button>
                    )}

                    {appBany[u.id] ? (
                      <button className="admin-btn admin-btn--ano" onClick={() => prepnoutAppBan(u, false)}>
                        ✓ Zase povolit appku
                      </button>
                    ) : (
                      <button className="admin-btn admin-btn--zavazne" onClick={() => prepnoutAppBan(u, true)}>
                        🚫 Zakázat celou appku
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {!vseNacteno && (
              <button className="admin-btn" onClick={dalsiStranka} disabled={nactiVice}>
                {nactiVice ? 'Načítám…' : 'Načíst další'}
              </button>
            )}
          </>
        )}
      </section>

      {hlaska && <div className="admin-toast">{hlaska}</div>}
    </div>
  )
}
