import React, { useEffect, useState } from 'react'
import { SocialIcon } from './SocialIcon'
import * as api from '../api'
import type { Hlaseni } from '../types'
import type { SocialStav } from '../useSocial'

interface Props {
  stav: SocialStav
}

const cas = (iso: string) =>
  new Date(iso).toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

// ==========================================
// Vyřizování hlášení.
//
// Do téhle chvíle se hlášení zapisovalo do tabulky, kterou nemělo kdo
// číst — nahlásit obtěžování znamenalo totéž co zablokovat. Panel vidí
// jen ten, komu roli moderátora přidělila správa; kdo si stav přepíše
// v prohlížeči, uvidí prázdný seznam, protože cizí hlášení mu databáze
// nevydá.
// ==========================================

export const ModeracePanel: React.FC<Props> = ({ stav }) => {
  const [hlaseni, setHlaseni] = useState<Hlaseni[]>([])
  const [nacita, setNacita] = useState(true)
  const [jenNevyrizena, setJenNevyrizena] = useState(true)

  const nacti = async () => {
    setHlaseni(await api.nactiHlaseni())
    setNacita(false)
  }

  useEffect(() => {
    void nacti()
  }, [])

  const vyridit = async (id: string, vysledek: 'vyreseno' | 'zamitnuto') => {
    const v = await api.vyriditHlaseni(id, vysledek)
    stav.rekni(v.ok ? 'Hlášení vyřízeno.' : v.chyba ?? 'Nepovedlo se to.')
    if (v.ok) await nacti()
  }

  const zobrazena = jenNevyrizena
    ? hlaseni.filter((h) => h.stav === 'nevyrizeno')
    : hlaseni

  const cekajicich = hlaseni.filter((h) => h.stav === 'nevyrizeno').length

  return (
    <div className="social-panel">
      <section className="social-card">
        <div className="social-card-head">
          <span className="social-card-label">
            {stav.moderator ? `HLÁŠENÍ (${cekajicich} čeká)` : 'MOJE HLÁŠENÍ'}
          </span>
          <button
            className="social-btn social-btn--small social-btn--tlumene"
            onClick={() => setJenNevyrizena((v) => !v)}
          >
            {jenNevyrizena ? 'Zobrazit vše' : 'Jen nevyřízená'}
          </button>
        </div>

        {!stav.moderator && (
          <p className="social-hint">
            Tady vidíš, co jsi nahlásil a jak to dopadlo. Cizí hlášení
            vyřizuje správa aplikace.
          </p>
        )}

        {nacita ? (
          <p className="social-empty-note">Načítám…</p>
        ) : zobrazena.length === 0 ? (
          <p className="social-empty-note">
            {jenNevyrizena ? 'Nic nečeká na vyřízení.' : 'Žádná hlášení.'}
          </p>
        ) : (
          zobrazena.map((h) => (
            <article key={h.id} className={`social-hlaseni is-${h.stav}`}>
              <div className="social-hlaseni-head">
                <span className="social-hlaseni-duvod">{api.popisDuvodu(h.duvod)}</span>
                <span className="social-hlaseni-cas">{cas(h.createdAt)}</span>
              </div>

              <p className="social-hlaseni-kdo">
                {stav.moderator && h.hlasil ? (
                  <>
                    <strong>{h.hlasil.displayName}</strong> nahlásil{' '}
                    <strong>{h.nahlaseny?.displayName ?? 'neznámého'}</strong>
                  </>
                ) : (
                  <>Nahlásil/a jsi <strong>{h.nahlaseny?.displayName ?? 'neznámého'}</strong></>
                )}
              </p>

              {/* Text nahlášené zprávy. Bez něj nemá moderátor podle čeho
                  rozhodnout — a databáze mu ho vydá jen u nahlášených. */}
              {h.zprava && <blockquote className="social-hlaseni-zprava">{h.zprava}</blockquote>}
              {h.poznamka && <p className="social-hlaseni-poznamka">„{h.poznamka}"</p>}

              {h.stav === 'nevyrizeno' ? (
                stav.moderator ? (
                  <div className="social-hlaseni-akce">
                    <button
                      className="social-btn social-btn--small"
                      onClick={() => vyridit(h.id, 'vyreseno')}
                    >
                      <SocialIcon name="check" size={13} />
                      Vyřešeno
                    </button>
                    <button
                      className="social-btn social-btn--small social-btn--tlumene"
                      onClick={() => vyridit(h.id, 'zamitnuto')}
                    >
                      <SocialIcon name="x" size={13} />
                      Zamítnout
                    </button>
                  </div>
                ) : (
                  <span className="social-hlaseni-stav">Čeká na vyřízení</span>
                )
              ) : (
                <span className="social-hlaseni-stav">
                  {h.stav === 'vyreseno' ? '✅ Vyřešeno' : '⛔ Zamítnuto'}
                  {h.vyrizenoAt && ` · ${cas(h.vyrizenoAt)}`}
                </span>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  )
}
