import React, { useEffect, useState } from 'react'
import { getRole } from '@/core/role'
import { getLevelProgress, getXpForNextLevel } from '@/core/utils/gamificationUtils'
import { DEFAULT_BADGES } from '@/core/store/useGamificationStore'
import type { Badge } from '@/core/types/gamification.types'
import { resolveActiveFrameId } from '../avatarFrames'
import { SocialAvatar } from './SocialAvatar'
import { SocialIcon } from './SocialIcon'
import { NahlasitDialog } from './NahlasitDialog'
import { PrispevekProhlizec } from './PrispevekProhlizec'
import { useOnlineFriends } from '../presence'
import * as api from '../api'
import type { Prispevek, VerejnyProfil, VztahSledovani } from '../types'
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
// Akce (sledovat/napsat/nahlásit/(od)blokovat) jsou přímo tady, ne jen
// na řádku v seznamu, odkud se dialog otevřel — funguje i z výsledků
// hledání, kde žádný řádek s vlastními tlačítky není.
//
// Sledování a přátelství jsou od sjednocení jeden vztahový model (viz
// types.ts): jedno tlačítko Sledovat/Sledujete/Čeká na schválení, žádné
// druhé "Přidat mezi přátele" vedle něj. "Napsat" se objeví, až jsou
// obě strany vzájemně přijaté (stav.pratele) — na soukromém účtu se
// navíc skryje mřížka příspěvků, dokud sledování cíl neschválí.
//
// Počty/taby/mřížka příspěvků jsou stejná sekce appka teď ukazuje i na
// vlastním profilu appky (pages/profil/components/ProfilSocialniSekce.tsx).
// ==========================================

