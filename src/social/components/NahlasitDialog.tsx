import React, { useState } from 'react'
import * as api from '../api'
import { DUVODY, type DuvodNahlaseni } from '../types'
import type { SocialStav } from '../useSocial'

interface Props {
  userId: string
  zpravaId?: string
  stav: SocialStav
  onZavrit: () => void
}

// Nahlášení je vedle blokování schválně: blok jen schová, hlášení
// nechá stopu. Bez něj by o obtěžování nikdo nikdy nevěděl.
export const NahlasitDialog: React.FC<Props> = ({ userId, zpravaId, stav, onZavrit }) => {
  const [duvod, setDuvod] = useState<DuvodNahlaseni>('obtezovani')
  const [poznamka, setPoznamka] = useState('')
  const [taky, setTaky] = useState(true)
  const [odesila, setOdesila] = useState(false)

  const odeslat = async () => {
    setOdesila(true)

    const v = await api.nahlasit(userId, duvod, poznamka, zpravaId)
    if (!v.ok) {
      setOdesila(false)
      stav.rekni(v.chyba ?? 'Nahlásit se nepovedlo.')
      return
    }

    if (taky) await api.zablokovat(userId)

    setOdesila(false)
    onZavrit()
    await stav.obnovit()
    stav.rekni(taky ? 'Nahlášeno a zablokováno.' : 'Nahlášeno.')
  }

  return (
    <>
      <div className="social-overlay" onClick={onZavrit} />
      <div className="social-dialog">
        <h3 className="social-dialog-title">Nahlásit</h3>
        <p className="social-dialog-sub">
          Hlášení si přečte správa aplikace. Napiš, co se stalo.
        </p>

        <div className="social-duvody">
          {DUVODY.map((d) => (
            <button
              key={d.id}
              className={`social-duvod ${duvod === d.id ? 'is-vybrany' : ''}`}
              onClick={() => setDuvod(d.id)}
            >
              {d.popis}
            </button>
          ))}
        </div>

        <textarea
          className="social-textarea"
          placeholder="Popiš to vlastními slovy (nepovinné)"
          value={poznamka}
          maxLength={1000}
          onChange={(e) => setPoznamka(e.target.value)}
        />

        <label className="social-checkbox">
          <input type="checkbox" checked={taky} onChange={(e) => setTaky(e.target.checked)} />
          <span>Zároveň ho zablokovat</span>
        </label>

        <div className="social-dialog-akce">
          <button className="social-btn social-btn--tlumene" onClick={onZavrit}>
            Zrušit
          </button>
          <button className="social-btn" onClick={odeslat} disabled={odesila}>
            {odesila ? 'Odesílám…' : 'Odeslat'}
          </button>
        </div>
      </div>
    </>
  )
}
