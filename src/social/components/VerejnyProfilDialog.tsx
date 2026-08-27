import React, { useEffect, useState } from 'react'
import { getRole } from '@/core/role'
import { getLevelProgress, getXpForNextLevel } from '@/core/utils/gamificationUtils'
import { DEFAULT_BADGES } from '@/core/store/useGamificationStore'
import type { Badge } from '@/core/types/gamification.types'
import { resolveActiveFrameId } from '../avatarFrames'
import { SocialAvatar } from './SocialAvatar'
import { SocialIcon } from './SocialIcon'
import { NahlasitDialog } from './NahlasitDialog'
import * as api from '../api'
import type { VerejnyProfil } from '../types'
import type { SocialStav } from '../useSocial'

interface Props {
  userId: string
  stav: SocialStav
  onOtevritChat: (chatId: string) => void
  onZavrit: () => void
}

// ==========================================
// Profil cizího účtu — přátelé, hlavička 1:1 chatu i výsledky hledání
// otvírají tenhle jeden dialog, ne tři různé obrazovky. Data (úroveň/
// XP/sérii/roli) tahá přes precti_verejny_profil (viz api.ts) — avatar/
// jméno appka měla odjinud, tohle je nové.
//
// Akce (přidat/napsat/nahlásit/(od)blokovat) jsou přímo tady, ne jen
// na řádku v seznamu, odkud se dialog otevřel — funguje i z výsledků
// hledání, kde žádný řádek s vlastními tlačítky není.
// ==========================================

export const VerejnyProfilDialog: React.FC<Props> = ({ userId, stav, onOtevritChat, onZavrit }) => {
  const [profil, setProfil] = useState<VerejnyProfil | null>(null)
  const [nacita, setNacita] = useState(true)
  const [nahlasit, setNahlasit] = useState(false)
  // Nezávislé na hlavním profilu — appka ho nemá kam napsat zpátky,
  // ať se nemusí čekat, než dojede spolu se zbytkem.
  const [spolecni, setSpolecni] = useState<number | null>(null)

  useEffect(() => {
    let platne = true
    setNacita(true)
    setSpolecni(null)

    void api.nactiVerejnyProfil(userId).then((p) => {
      if (!platne) return
      setProfil(p)
      setNacita(false)
    })
    void api.nactiPocetSpolecnychPratel(userId).then((n) => platne && setSpolecni(n))

    return () => {
      platne = false
    }
  }, [userId])

  const pritel = stav.pratele.some((p) => p.profil.id === userId)
  const zadostOdeslana = stav.zadosti.some((z) => z.profil.id === userId && z.smer === 'odchozi')
  const jeZablokovany = stav.bloky.some((b) => b.id === userId)
  const jeToJa = stav.mujId === userId

  const role = profil ? getRole(profil.roleId) : null
  const xpDoDalsi = profil ? getXpForNextLevel(profil.level) : 0
  const progres = profil ? getLevelProgress(profil.xp) : 0
  const ramecek = profil ? resolveActiveFrameId(profil.frameId, profil.roleId) : null
  const pripnute: Badge[] = profil
    ? profil.pinnedBadges
        .map((id) => DEFAULT_BADGES.find((b) => b.id === id))
        .filter((b): b is Badge => b !== undefined)
    : []

  return (
    <>
      <div className="social-overlay" onClick={onZavrit} />
      <div className="social-dialog social-profil-dialog">
        {nacita ? (
          <p className="social-empty-note social-empty-note--stred">Načítám…</p>
        ) : !profil ? (
          <p className="social-empty-note social-empty-note--stred">
            Profil se nepovedlo načíst.
          </p>
        ) : (
          <>
            {profil.bannerUrl && (
              <div
                className="social-profil-banner"
                style={{ backgroundImage: `url(${profil.bannerUrl})` }}
                aria-hidden="true"
              />
            )}

            <div className="social-profil-hlava">
              <SocialAvatar
                id={profil.id}
                jmeno={profil.displayName}
                avatarUrl={profil.avatarUrl}
                frame={ramecek}
                velikost={56}
              />
              <div className="social-profil-hlava-text">
                <h3 className="social-dialog-title">{profil.displayName}</h3>
                {role && role.id !== 'user' && (
                  <span className={`social-profil-role-tag social-profil-role-tag--${role.tone}`}>
                    {role.icon} {role.title}
                  </span>
                )}
                {spolecni !== null && spolecni > 0 && !jeToJa && (
                  <span className="social-profil-spolecni">
                    {spolecni} {spolecni === 1 ? 'společný přítel' : spolecni < 5 ? 'společní přátelé' : 'společných přátel'}
                  </span>
                )}
              </div>
            </div>

            {profil.motto && <p className="social-profil-motto">{profil.motto}</p>}
            {profil.bio && <p className="social-profil-bio">{profil.bio}</p>}

            {pripnute.length > 0 && (
              <div className="social-profil-odznaky">
                {pripnute.map((b) => (
                  <span key={b.id} className="social-profil-odznak" title={b.title}>
                    {b.icon}
                  </span>
                ))}
              </div>
            )}

            <div className="social-profil-uroven">
              <div className="social-profil-uroven-hlava">
                <span>ÚROVEŇ {profil.level}</span>
                <span className="social-profil-xp-text">
                  {profil.xp} / {xpDoDalsi} XP
                </span>
              </div>
              <div className="social-profil-xp-bar-bg">
                <div className="social-profil-xp-bar-fill" style={{ width: `${progres}%` }} />
              </div>
            </div>

            <div className="social-profil-serie">
              🔥 {profil.streakDays} <span>dní v řadě</span>
            </div>
          </>
        )}

        {!nacita && profil && !jeToJa && (
          <div className="social-dialog-akce social-profil-akce">
            {pritel ? (
              <button
                className="social-btn"
                onClick={async () => {
                  const v = await api.otevritChatSPritelem(userId)
                  if (v.ok && v.chatId) {
                    onZavrit()
                    onOtevritChat(v.chatId)
                  } else {
                    stav.rekni(v.chyba ?? 'Chat se nepovedlo otevřít.')
                  }
                }}
              >
                <SocialIcon name="chat" size={14} />
                Napsat
              </button>
            ) : zadostOdeslana ? (
              <button className="social-btn social-btn--tlumene" disabled>
                Žádost odeslána
              </button>
            ) : (
              <button
                className="social-btn"
                onClick={() => stav.provest(() => api.poslatZadost(userId), 'Žádost odeslána.')}
              >
                <SocialIcon name="plus" size={14} />
                Přidat
              </button>
            )}

            <button className="social-btn social-btn--tlumene" onClick={() => setNahlasit(true)}>
              <SocialIcon name="flag" size={14} />
              Nahlásit
            </button>

            <button
              className="social-btn social-btn--tlumene"
              onClick={() =>
                stav.provest(
                  () => (jeZablokovany ? api.odblokovat(userId) : api.zablokovat(userId)),
                  jeZablokovany ? 'Odblokováno.' : 'Zablokováno.'
                )
              }
            >
              <SocialIcon name="block" size={14} />
              {jeZablokovany ? 'Odblokovat' : 'Zablokovat'}
            </button>
          </div>
        )}

        <div className="social-dialog-akce">
          <button className="social-btn social-btn--tlumene" onClick={onZavrit}>
            Zavřít
          </button>
        </div>
      </div>

      {nahlasit && <NahlasitDialog userId={userId} stav={stav} onZavrit={() => setNahlasit(false)} />}
    </>
  )
}