export const VerejnyProfilDialog: React.FC<Props> = ({ userId, stav, onOtevritChat, onZavrit }) => {
  const online = useOnlineFriends()
  const [profil, setProfil] = useState<VerejnyProfil | null>(null)
  const [nacita, setNacita] = useState(true)
  const [nahlasit, setNahlasit] = useState(false)
  // Nezávislé na hlavním profilu — appka ho nemá kam napsat zpátky,
  // ať se nemusí čekat, než dojede spolu se zbytkem.
  const [spolecni, setSpolecni] = useState<number | null>(null)

  const [vztah, setVztah] = useState<VztahSledovani | null>(null)
  const [meniSledovani, setMeniSledovani] = useState(false)
  const [prispevky, setPrispevky] = useState<Prispevek[]>([])
  const [nacitaPrispevky, setNacitaPrispevky] = useState(true)
  const [tab, setTab] = useState<'foto' | 'video'>('foto')
  const [otevrenyPrispevek, setOtevrenyPrispevek] = useState<Prispevek | null>(null)

  useEffect(() => {
    let platne = true
    setNacita(true)
    setSpolecni(null)
    setVztah(null)
    setNacitaPrispevky(true)

    void api.nactiVerejnyProfil(userId).then((p) => {
      if (!platne) return
      setProfil(p)
      setNacita(false)
    })
    void api.nactiPocetSpolecnychPratel(userId).then((n) => platne && setSpolecni(n))
    void api.nactiVztahSledovani(userId).then((v) => platne && setVztah(v))
    void api.nactiPrispevky(userId).then((p) => {
      if (!platne) return
      setPrispevky(p)
      setNacitaPrispevky(false)
    })

    return () => {
      platne = false
    }
  }, [userId])

  const pritel = stav.pratele.some((p) => p.profil.id === userId)
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

  // Přepnutí sledování — appka si počty vždycky znovu natáhne z
  // databáze, ne že by si je jen sama o jedno posunula. Server je
  // stejně jediná pravda a rozdíl je nepostřehnutelný. "Nesleduje" i
  // "cekajici" oboje vedou k odeslání/zrušení stejným tlačítkem —
  // klepnutí na "Čeká na schválení" žádost prostě zruší, stejný
  // "odhlásit vlastní řádek" mechanismus jako běžné odsledování.
  const prepnoutSledovani = async () => {
    if (!vztah || meniSledovani) return
    setMeniSledovani(true)
    const akce = vztah.stavSledovani === 'nesleduje' ? api.sledovatUcet : api.prestatSledovatUcet
    const vysledek = await akce(userId)
    if (vysledek.ok) void api.nactiVztahSledovani(userId).then(setVztah)
    else stav.rekni(vysledek.chyba ?? 'Nepovedlo se to.')
    setMeniSledovani(false)
  }

  const zobrazovaneMrizky = prispevky.filter((p) => (tab === 'video' ? p.mediaType === 'video' : p.mediaType === 'image'))

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
                online={online.has(profil.id)}
                velikost={56}
              />
              <div className="social-profil-hlava-text">
                <h3 className="social-dialog-title">{profil.displayName}</h3>
                {role && role.id !== 'user' && (
                  <span className={`social-profil-role-tag social-profil-role-tag--${role.tone}`}>
                    {role.icon} {role.title}
                  </span>
                )}
                {profil.soukromy && (
                  <span className="social-profil-role-tag social-profil-role-tag--soukromy">
                    🔒 Soukromý účet
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
            <button
              className={`social-btn ${vztah?.stavSledovani !== 'nesleduje' ? 'social-btn--tlumene' : ''}`}
              onClick={prepnoutSledovani}
              disabled={!vztah || meniSledovani}
            >
              {vztah?.stavSledovani === 'prijato'
                ? 'Sledujete'
                : vztah?.stavSledovani === 'cekajici'
                  ? 'Čeká na schválení'
                  : profil.soukromy
                    ? 'Požádat o sledování'
                    : 'Sledovat'}
            </button>

            {/* Napsat jde i mimo přátele — u nikoho, koho vzájemně
                nesleduju, ale kdo mě neblokoval, zaloz_chat na databázi
                jen vznikne jako žádost o zprávu místo rovnou otevřeného
                chatu (viz otevritChat v api.ts), místo aby appka psaní
                dopředu odmítla. Blokovaná dvojice ho stejně nezaloží. */}
            {!jeZablokovany && (
              <button
                className="social-btn"
                onClick={async () => {
                  const v = await api.otevritChat(userId)
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

        {!nacita && profil && (
          <>
            <div className="social-staty-radek">
              <div className="social-staty-cislo">
                <strong>{prispevky.length}</strong>
                <span>Příspěvky</span>
              </div>
              <div className="social-staty-cislo">
                <strong>{vztah?.sledujiciCelkem ?? 0}</strong>
                <span>Sledující</span>
              </div>
              <div className="social-staty-cislo">
                <strong>{vztah?.sledovaniCelkem ?? 0}</strong>
                <span>Sledovaní</span>
              </div>
            </div>

            <div className="social-prispevky-taby">
              <button
                className={`social-prispevky-tab ${tab === 'foto' ? 'is-aktivni' : ''}`}
                onClick={() => setTab('foto')}
              >
                <SocialIcon name="attach" size={15} /> Příspěvky
              </button>
              <button
                className={`social-prispevky-tab ${tab === 'video' ? 'is-aktivni' : ''}`}
                onClick={() => setTab('video')}
              >
                <SocialIcon name="play" size={15} /> Videa
              </button>
            </div>

            {profil.soukromy && !jeToJa && !pritel ? (
              // Server (nacti_prispevky) stejně nic nevrátí — appka tu
              // jen vysvětlí proč, ať "Zatím žádné fotky" nepůsobí, jako
              // by tam doopravdy nic nebylo.
              <p className="social-empty-note social-empty-note--stred">
                🔒 Tenhle účet je soukromý. Sleduj ho, ať uvidíš příspěvky.
              </p>
            ) : (
              <div className="social-prispevky-mrizka">
                {!nacitaPrispevky &&
                  zobrazovaneMrizky.map((p) => (
                    <button
                      key={p.id}
                      className="social-prispevek-dlazdice"
                      onClick={() => setOtevrenyPrispevek(p)}
                    >
                      {p.mediaType === 'video' ? (
                        <video src={p.mediaUrl} muted playsInline />
                      ) : (
                        <img src={p.mediaUrl} alt="" />
                      )}
                      {p.mediaType === 'video' && <span className="social-prispevek-video-znacka">▶</span>}
                    </button>
                  ))}

                {!nacitaPrispevky && zobrazovaneMrizky.length === 0 && (
                  <p className="social-empty-note social-prispevky-prazdno">
                    {tab === 'foto' ? 'Zatím žádné fotky.' : 'Zatím žádná videa.'}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <div className="social-dialog-akce">
          <button className="social-btn social-btn--tlumene" onClick={onZavrit}>
            Zavřít
          </button>
        </div>
      </div>

      {nahlasit && <NahlasitDialog userId={userId} stav={stav} onZavrit={() => setNahlasit(false)} />}

      {otevrenyPrispevek && (
        <PrispevekProhlizec
          prispevek={otevrenyPrispevek}
          jeMoje={jeToJa}
          mujId={stav.mujId}
          stav={stav}
          onZavrit={() => setOtevrenyPrispevek(null)}
          onSmazano={() => {
            setOtevrenyPrispevek(null)
            void api.nactiPrispevky(userId).then(setPrispevky)
          }}
        />
      )}
    </>
  )
}
