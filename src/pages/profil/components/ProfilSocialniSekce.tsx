import React, { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { useNavigate } from 'react-router-dom'
import { useSocial } from '@/social/useSocial'
import { PratelePanel } from '@/social/components/PratelePanel'
import { SkenovatKodDialog } from '@/social/components/SkenovatKodDialog'
import { VerejnyProfilDialog } from '@/social/components/VerejnyProfilDialog'
import { PridatPrispevekDialog } from './PridatPrispevekDialog'
import { PrispevekProhlizec } from './PrispevekProhlizec'
import { SocialIcon } from '@/social/components/SocialIcon'
import * as socialApi from '@/social/api'
import { profilOdkaz } from '@/social/shareLink'
import type { Prispevek, VztahSledovani } from '@/social/types'
import '@/social/SocialModule.css'

// ==========================================
// Sociální obsah appčina skutečného profilu — počty (příspěvky/
// sledující/sledovaní), mřížka příspěvků, sdílení vlastního kódu
// a seznam přátel. Jedno lazy volání useSocial() pro celou tuhle
// sekci, ne dvě samostatné komponenty, které by si dotaz na Social
// API zbytečně zdvojily.
//
// React.lazy z ProfilModule.tsx — viz komentář tam: appka bez tohohle
// souboru netáhne Social API (useSocial, api.ts) do svého hlavního
// (netlazy) balíčku, jen kdo tuhle sekci doopravdy uvidí.
// ==========================================

export const ProfilSocialniSekce: React.FC = () => {
  const navigate = useNavigate()
  const stav = useSocial()
  const [qr, setQr] = useState<string | null>(null)
  const [sken, setSken] = useState(false)
  const [zkopirovano, setZkopirovano] = useState(false)
  const [otevrenyProfil, setOtevrenyProfil] = useState<string | null>(null)

  const [prispevky, setPrispevky] = useState<Prispevek[]>([])
  const [nacitaPrispevky, setNacitaPrispevky] = useState(true)
  const [vztah, setVztah] = useState<VztahSledovani | null>(null)
  const [tab, setTab] = useState<'foto' | 'video' | 'ulozeno'>('foto')
  const [novySoubor, setNovySoubor] = useState<File | null>(null)
  const [otevrenyPrispevek, setOtevrenyPrispevek] = useState<Prispevek | null>(null)
  const vstupRef = useRef<HTMLInputElement>(null)

  const nacistPrispevky = () => {
    if (!stav.mujId) return
    void socialApi.nactiPrispevky(stav.mujId).then((p) => {
      setPrispevky(p)
      setNacitaPrispevky(false)
    })
  }

  useEffect(() => {
    if (!stav.mujId) return
    let platne = true
    void socialApi.nactiPrispevky(stav.mujId).then((p) => {
      if (!platne) return
      setPrispevky(p)
      setNacitaPrispevky(false)
    })
    void socialApi.nactiVztahSledovani(stav.mujId).then((v) => platne && setVztah(v))
    return () => {
      platne = false
    }
  }, [stav.mujId])

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

  // "Napsat"/otevřít chat tady nemá kam appku zavést dovnitř Social na
  // konkrétní rozhovor (to je čistě lokální stav SocialModule.tsx) —
  // appka proto jen otevře Social, kde si uživatel chat najde v Chatech.
  // Přijatelné zjednodušení, ne bug: chat už v tu chvíli existuje
  // (api.otevritChatSPritelem ho založí/najde dřív, než tenhle callback
  // vůbec dostane jeho id).
  const otevritSocial = () => navigate('/social')

  const zobrazovaneMrizky = prispevky.filter((p) => (tab === 'video' ? p.mediaType === 'video' : p.mediaType === 'image'))

  return (
    <div className="social-panel">
      {/* Počty — appčina obdoba IG "Followers/Following/Posts" řádku.
          Vlastní profil nemá tlačítko "Sledovat" (to dává smysl jen
          na cizím profilu, viz VerejnyProfilDialog v pozdější fázi) —
          úpravu jména/fotky/bia už appka nabízí jinde na týhle stránce. */}
      <section className="social-card profil-staty-karta">
        <div className="profil-staty-radek">
          <div className="profil-staty-cislo">
            <strong>{prispevky.length}</strong>
            <span>Příspěvky</span>
          </div>
          <div className="profil-staty-cislo">
            <strong>{vztah?.sledujiciCelkem ?? 0}</strong>
            <span>Sledující</span>
          </div>
          <div className="profil-staty-cislo">
            <strong>{vztah?.sledovaniCelkem ?? 0}</strong>
            <span>Sledovaní</span>
          </div>
        </div>

        <div className="profil-prispevky-taby">
          <button
            className={`profil-prispevky-tab ${tab === 'foto' ? 'is-aktivni' : ''}`}
            onClick={() => setTab('foto')}
          >
            <SocialIcon name="attach" size={15} /> Příspěvky
          </button>
          <button
            className={`profil-prispevky-tab ${tab === 'video' ? 'is-aktivni' : ''}`}
            onClick={() => setTab('video')}
          >
            <SocialIcon name="play" size={15} /> Videa
          </button>
          <button
            className={`profil-prispevky-tab ${tab === 'ulozeno' ? 'is-aktivni' : ''}`}
            onClick={() => setTab('ulozeno')}
          >
            Uloženo
          </button>
        </div>

        {tab === 'ulozeno' ? (
          <p className="social-empty-note social-empty-note--stred">
            Ukládání příspěvků bude brzy. ✨
          </p>
        ) : (
          <div className="profil-prispevky-mrizka">
            <button
              className="profil-prispevek-pridat"
              onClick={() => vstupRef.current?.click()}
              aria-label="Přidat příspěvek"
            >
              <SocialIcon name="plus" size={22} />
            </button>
            <input
              ref={vstupRef}
              type="file"
              accept="image/*,video/*"
              className="social-soubor-input"
              onChange={(e) => {
                const soubor = e.target.files?.[0]
                e.target.value = ''
                if (soubor) setNovySoubor(soubor)
              }}
            />

            {!nacitaPrispevky &&
              zobrazovaneMrizky.map((p) => (
                <button
                  key={p.id}
                  className="profil-prispevek-dlazdice"
                  onClick={() => setOtevrenyPrispevek(p)}
                >
                  {p.mediaType === 'video' ? (
                    <video src={p.mediaUrl} muted playsInline />
                  ) : (
                    <img src={p.mediaUrl} alt="" />
                  )}
                  {p.mediaType === 'video' && <span className="profil-prispevek-video-znacka">▶</span>}
                </button>
              ))}

            {!nacitaPrispevky && zobrazovaneMrizky.length === 0 && (
              <p className="social-empty-note profil-prispevky-prazdno">
                {tab === 'foto' ? 'Zatím žádné fotky.' : 'Zatím žádná videa.'}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Sdílet vlastní profil — přátelský kód dřív žil ve Social's
          bývalé Profil záložce (viz CLAUDE.md), teď tady. */}
      <section className="social-card">
        <span className="social-card-label">MŮJ KÓD</span>
        <div className="social-muj-profil-radek">
          {qr && <img src={qr} alt="QR kód profilu" className="social-qr" />}
          <div className="social-muj-profil-akce">
            <span className="social-muj-kod">
              {stav.profil ? socialApi.formatujKod(stav.profil.friendCode) : ''}
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

      <PratelePanel stav={stav} onOtevritChat={otevritSocial} onOtevritProfil={setOtevrenyProfil} />

      {sken && (
        <SkenovatKodDialog stav={stav} onOtevritProfil={setOtevrenyProfil} onZavrit={() => setSken(false)} />
      )}

      {otevrenyProfil && (
        <VerejnyProfilDialog
          userId={otevrenyProfil}
          stav={stav}
          onOtevritChat={otevritSocial}
          onZavrit={() => setOtevrenyProfil(null)}
        />
      )}

      {novySoubor && (
        <PridatPrispevekDialog
          soubor={novySoubor}
          onZavrit={() => setNovySoubor(null)}
          onHotovo={() => {
            setNovySoubor(null)
            nacistPrispevky()
          }}
        />
      )}

      {otevrenyPrispevek && (
        <PrispevekProhlizec
          prispevek={otevrenyPrispevek}
          onZavrit={() => setOtevrenyPrispevek(null)}
          onSmazano={() => {
            setOtevrenyPrispevek(null)
            nacistPrispevky()
          }}
        />
      )}
    </div>
  )
}

export default ProfilSocialniSekce
