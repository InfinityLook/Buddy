import type { SurfaceId } from '@/features/appearance/themeCatalog'
import { CommunityDialog } from './CommunityDialog'
import React, { useState } from 'react'
import * as api from '../api'
import { DUVODY, type DuvodNahlaseni } from '../types'
import type { SocialStav } from '../useSocial'

interface Props {
  surfaceId?: SurfaceId
  userId: string
  zpravaId?: string
  /** Nahlašuje se příspěvek, ne zpráva/profil — obojí ("zpravaId" i
   *  toto) najednou nikdy nenastane. */
  postId?: string
  stav: SocialStav
  onZavrit: () => void
}

// Nahlášení je vedle blokování schválně: blok jen schová, hlášení
// nechá stopu. Bez něj by o obtěžování nikdo nikdy nevěděl.
export const NahlasitDialog: React.FC<Props> = ({ surfaceId = 'social-home', userId, zpravaId, postId, stav, onZavrit }) => {
  const [duvod, setDuvod] = useState<DuvodNahlaseni>('obtezovani')
  const [poznamka, setPoznamka] = useState('')
  const [taky, setTaky] = useState(true)
  const [odesila, setOdesila] = useState(false)
  const [chyba, setChyba] = useState<string | null>(null)

  const odeslat = async () => {
    setOdesila(true)
    setChyba(null)

    const v = await api.nahlasit(userId, duvod, poznamka, zpravaId, postId)
    if (!v.ok) {
      setOdesila(false)
      setChyba(v.chyba ?? 'Nahlásit se nepovedlo.')
      return
    }

    const blok = taky ? await api.zablokovat(userId) : null

    setOdesila(false)
    onZavrit()
    await stav.obnovit()
    stav.rekni(blok ? blok.ok ? 'Nahlášeno a zablokováno.' : 'Nahlášeno. Účet se nepodařilo zablokovat.' : 'Nahlášeno.')
  }

  return (
    <CommunityDialog title="Nahlásit" surfaceId={surfaceId} onClose={() => { if (!odesila) onZavrit() }}>
      <p className="social-dialog-sub">
        Hlášení si přečte správa aplikace. Napiš, co se stalo.
      </p>

      <div className="social-duvody" role="group" aria-label="Důvod nahlášení">
        {DUVODY.map((d) => (
          <button
            key={d.id}
            className={`social-duvod ${duvod === d.id ? 'is-vybrany' : ''}`}
            type="button"
            aria-pressed={duvod === d.id}
            onClick={() => setDuvod(d.id)}
          >
            {d.popis}
          </button>
        ))}
      </div>

      <textarea
        className="social-textarea"
        aria-label="Poznámka k nahlášení"
        placeholder="Popiš to vlastními slovy (nepovinné)"
        value={poznamka}
        maxLength={1000}
        onChange={(e) => setPoznamka(e.target.value)}
      />

      <label className="social-checkbox">
        <input type="checkbox" checked={taky} onChange={(e) => setTaky(e.target.checked)} />
        <span>Zároveň ho zablokovat</span>
      </label>

      {chyba && <p className="buddy-ui-alert" role="alert">{chyba}</p>}
      <div className="social-dialog-akce">
        <button className="social-btn social-btn--tlumene" onClick={onZavrit} disabled={odesila}>
          Zrušit
        </button>
        <button className="social-btn" onClick={odeslat} disabled={odesila}>
          {odesila ? 'Odesílám…' : 'Odeslat'}
        </button>
      </div>
    </CommunityDialog>
  )
}
