import React, { useState } from 'react'
import { SocialIcon } from './SocialIcon'
import { SocialAvatar } from './SocialAvatar'
import * as api from '../api'
import { IKONY_SKUPIN, type Chat } from '../types'
import type { SocialStav } from '../useSocial'

interface Props {
  chat: Chat
  stav: SocialStav
  onZavrit: () => void
}

// Přejmenovat smí kterýkoli člen (hlídá RLS na chats), odebrat někoho
// jiného jen zakladatel (odebrat_ze_skupiny se ujistí sama) — proto se
// tlačítko na odebrání zobrazí, jen když se zakladatelId shoduje s mujId.
// Vlastní odchod ze skupiny řeší existující tlačítko "Opustit chat"
// v hlavičce, tady se schválně neopakuje.
export const SpravaSkupinyDialog: React.FC<Props> = ({ chat, stav, onZavrit }) => {
  const [nazev, setNazev] = useState(chat.nazev)
  const [ukladaNazev, setUkladaNazev] = useState(false)
  const [pridavaId, setPridavaId] = useState<string | null>(null)
  const [odebiraId, setOdebiraId] = useState<string | null>(null)
  const [nastavujeIkonu, setNastavujeIkonu] = useState(false)

  const jsemZakladatel = stav.mujId === chat.zakladatelId

  const ulozitNazev = async () => {
    if (nazev.trim() === chat.nazev || !nazev.trim()) return
    setUkladaNazev(true)
    await stav.provest(() => api.prejmenovatSkupinu(chat.id, nazev), 'Skupina přejmenována.')
    setUkladaNazev(false)
  }

  const vybratIkonu = async (ikona: string | null) => {
    if (ikona === chat.ikona || nastavujeIkonu) return
    setNastavujeIkonu(true)
    await stav.provest(() => api.nastavIkonuSkupiny(chat.id, ikona), 'Ikona nastavena.')
    setNastavujeIkonu(false)
  }

  const pridat = async (uzivatelId: string) => {
    setPridavaId(uzivatelId)
    await stav.provest(() => api.pridatDoSkupiny(chat.id, uzivatelId), 'Přidáno do skupiny.')
    setPridavaId(null)
  }

  const odebrat = async (uzivatelId: string, jmeno: string) => {
    if (!window.confirm(`Odebrat „${jmeno}“ ze skupiny?`)) return
    setOdebiraId(uzivatelId)
    await stav.provest(() => api.odebratZeSkupiny(chat.id, uzivatelId), `${jmeno} odebrán/a.`)
    setOdebiraId(null)
  }

  const clenoveIds = new Set(chat.ucastnici.map((u) => u.id))
  const priteleKPridani = stav.pratele.filter((p) => !clenoveIds.has(p.profil.id))

  return (
    <>
      <div className="social-overlay" onClick={onZavrit} />
      <div className="social-dialog">
        <h3 className="social-dialog-title">Spravovat skupinu</h3>

        <span className="social-card-label">NÁZEV</span>
        <div className="social-add-row">
          <input
            className="social-input"
            value={nazev}
            maxLength={40}
            onChange={(e) => setNazev(e.target.value)}
          />
          <button
            className="social-btn social-btn--small"
            onClick={ulozitNazev}
            disabled={ukladaNazev || !nazev.trim() || nazev.trim() === chat.nazev}
          >
            Uložit
          </button>
        </div>

        <span className="social-card-label">IKONA</span>
        <div className="social-ikony-mrizka">
          <button
            className={`social-ikona-volba ${chat.ikona === null ? 'is-vybrana' : ''}`}
            aria-label="Bez ikony (#)"
            disabled={nastavujeIkonu}
            onClick={() => vybratIkonu(null)}
          >
            #
          </button>
          {IKONY_SKUPIN.map((ikona) => (
            <button
              key={ikona}
              className={`social-ikona-volba ${chat.ikona === ikona ? 'is-vybrana' : ''}`}
              aria-label={`Ikona ${ikona}`}
              disabled={nastavujeIkonu}
              onClick={() => vybratIkonu(ikona)}
            >
              {ikona}
            </button>
          ))}
        </div>

        <span className="social-card-label">ČLENOVÉ ({chat.ucastnici.length + 1})</span>
        <div className="social-row">
          <SocialAvatar id={stav.mujId ?? ''} jmeno="Ty" />
          <span className="social-row-name">
            Ty {chat.zakladatelId === stav.mujId && '· zakladatel/ka'}
          </span>
        </div>
        {chat.ucastnici.map((u) => (
          <div key={u.id} className="social-row">
            <SocialAvatar id={u.id} jmeno={u.displayName} />
            <span className="social-row-name">
              {u.displayName} {chat.zakladatelId === u.id && '· zakladatel/ka'}
            </span>
            {jsemZakladatel && chat.zakladatelId !== u.id && (
              <button
                className="social-icon-btn social-icon-btn--ne"
                aria-label={`Odebrat ${u.displayName}`}
                disabled={odebiraId === u.id}
                onClick={() => odebrat(u.id, u.displayName)}
              >
                <SocialIcon name="x" size={16} />
              </button>
            )}
          </div>
        ))}

        {priteleKPridani.length > 0 && (
          <>
            <span className="social-card-label">PŘIDAT PŘÍTELE</span>
            {priteleKPridani.map((p) => (
              <div key={p.vazbaId} className="social-row">
                <SocialAvatar id={p.profil.id} jmeno={p.profil.displayName} />
                <span className="social-row-name">{p.profil.displayName}</span>
                <button
                  className="social-icon-btn social-icon-btn--ano"
                  aria-label={`Přidat ${p.profil.displayName}`}
                  disabled={pridavaId === p.profil.id}
                  onClick={() => pridat(p.profil.id)}
                >
                  <SocialIcon name="plus" size={16} />
                </button>
              </div>
            ))}
          </>
        )}

        <div className="social-dialog-akce">
          <button className="social-btn social-btn--tlumene" onClick={onZavrit}>
            Zavřít
          </button>
        </div>
      </div>
    </>
  )
}
