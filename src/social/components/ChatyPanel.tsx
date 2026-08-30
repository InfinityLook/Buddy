import React, { useMemo, useState } from 'react'
import { SocialIcon } from './SocialIcon'
import { SocialAvatar } from './SocialAvatar'
import { TajnyChatPanel } from './TajnyChatPanel'
import * as api from '../api'
import { useOnlineFriends } from '../presence'
import { normalizeText } from '@/core/utils/text'
import type { SocialStav } from '../useSocial'
import type { TajnyChatStav } from '../useTajnyChat'

interface Props {
  stav: SocialStav
  tajnyStav: TajnyChatStav
  onOtevritChat: (chatId: string) => void
  onOtevritTajnyChat: (chatId: string) => void
}

type Volba = 'chat' | 'skupina' | 'tajne'

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

/**
 * Chaty — seznam rozhovorů a "+ Nový" nad ním. Dřív tu bylo natvrdo jen
 * založení skupiny; teď je to rozcestník na tři různé začátky
 * konverzace (Chat/Skupina/Tajný chat), stejný mentální model jako
 * "nová zpráva" tužka v Messengeru/Instagramu — appka totiž dřív
 * neměla žádnou přímou cestu, jak založit 1:1 chat odsud, jen z cizího
 * profilu ("Napsat"). Tajný chat sem přibyl z Nastavení — založit/
 * otevřít ho je akce, ne nastavení, a patří vedle ostatních "začni
 * konverzaci" voleb, ne pod ozubené kolo (viz i NastaveniPanel.tsx's
 * vlastní komentář k tomu, proč tam předtím byl).
 */
