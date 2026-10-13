import React, { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { useNavigate } from 'react-router-dom'
import { useSocial } from '@/social/useSocial'
import { SkenovatKodDialog } from '@/social/components/SkenovatKodDialog'
import { VerejnyProfilDialog } from '@/social/components/VerejnyProfilDialog'
import { ZvyrazneniPruh } from '@/social/components/ZvyrazneniPruh'
import { PridatPrispevekDialog } from './PridatPrispevekDialog'
import { NahratReelDialog, PODPORUJE_NAHRAVANI_REELU } from '@/social/components/NahratReelDialog'
import { PrispevekProhlizec } from '@/social/components/PrispevekProhlizec'
import { SledujiciDialog } from '@/social/components/SledujiciDialog'
import { SocialIcon } from '@/social/components/SocialIcon'
import * as socialApi from '@/social/api'
import { profilOdkaz } from '@/social/shareLink'
import type { Prispevek, SbirkaUlozenych, VztahSledovani } from '@/social/types'
import '@/social/SocialModule.css'

// ==========================================
// Sociální obsah appčina skutečného profilu — počty (příspěvky/
// sledující/sledovaní), mřížka příspěvků a sdílení vlastního kódu.
// Seznam přátel (PratelePanel.tsx) tu dřív byl taky, ale na žádost
// byl z profilu odebraný — appka ho pořád nabízí uvnitř Social
// samotného (chaty/vyhledávání), jen ne tady. Jedno lazy volání
// useSocial() pro celou tuhle sekci, ne dvě samostatné komponenty,
// které by si dotaz na Social API zbytečně zdvojily.
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
  const [noveSoubory, setNoveSoubory] = useState<File[] | null>(null)
  const [natacimReel, setNatacimReel] = useState(false)
  const [otevrenyPrispevek, setOtevrenyPrispevek] = useState<Prispevek | null>(null)
  const [otevrenSledujiciTab, setOtevrenSledujiciTab] = useState<'sledujici' | 'sledovani' | null>(null)
  const vstupRef = useRef<HTMLInputElement>(null)

  // Uložené příspěvky se natáhnou, až se záložka "Uloženo" doopravdy
  // otevře poprvé — ne hned s vlastní mřížkou, stejný "jen na vyžádání"
  // princip jako u vztahu/spolecnich ve VerejnyProfilDialog.tsx. Sbírky
  // (kolekce) se natáhnou ve stejné chvíli — appka v Uloženém nic
  // nefiltruje, dokud sbírky ani neznáme.
  const [ulozene, setUlozene] = useState<Prispevek[] | null>(null)
  const [kolekce, setKolekce] = useState<SbirkaUlozenych[]>([])
  const [filtrKolekce, setFiltrKolekce] = useState<'vse' | 'bez' | string>('vse')
  const [vytvarimSbirku, setVytvarimSbirku] = useState(false)
  const [novaSbirka, setNovaSbirka] = useState('')

  const nacistUlozeneISbirky = () => {
    void socialApi.nactiUlozenePrispevky().then(setUlozene)
    void socialApi.nactiSbirky().then(setKolekce)
  }

  const vytvoritSbirku = async () => {
    const vysledek = await socialApi.zalozitSbirku(novaSbirka)
    if (vysledek.ok) {
      setNovaSbirka('')
      setVytvarimSbirku(false)
      void socialApi.nactiSbirky().then(setKolekce)
    } else {
      stav.rekni(vysledek.chyba ?? 'Nepovedlo se to.')
    }
  }

  const smazatSbirku = async (id: string) => {
    if (!window.confirm('Smazat tuhle sbírku? Uložené příspěvky v ní zůstanou, jen se vrátí mimo sbírky.')) return
    const vysledek = await socialApi.smazatSbirku(id)
    if (vysledek.ok) {
      setKolekce((k) => k.filter((x) => x.id !== id))
      if (filtrKolekce === id) setFiltrKolekce('vse')
      setUlozene((u) => (u ? u.map((p) => (p.collectionId === id ? { ...p, collectionId: null } : p)) : u))
    } else {
      stav.rekni(vysledek.chyba ?? 'Nepovedlo se to.')
    }
  }

  const zobrazovaneUlozene = (ulozene ?? []).filter((p) => {
    if (filtrKolekce === 'vse') return true
    if (filtrKolekce === 'bez') return !p.collectionId
    return p.collectionId === filtrKolekce
  })

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
  // (api.otevritChat ho založí/najde dřív, než tenhle callback
  // vůbec dostane jeho id).
  const otevritSocial = () => navigate('/social')

  const zobrazovaneMrizky = prispevky.filter((p) => (tab === 'video' ? p.mediaType === 'video' : p.mediaType === 'image'))

  return (
    <div className="social-panel">
      {/* Počty — appčina obdoba IG "Followers/Following/Posts" řádku.
          Vlastní profil nemá tlačítko "Sledovat" (to dává smysl jen na
          cizím profilu, viz VerejnyProfilDialog.tsx) — úpravu jména/
          fotky/bia už appka nabízí jinde na týhle stránce. */}
      <section className="social-card social-staty-karta">
        <div className="social-staty-radek">
          <div className="social-staty-cislo">
            <strong>{prispevky.length}</strong>
            <span>Příspěvky</span>
          </div>
          <button className="social-staty-cislo social-staty-cislo--klikatelne" onClick={() => setOtevrenSledujiciTab('sledujici')}>
            <strong>{vztah?.sledujiciCelkem ?? 0}</strong>
            <span>Sledující</span>
          </button>
          <button className="social-staty-cislo social-staty-cislo--klikatelne" onClick={() => setOtevrenSledujiciTab('sledovani')}>
            <strong>{vztah?.sledovaniCelkem ?? 0}</strong>
            <span>Sledovaní</span>
          </button>
        </div>

        {stav.mujId && <ZvyrazneniPruh userId={stav.mujId} jeMoje />}

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
          <button
            className={`social-prispevky-tab ${tab === 'ulozeno' ? 'is-aktivni' : ''}`}
            onClick={() => {
              setTab('ulozeno')
              if (ulozene === null) nacistUlozeneISbirky()
            }}
          >
            Uloženo
          </button>
        </div>

        {tab === 'ulozeno' ? (
          <>
            {/* Sbírky — filtr podle toho, kam si uživatel příspěvek
                přeřadil (viz "move to collection" v PrispevekProhlizec.tsx).
                "Vše"/"Bez sbírky" jsou vždy tady, vlastní sbírky jen
                když appka nějakou zná. */}
            {ulozene !== null && ulozene.length > 0 && (
              <div className="social-sbirky-radek">
                <button
                  className={`social-sbirka-chip ${filtrKolekce === 'vse' ? 'is-aktivni' : ''}`}
                  onClick={() => setFiltrKolekce('vse')}
                >
                  Vše
                </button>
                {kolekce.map((k) => (
                  <span key={k.id} className="social-sbirka-chip-wrap">
                    <button
                      className={`social-sbirka-chip ${filtrKolekce === k.id ? 'is-aktivni' : ''}`}
                      onClick={() => setFiltrKolekce(k.id)}
                    >
                      {k.nazev}
                    </button>
                    <button
                      className="social-sbirka-smazat"
                      aria-label={`Smazat sbírku ${k.nazev}`}
                      onClick={() => void smazatSbirku(k.id)}
                    >
                      <SocialIcon name="x" size={11} />
                    </button>
                  </span>
                ))}
                <button
                  className={`social-sbirka-chip ${filtrKolekce === 'bez' ? 'is-aktivni' : ''}`}
                  onClick={() => setFiltrKolekce('bez')}
                >
                  Bez sbírky
                </button>
                {vytvarimSbirku ? (
                  <form
                    className="social-sbirka-nova-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void vytvoritSbirku()
                    }}
                  >
                    <input
                      className="social-input social-input--zprava"
                      placeholder="Název sbírky"
                      value={novaSbirka}
                      maxLength={40}
                      autoFocus
                      onChange={(e) => setNovaSbirka(e.target.value)}
                    />
                    <button className="social-btn social-btn--small" type="submit" disabled={!novaSbirka.trim()}>
                      <SocialIcon name="check" size={13} />
                    </button>
                  </form>
                ) : (
                  <button className="social-sbirka-chip social-sbirka-chip--nova" onClick={() => setVytvarimSbirku(true)}>
                    <SocialIcon name="plus" size={12} /> Nová
                  </button>
                )}
              </div>
            )}

            <div className="social-prispevky-mrizka">
              {ulozene === null ? (
                <p className="social-empty-note social-prispevky-prazdno">Načítám…</p>
              ) : ulozene.length === 0 ? (
                <p className="social-empty-note social-prispevky-prazdno">
                  Zatím nic uloženého. Ukládej si příspěvky přes 🔖 v jejich detailu.
                </p>
              ) : zobrazovaneUlozene.length === 0 ? (
                <p className="social-empty-note social-prispevky-prazdno">
                  V týhle sbírce zatím nic není.
                </p>
              ) : (
                zobrazovaneUlozene.map((p) => (
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
                    {p.dalsiMedia.length > 0 ? (
                      <span className="social-prispevek-karusel-znacka">
                        <SocialIcon name="layers" size={13} />
                      </span>
                    ) : (
                      p.mediaType === 'video' && <span className="social-prispevek-video-znacka">▶</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="social-prispevky-mrizka">
            <button
              className="social-prispevek-pridat"
              onClick={() => vstupRef.current?.click()}
              aria-label="Přidat příspěvek"
            >
              <SocialIcon name="plus" size={22} />
            </button>
            {/* Natočit rovnou v appce, ne jen vybrat existující soubor —
                druhá dlaždice vedle "+", feature-detekovaná stejně jako
                mikrofon v ChatView.tsx (viz NahratReelDialog.tsx). */}
            {PODPORUJE_NAHRAVANI_REELU && (
              <button
                className="social-prispevek-pridat"
                onClick={() => setNatacimReel(true)}
                aria-label="Nahrát Reel"
              >
                <SocialIcon name="video" size={22} />
              </button>
            )}
            <input
              ref={vstupRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="social-soubor-input"
              onChange={(e) => {
                const soubory = e.target.files ? Array.from(e.target.files) : []
                e.target.value = ''
                if (soubory.length > 0) setNoveSoubory(soubory.slice(0, socialApi.MAX_KARUSEL_POLOZEK))
              }}
            />

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
                  {p.dalsiMedia.length > 0 ? (
                    <span className="social-prispevek-karusel-znacka">
                      <SocialIcon name="layers" size={13} />
                    </span>
                  ) : (
                    p.mediaType === 'video' && <span className="social-prispevek-video-znacka">▶</span>
                  )}
                </button>
              ))}

            {!nacitaPrispevky && zobrazovaneMrizky.length === 0 && (
              <p className="social-empty-note social-prispevky-prazdno">
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

      {noveSoubory && (
        <PridatPrispevekDialog
          soubory={noveSoubory}
          onZavrit={() => setNoveSoubory(null)}
          onHotovo={() => {
            setNoveSoubory(null)
            nacistPrispevky()
          }}
        />
      )}

      {natacimReel && (
        <NahratReelDialog
          onZavrit={() => setNatacimReel(false)}
          onNatoceno={(soubor) => {
            setNatacimReel(false)
            setNoveSoubory([soubor])
          }}
        />
      )}

      {otevrenSledujiciTab && (
        <SledujiciDialog
          pocatecniTab={otevrenSledujiciTab}
          onOtevritProfil={(id) => {
            setOtevrenSledujiciTab(null)
            setOtevrenyProfil(id)
          }}
          onZavrit={() => setOtevrenSledujiciTab(null)}
        />
      )}

      {otevrenyPrispevek && (
        <PrispevekProhlizec
          prispevek={otevrenyPrispevek}
          // Dřív natvrdo true — platilo, dokud se tenhle prohlížeč
          // otevíral jen z vlastní mřížky. "Uloženo" ale může ukazovat
          // cizí příspěvek, u kterého appka smazání nesmí nabízet.
          jeMoje={otevrenyPrispevek.autorId === stav.mujId}
          mujId={stav.mujId}
          stav={stav}
          onZavrit={() => {
            setOtevrenyPrispevek(null)
            // Odebrání uloženého se projeví, až se seznam znovu natáhne
            // — appka ho radši rovnou obnoví, ne že by v Uloženém dál
            // viselo, co uživatel právě odebral.
            if (tab === 'ulozeno') void socialApi.nactiUlozenePrispevky().then(setUlozene)
          }}
          onSmazano={() => {
            setOtevrenyPrispevek(null)
            nacistPrispevky()
          }}
          // Sbírky jen z "Uloženo" — appka to tam ukáže (kolekce) i
          // bez ohledu na to, kterou dlaždici v jaké sbírce uživatel
          // zrovna otevřel, "mimo sbírky" jde zadat vždycky.
          kolekce={tab === 'ulozeno' ? kolekce : undefined}
          aktivniKolekceId={otevrenyPrispevek.collectionId ?? null}
          onZmenaKolekce={(novaId) => {
            const idOtevreneho = otevrenyPrispevek.id
            setUlozene((u) => (u ? u.map((p) => (p.id === idOtevreneho ? { ...p, collectionId: novaId } : p)) : u))
            setOtevrenyPrispevek((p) => (p ? { ...p, collectionId: novaId } : p))
          }}
        />
      )}
    </div>
  )
}

export default ProfilSocialniSekce
