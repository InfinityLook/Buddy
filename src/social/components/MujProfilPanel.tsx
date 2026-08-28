import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useNavigate } from 'react-router-dom'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useActiveRole } from '@/core/role'
import { getLevelProgress, getXpForNextLevel } from '@/core/utils/gamificationUtils'
import { resolveActiveFrameId } from '../avatarFrames'
import { SocialAvatar } from './SocialAvatar'
import { SocialIcon } from './SocialIcon'
import { SkenovatKodDialog } from './SkenovatKodDialog'
import * as api from '../api'
import { profilOdkaz } from '../shareLink'
import type { SocialStav } from '../useSocial'

interface Props {
  stav: SocialStav
  onOtevritProfil: (userId: string) => void
}

// ==========================================
// Vlastní profil jako samostatná záložka, ne karta natěsno nad Přátelé —
// stejný model, jaký zná Instagram: klepnu na "Profil" a vidím svou
// vlastní stránku (avatar, bio, úroveň, odznaky), ne cizí seznam se svým
// profilem vmáčknutým nahoru. Sdílecí blok (QR/kód/skenování) se sem
// přesunul z PratelePanel.tsx beze změny obsahu — patří koncepčně sem,
// ne mezi hledání a žádosti o přátelství.
//
// Na rozdíl od VerejnyProfilDialog.tsx (cizí profil) tady appka nic
// netahá přes precti_verejny_profil() — pro vlastní profil má všechna
// data už lokálně (useProfileData, useGamificationStore, useActiveRole),
// takže žádný síťový dotaz navíc. Vzhled (banner/hlava/motto/bio/
// odznaky/úroveň/série) sdílí stejné .social-profil-* třídy jako dialog
// pro cizí profil, jen bez rámečku dialogu okolo — .social-card--profil
// dává kartě stejný 1rem padding, ať bannerův záporný okraj sedí i tady.
// ==========================================

export const MujProfilPanel: React.FC<Props> = ({ stav, onOtevritProfil }) => {
  const navigate = useNavigate()
  const { profile } = useProfileData()
  const gamifikace = useGamificationStore()
  const role = useActiveRole()
  const [qr, setQr] = useState<string | null>(null)
  const [sken, setSken] = useState(false)
  const [zkopirovano, setZkopirovano] = useState(false)

  // QR se generuje z vlastního kódu, jakmile ho appka zná — čistě
  // klientská knihovna (qrcode), žádný síťový dotaz.
  useEffect(() => {
    const kod = stav.profil?.friendCode
    if (!kod) return
    let platne = true
    void QRCode.toDataURL(profilOdkaz(kod), { margin: 1, width: 168 }).then(
      (url) => platne && setQr(url)
    )
    return () => {
      platne = false
    }
  }, [stav.profil?.friendCode])

  const ramecek = resolveActiveFrameId(profile.frameId, role.id)
  const xpDoDalsi = getXpForNextLevel(gamifikace.level)
  const progres = getLevelProgress(gamifikace.xp)
  const pripnute = profile.pinnedBadges
    .map((id) => gamifikace.badges.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => !!b && !!b.unlockedAt)

  return (
    <div className="social-panel">
      <section className="social-card social-card--profil">
        {profile.bannerUrl && (
          <div
            className="social-profil-banner"
            style={{ backgroundImage: `url(${profile.bannerUrl})` }}
            aria-hidden="true"
          />
        )}

        <div className="social-profil-hlava">
          <SocialAvatar
            id={stav.mujId ?? ''}
            jmeno={profile.name}
            avatarUrl={profile.avatar}
            frame={ramecek}
            velikost={56}
          />
          <div className="social-profil-hlava-text">
            <h3 className="social-dialog-title">{profile.name}</h3>
            {role.id !== 'user' && (
              <span className={`social-profil-role-tag social-profil-role-tag--${role.tone}`}>
                {role.icon} {role.title}
              </span>
            )}
          </div>
        </div>

        {profile.motto && <p className="social-profil-motto">{profile.motto}</p>}
        {profile.bio && <p className="social-profil-bio">{profile.bio}</p>}

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
            <span>ÚROVEŇ {gamifikace.level}</span>
            <span className="social-profil-xp-text">
              {gamifikace.xp} / {xpDoDalsi} XP
            </span>
          </div>
          <div className="social-profil-xp-bar-bg">
            <div className="social-profil-xp-bar-fill" style={{ width: `${progres}%` }} />
          </div>
        </div>

        <div className="social-profil-serie">
          🔥 {gamifikace.streakDays} <span>dní v řadě</span>
        </div>

        <button className="social-btn social-btn--tlumene" onClick={() => navigate('/profil')}>
          Upravit profil
        </button>
      </section>

      {/* Sdílet vlastní profil — přátelský kód dřív appka nikde
          nezobrazovala (viz CLAUDE.md), ta stará "TVŮJ KÓD" obrazovka
          ustoupila hledání podle jména. Tohle není její návrat, je to
          rychlé párování naskenováním, ne prohledávání. */}
      <section className="social-card">
        <span className="social-card-label">MŮJ KÓD</span>
        <div className="social-muj-profil-radek">
          {qr && <img src={qr} alt="QR kód profilu" className="social-qr" />}
          <div className="social-muj-profil-akce">
            <span className="social-muj-kod">
              {stav.profil ? api.formatujKod(stav.profil.friendCode) : ''}
            </span>
            <button
              className="social-btn social-btn--small"
              onClick={async () => {
                if (!stav.profil) return
                await navigator.clipboard.writeText(profilOdkaz(stav.profil.friendCode))
                setZkopirovano(true)
                window.setTimeout(() => setZkopirovano(false), 2000)
              }}
            >
              <SocialIcon name={zkopirovano ? 'check' : 'copy'} size={13} />
              {zkopirovano ? 'Zkopírováno' : 'Kopírovat odkaz'}
            </button>
            <button className="social-btn social-btn--small social-btn--tlumene" onClick={() => setSken(true)}>
              📷 Naskenovat kód
            </button>
          </div>
        </div>
      </section>

      {sken && (
        <SkenovatKodDialog stav={stav} onOtevritProfil={onOtevritProfil} onZavrit={() => setSken(false)} />
      )}
    </div>
  )
}