export const ChatyPanel: React.FC<Props> = ({ stav, tajnyStav, onOtevritChat, onOtevritTajnyChat }) => {
  const [menu, setMenu] = useState(false)
  const [volba, setVolba] = useState<Volba | null>(null)
  const [nazev, setNazev] = useState('')
  const [vybrani, setVybrani] = useState<string[]>([])
  const [zakladaChat, setZakladaChat] = useState(false)
  const [hledatChaty, setHledatChaty] = useState('')
  const online = useOnlineFriends()

  // Žádosti o zprávy (1:1 chat od někoho, koho vzájemně nesleduju —
  // viz zaloz_chat na databázi) žijí ve stejném stav.chaty poli jako
  // běžné chaty, jen odděleně vykreslené: normální seznam by je jinak
  // vzal za obyčejnou konverzaci, kterou přehlédnutá žádost není.
  const bezneChaty = useMemo(() => stav.chaty.filter((ch) => !ch.pozadavek), [stav.chaty])
  const pozadavkoveChaty = useMemo(() => stav.chaty.filter((ch) => ch.pozadavek), [stav.chaty])

  // Hledá v názvu chatu i v náhledu poslední zprávy — u skupiny s obecným
  // názvem je náhled často to jediné, podle čeho si člověk chat vybaví.
  const filtrovaneChaty = useMemo(() => {
    const dotaz = normalizeText(hledatChaty.trim())
    if (!dotaz) return bezneChaty
    return bezneChaty.filter(
      (ch) =>
        normalizeText(ch.nazev).includes(dotaz) ||
        normalizeText(ch.posledniZprava ?? '').includes(dotaz)
    )
  }, [bezneChaty, hledatChaty])

  const zavritMenu = () => {
    setMenu(false)
    setVolba(null)
    setNazev('')
    setVybrani([])
  }

  const prepnout = (id: string) =>
    setVybrani((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))

  const zalozitSkupinu = async () => {
    const v = await api.zalozitChat(vybrani, true, nazev.trim() || 'Skupina')

    if (v.ok && v.chatId) {
      zavritMenu()
      await stav.obnovit()
      onOtevritChat(v.chatId)
    } else {
      stav.rekni(v.chyba ?? 'Skupinu se nepovedlo založit.')
    }
  }

  const zacitChat = async (prijemceId: string) => {
    if (zakladaChat) return
    setZakladaChat(true)
    const v = await api.otevritChat(prijemceId)
    setZakladaChat(false)

    if (v.ok && v.chatId) {
      zavritMenu()
      await stav.obnovit()
      onOtevritChat(v.chatId)
    } else {
      stav.rekni(v.chyba ?? 'Chat se nepovedlo otevřít.')
    }
  }

  // Tajný chat je celý vlastní panel (založení + tři seznamy podle
  // stavu pozvánky), ne formulář, co by se vešel do jedné karty jako
  // Chat/Skupina výš — appka proto místo vnořeného formuláře přepne
  // celý obsah záložky, stejný "menu → sekce s vlastním tlačítkem
  // zpět" vzor jako NastaveniPanel.tsx.
  if (volba === 'tajne') {
    return (
      <div className="social-panel">
        <button className="social-back-btn" onClick={zavritMenu}>
          ← Zpět do chatů
        </button>
        <TajnyChatPanel tajnyStav={tajnyStav} rekni={stav.rekni} onOtevrit={onOtevritTajnyChat} />
      </div>
    )
  }

  return (
    <div className="social-panel">
      <section className="social-card">
        <div className="social-card-head">
          <span className="social-card-label">NOVÁ KONVERZACE</span>
          <button
            className="social-btn social-btn--small"
            onClick={() => (menu ? zavritMenu() : setMenu(true))}
          >
            <SocialIcon name={menu ? 'x' : 'plus'} size={14} />
            {menu ? 'Zrušit' : 'Nový'}
            {!menu && tajnyStav.cekajiciNaMe > 0 && (
              <span className="social-odznak">{tajnyStav.cekajiciNaMe}</span>
            )}
          </button>
        </div>

        {menu && volba === null && (
          <div className="social-nova-volba-radek">
            <button className="social-nova-volba" onClick={() => setVolba('chat')}>
              <SocialIcon name="chat" size={18} />
              Chat
            </button>
            <button className="social-nova-volba" onClick={() => setVolba('skupina')}>
              <SocialIcon name="users" size={18} />
              Skupina
            </button>
            {tajnyStav.smim && (
              <button className="social-nova-volba" onClick={() => setVolba('tajne')}>
                <SocialIcon name="lock" size={18} />
                Tajný chat
                {tajnyStav.cekajiciNaMe > 0 && (
                  <span className="social-odznak">{tajnyStav.cekajiciNaMe}</span>
                )}
              </button>
            )}
          </div>
        )}

        {menu && volba === 'chat' && (
          <>
            {stav.pratele.length === 0 ? (
              <p className="social-empty-note">Nejdřív si přidej někoho mezi přátele.</p>
            ) : (
              <>
                <p className="social-hint">Komu napíšeš?</p>
                {stav.pratele.map((p) => (
                  <button
                    key={p.profil.id}
                    className="social-row social-row--volba"
                    disabled={zakladaChat}
                    onClick={() => zacitChat(p.profil.id)}
                  >
                    <SocialAvatar id={p.profil.id} jmeno={p.profil.displayName} avatarUrl={p.profil.avatarUrl} />
                    <span className="social-row-name">{p.profil.displayName}</span>
                  </button>
                ))}
              </>
            )}
          </>
        )}

        {menu && volba === 'skupina' && (
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
                    key={p.profil.id}
                    className={`social-row social-row--volba ${
                      vybrani.includes(p.profil.id) ? 'is-vybrany' : ''
                    }`}
                    onClick={() => prepnout(p.profil.id)}
                  >
                    <SocialAvatar id={p.profil.id} jmeno={p.profil.displayName} avatarUrl={p.profil.avatarUrl} />
                    <span className="social-row-name">{p.profil.displayName}</span>
                    {vybrani.includes(p.profil.id) && <SocialIcon name="check" size={16} />}
                  </button>
                ))}

                <button
                  className="social-btn social-btn--full"
                  disabled={vybrani.length === 0}
                  onClick={zalozitSkupinu}
                >
                  Založit skupinu ({vybrani.length})
                </button>
              </>
            )}
          </>
        )}
      </section>

      {/* Žádosti o zprávy — 1:1 chat od někoho, koho vzájemně
          nesleduju. Odpověď (nebo tlačítko Přijmout přímo v ChatView.tsx)
          žádost sama přijme, "✕" tady dělá totéž co "Opustit chat"
          v hlavičce otevřeného chatu — obojí je stejný self-row DELETE. */}
      {pozadavkoveChaty.length > 0 && (
        <section className="social-card">
          <span className="social-card-label">POŽADAVKY NA ZPRÁVY ({pozadavkoveChaty.length})</span>
          {pozadavkoveChaty.map((ch) => (
            <div key={ch.id} className="social-row">
              <button className="social-row-otevrit" onClick={() => onOtevritChat(ch.id)}>
                <SocialAvatar
                  id={ch.id}
                  jmeno={ch.nazev}
                  avatarUrl={ch.ucastnici[0]?.avatarUrl}
                />
                <span className="social-row-name">
                  {ch.nazev}
                  <span className="social-row-sub">{ch.posledniZprava ?? 'Zatím bez zpráv'}</span>
                </span>
              </button>
              <button
                className="social-icon-btn social-icon-btn--ano"
                aria-label="Přijmout"
                onClick={() => stav.provest(() => api.prijmoutPozadavekNaZpravu(ch.id), 'Přijato.')}
              >
                <SocialIcon name="check" size={16} />
              </button>
              <button
                className="social-icon-btn social-icon-btn--ne"
                aria-label="Odmítnout"
                onClick={() => stav.provest(() => api.opustitChat(ch.id), 'Žádost odmítnuta.')}
              >
                <SocialIcon name="x" size={16} />
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="social-card">
        <span className="social-card-label">CHATY ({bezneChaty.length})</span>

        {bezneChaty.length > 0 && (
          <input
            type="search"
            className="social-input social-input--full"
            placeholder="Hledat v chatech…"
            value={hledatChaty}
            onChange={(e) => setHledatChaty(e.target.value)}
          />
        )}

        {bezneChaty.length === 0 ? (
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
              <SocialAvatar
                id={ch.id}
                jmeno={ch.nazev}
                jeSkupina={ch.jeSkupina}
                ikona={ch.ikona}
                avatarUrl={!ch.jeSkupina ? ch.ucastnici[0]?.avatarUrl : null}
                online={!ch.jeSkupina && !!ch.ucastnici[0] && online.has(ch.ucastnici[0].id)}
              />

              <span className="social-chat-text">
                <span className="social-chat-nazev">
                  {ch.nazev}
                  {ch.mujMuted && (
                    <SocialIcon name="bell-off" size={12} className="social-chat-ztlumeno" />
                  )}
                </span>
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
