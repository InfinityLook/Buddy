import React, { useMemo, useState } from 'react'
import { SocialIcon } from './SocialIcon'
import { SocialAvatar } from './SocialAvatar'
import * as api from '../api'
import { normalizeText } from '@/core/utils/text'
import type { SocialStav } from '../useSocial'

interface Props {
  stav: SocialStav
  onOtevritChat: (chatId: string) => void
}

const casKratce = (iso: string | null): string => {
  if (!iso) return ''

  const kdy = new Date(iso)
  const dnes = new Date()
  const rozdilMinut = Math.round((dnes.getTime() - kdy.getTime()) / 60000)
  const stejnyDen = kdy.toDateString() === dnes.toDateString()

  // Čerstvá zpráva dostane relativní čas — "před 5 min" se přečte
  // rychleji než hodiny, a přesně u toho, co se dá stihnout přečíst
  // ještě za tepla, na tom nejvíc záleží. Starší zprávy dostanou přesný
  // čas nebo datum, kde by "před 6 h" už bylo míň užitečné než "14:20".
  if (rozdilMinut < 1) return 'teď'
  if (rozdilMinut < 60) return `před ${rozdilMinut} min`

  return stejnyDen
    ? kdy.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
    : kdy.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
}

export const ChatyPanel: React.FC<Props> = ({ stav, onOtevritChat }) => {
  const [zakladaSkupinu, setZakladaSkupinu] = useState(false)
  const [nazev, setNazev] = useState('')
  const [vybrani, setVybrani] = useState<string[]>([])
  const [hledatChaty, setHledatChaty] = useState('')

  // Hledá v názvu chatu i v náhledu poslední zprávy — u skupiny s obecným
  // názvem je náhled často to jediné, podle čeho si člověk chat vybaví.
  const filtrovaneChaty = useMemo(() => {
    const dotaz = normalizeText(hledatChaty.trim())
    if (!dotaz) return stav.chaty
    return stav.chaty.filter(
      (ch) =>
        normalizeText(ch.nazev).includes(dotaz) ||
        normalizeText(ch.posledniZprava ?? '').includes(dotaz)
    )
  }, [stav.chaty, hledatChaty])

  const prepnout = (id: string) =>
    setVybrani((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))

  const zalozit = async () => {
    const v = await api.zalozitChat(vybrani, true, nazev.trim() || 'Skupina')

    if (v.ok && v.chatId) {
      setZakladaSkupinu(false)
      setNazev('')
      setVybrani([])
      await stav.obnovit()
      onOtevritChat(v.chatId)
    } else {
      stav.rekni(v.chyba ?? 'Skupinu se nepovedlo založit.')
    }
  }

  return (
    <div className="social-panel">
      <section className="social-card">
        <div className="social-card-head">
          <span className="social-card-label">SKUPINA</span>
          <button
            className="social-btn social-btn--small"
            onClick={() => setZakladaSkupinu((z) => !z)}
          >
            <SocialIcon name={zakladaSkupinu ? 'x' : 'plus'} size={14} />
            {zakladaSkupinu ? 'Zrušit' : 'Založit'}
          </button>
        </div>

        {zakladaSkupinu && (
          <>
            <input
              className="social-input social-input--full"
              placeholder="Název skupiny"
              value={nazev}
              maxLength={40}
              onChange={(e) => setNazev(e.target.value)}
            />

            {/* Do skupiny jde přidat jen přítel — hlídá to i databáze */}
            {stav.pratele.length === 0 ? (
              <p className="social-empty-note">
                Nejdřív si přidej někoho mezi přátele.
              </p>
            ) : (
              <>
                <p className="social-hint">Koho pozveš?</p>
                {stav.pratele.map((p) => (
                  <button
                    key={p.vazbaId}
                    className={`social-row social-row--volba ${
                      vybrani.includes(p.profil.id) ? 'is-vybrany' : ''
                    }`}
                    onClick={() => prepnout(p.profil.id)}
                  >
                    <SocialAvatar id={p.profil.id} jmeno={p.profil.displayName} />
                    <span className="social-row-name">{p.profil.displayName}</span>
                    {vybrani.includes(p.profil.id) && <SocialIcon name="check" size={16} />}
                  </button>
                ))}

                <button
                  className="social-btn social-btn--full"
                  disabled={vybrani.length === 0}
                  onClick={zalozit}
                >
                  Založit skupinu ({vybrani.length})
                </button>
              </>
            )}
          </>
        )}
      </section>

      <section className="social-card">
        <span className="social-card-label">CHATY ({stav.chaty.length})</span>

        {stav.chaty.length > 0 && (
          <input
            type="search"
            className="social-input social-input--full"
            placeholder="Hledat v chatech…"
            value={hledatChaty}
            onChange={(e) => setHledatChaty(e.target.value)}
          />
        )}

        {stav.chaty.length === 0 ? (
          <p className="social-empty-note">
            Zatím žádný chat. Otevři ho u někoho v seznamu přátel.
          </p>
        ) : filtrovaneChaty.length === 0 ? (
          <p className="social-empty-note">Žádný chat tomu neodpovídá.</p>
        ) : (
          filtrovaneChaty.map((ch) => (
            <button
              key={ch.id}
              className={`social-row social-row--chat ${ch.neprectene > 0 ? 'ma-neprectene' : ''}`}
              onClick={() => onOtevritChat(ch.id)}
            >
              <SocialAvatar id={ch.id} jmeno={ch.nazev} jeSkupina={ch.jeSkupina} ikona={ch.ikona} />

              <span className="social-chat-text">
                <span className="social-chat-nazev">{ch.nazev}</span>
                <span className="social-chat-nahled">
                  {ch.posledniZprava ?? 'Zatím bez zpráv'}
                </span>
              </span>

              <span className="social-chat-meta">
                <span className="social-chat-cas">{casKratce(ch.posledniCas)}</span>
                {ch.neprectene > 0 && (
                  <span className="social-odznak">{ch.neprectene}</span>
                )}
              </span>
            </button>
          ))
        )}
      </section>
    </div>
  )
}
