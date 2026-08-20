import React, { useEffect, useState } from 'react'
import * as socialApi from '@/social/api'
import type { Hlaseni } from '@/social/types'

// ==========================================
// Hlášení ze Socialu, admin verze.
//
// Data i logika vyřízení jsou beze změny z social/api.ts — je to jediné
// místo, které smí mluvit se Supabase (viz komentář tam), takže se
// odsud jen volá, nekopíruje. Tenhle panel navíc u každého hlášení
// ukazuje syrové id nahlášeného, ne jen jméno — to jméno slouží
// budoucímu banu, který se dodělá později (viz zadání), a to potřebuje
// id, ne zobrazované jméno, které si každý smí kdykoliv změnit.
// ==========================================

const cas = (iso: string) =>
  new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

export const SocialReportPanel: React.FC = () => {
  const [hlaseni, setHlaseni] = useState<Hlaseni[]>([])
  const [nacita, setNacita] = useState(true)
  const [jenNevyrizena, setJenNevyrizena] = useState(true)
  const [hlaska, setHlaska] = useState<string | null>(null)

  const nacti = async () => {
    setHlaseni(await socialApi.nactiHlaseni())
    setNacita(false)
  }

  useEffect(() => {
    void nacti()
  }, [])

  const oznam = (text: string) => {
    setHlaska(text)
    window.setTimeout(() => setHlaska(null), 2800)
  }

  const vyridit = async (id: string, vysledek: 'vyreseno' | 'zamitnuto') => {
    const v = await socialApi.vyriditHlaseni(id, vysledek)
    oznam(v.ok ? 'Hlášení vyřízeno.' : v.chyba ?? 'Nepovedlo se to.')
    if (v.ok) await nacti()
  }

  const zobrazena = jenNevyrizena ? hlaseni.filter((h) => h.stav === 'nevyrizeno') : hlaseni
  const cekajicich = hlaseni.filter((h) => h.stav === 'nevyrizeno').length

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <span className="admin-card-title">SocialReport ({cekajicich} čeká)</span>
        <button className="admin-btn admin-btn--tlumene" onClick={() => setJenNevyrizena((v) => !v)}>
          {jenNevyrizena ? 'Zobrazit vše' : 'Jen nevyřízená'}
        </button>
      </div>

      {nacita ? (
        <p className="admin-empty">Načítám…</p>
      ) : zobrazena.length === 0 ? (
        <p className="admin-empty">{jenNevyrizena ? 'Nic nečeká na vyřízení.' : 'Žádná hlášení.'}</p>
      ) : (
        <div className="admin-report-list">
          {zobrazena.map((h) => (
            <article key={h.id} className={`admin-report is-${h.stav}`}>
              <div className="admin-report-head">
                <span className="admin-report-duvod">{socialApi.popisDuvodu(h.duvod)}</span>
                <span className="admin-report-cas">{cas(h.createdAt)}</span>
              </div>

              <p className="admin-report-radek">
                <strong>{h.hlasil?.displayName ?? 'Neznámý'}</strong>
                <span className="admin-report-id">{h.hlasil?.id ?? '—'}</span>
                nahlásil
                <strong>{h.nahlaseny?.displayName ?? 'neznámého'}</strong>
                <span className="admin-report-id">{h.nahlaseny?.id ?? '—'}</span>
              </p>

              {h.poznamka && <p className="admin-report-poznamka">„{h.poznamka}“</p>}
              {h.zprava && <p className="admin-report-zprava">Nahlášená zpráva: „{h.zprava}“</p>}

              {h.stav === 'nevyrizeno' ? (
                <div className="admin-report-akce">
                  <button className="admin-btn admin-btn--ano" onClick={() => vyridit(h.id, 'vyreseno')}>
                    ✓ Vyřešeno
                  </button>
                  <button className="admin-btn admin-btn--ne" onClick={() => vyridit(h.id, 'zamitnuto')}>
                    ✕ Zamítnout
                  </button>
                </div>
              ) : (
                <span className={`admin-report-stav admin-report-stav--${h.stav}`}>
                  {h.stav === 'vyreseno' ? 'Vyřešeno' : 'Zamítnuto'}
                  {h.vyrizenoAt ? ` · ${cas(h.vyrizenoAt)}` : ''}
                </span>
              )}
            </article>
          ))}
        </div>
      )}

      {hlaska && <div className="admin-toast">{hlaska}</div>}
    </section>
  )
}
