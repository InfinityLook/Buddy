import React, { useEffect, useState } from 'react'
import { SocialIcon } from './SocialIcon'
import { SocialAvatar } from './SocialAvatar'
import { PrispevekProhlizec } from './PrispevekProhlizec'
import * as api from '../api'
import type { SocialStav } from '../useSocial'
import type { PratelskyNavrh, Prispevek, SocialProfil } from '../types'

interface Props {
  stav: SocialStav
  onOtevritProfil: (userId: string) => void
}

// ==========================================
// Vyhledávač — vlastní záložka spodní navigace, ne karta natěsno nad
// seznamem přátel v Profilu (viz Fáze 2 rozvržení, CLAUDE.md). Stejný
// mentální model jako vyhledávání/objevování v Instagramu nebo TikToku:
// hledání jménem, návrhy podle společných přátel a stav žádostí o
// přátelství — všechno, co patří k *přidávání* nových lidí, ne
// k lidem, se kterými už jsi propojený/á (ti zůstávají v Profilu).
// ==========================================

export const VyhledavacPanel: React.FC<Props> = ({ stav, onOtevritProfil }) => {
  const [dotaz, setDotaz] = useState('')
  const [vysledky, setVysledky] = useState<SocialProfil[]>([])
  const [hleda, setHleda] = useState(false)
  const [hledano, setHledano] = useState(false)
  const [navrhy, setNavrhy] = useState<PratelskyNavrh[]>([])

  // Dotaz začínající "#" hledá příspěvky podle hashtagu, ne lidi podle
  // jména — appka to pozná ze samotného znaku, žádný přepínač navíc.
  // hledanoHashtag je zamrzlý na chvíli odeslání, ne živě odvozený z
  // dotaz — jinak by přepsání textu po odeslání (ještě než uživatel
  // klikne znovu) přehodilo, jaké výsledky se vlastně ukazují.
  const [hashtagVysledky, setHashtagVysledky] = useState<Prispevek[]>([])
  const [hledanoHashtag, setHledanoHashtag] = useState(false)
  const [otevrenyPrispevek, setOtevrenyPrispevek] = useState<Prispevek | null>(null)
  const jeHashtag = dotaz.trim().startsWith('#')

  const prichozi = stav.zadosti.filter((z) => z.smer === 'prichozi')
  const odchozi = stav.zadosti.filter((z) => z.smer === 'odchozi')

  // Návrhy se přenačtou při každé změně přátel/žádostí (stav.pratele
  // se mění po přijetí/odeslání žádosti) — bez toho by appka pořád
  // nabízela někoho, koho uživatel mezitím už přidal.
  useEffect(() => {
    let platne = true
    void api.nactiNavrhyPratel().then((n) => platne && setNavrhy(n))
    return () => {
      platne = false
    }
  }, [stav.pratele, stav.zadosti])

  const hledat = async (e: React.FormEvent) => {
    e.preventDefault()
    const orezany = dotaz.trim()

    if (jeHashtag) {
      if (orezany.replace(/^#/, '').length < 2) return
      setHleda(true)
      const vysledek = await api.hledejPodleHashtagu(orezany)
      setHashtagVysledky(vysledek)
      setHledanoHashtag(true)
      setHledano(true)
      setHleda(false)
      return
    }

    if (orezany.length < 2) return
    setHleda(true)
    const vysledek = await api.hledejPodleJmena(orezany)
    setVysledky(vysledek)
    setHledanoHashtag(false)
    setHledano(true)
    setHleda(false)
  }

  // Text úspěchu závisí na tom, co se ze sledování doopravdy stalo — u
  // veřejného účtu je hned 'prijato', u soukromého 'cekajici' (server to
  // rozhodne, appka jen ohlásí výsledek, viz sledovatUcet v api.ts).
  const zpravaPoSledovani = (stav?: 'cekajici' | 'prijato') =>
    stav === 'cekajici' ? 'Žádost o sledování odeslána.' : 'Sleduješ ✓'

  const sledovat = async (profil: SocialProfil) => {
    const vysledek = await api.sledovatUcet(profil.id)
    stav.rekni(vysledek.ok ? zpravaPoSledovani(vysledek.stav) : vysledek.chyba ?? 'Nepovedlo se to.')
    if (vysledek.ok) {
      setVysledky((v) => v.filter((p) => p.id !== profil.id))
      await stav.obnovit()
    }
  }

  const sledovatZNavrhu = async (navrh: PratelskyNavrh) => {
    const vysledek = await api.sledovatUcet(navrh.id)
    stav.rekni(vysledek.ok ? zpravaPoSledovani(vysledek.stav) : vysledek.chyba ?? 'Nepovedlo se to.')
    if (vysledek.ok) {
      setNavrhy((n) => n.filter((x) => x.id !== navrh.id))
      await stav.obnovit()
    }
  }

  return (
    <div className="social-panel">
      {/* Najít lidi podle jména, nebo příspěvky podle #hashtagu — appka
          pozná, co uživatel chce, ze samotného "#" na začátku, žádný
          přepínač navíc. */}
      <section className="social-card">
        <span className="social-card-label">NAJÍT LIDI NEBO #HASHTAG</span>
        <form className="social-add-row" onSubmit={hledat}>
          <input
            className="social-input"
            placeholder="Jméno nebo #hashtag…"
            value={dotaz}
            maxLength={40}
            onChange={(e) => {
              setDotaz(e.target.value)
              setHledano(false)
            }}
          />
          <button
            className="social-btn"
            type="submit"
            disabled={hleda || dotaz.trim().replace(/^#/, '').length < 2}
          >
            {hleda ? '…' : 'Hledat'}
          </button>
        </form>

        {hledano && hledanoHashtag && hashtagVysledky.length === 0 && (
          <p className="social-empty-note">Žádné příspěvky s tímhle hashtagem jsme nenašli.</p>
        )}

        {hledano && hledanoHashtag && hashtagVysledky.length > 0 && (
          <div className="social-prispevky-mrizka">
            {hashtagVysledky.map((p) => (
              <button key={p.id} className="social-prispevek-dlazdice" onClick={() => setOtevrenyPrispevek(p)}>
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
          </div>
        )}

        {hledano && !hledanoHashtag && vysledky.length === 0 && (
          <p className="social-empty-note">Nikoho takového jsme nenašli.</p>
        )}

        {!hledanoHashtag &&
          vysledky.map((profil) => (
            <div key={profil.id} className="social-row">
              <button className="social-row-otevrit" onClick={() => onOtevritProfil(profil.id)}>
                <SocialAvatar id={profil.id} jmeno={profil.displayName} avatarUrl={profil.avatarUrl} />
                <span className="social-row-name">{profil.displayName}</span>
              </button>
              <button className="social-btn social-btn--small" onClick={() => sledovat(profil)}>
                <SocialIcon name="plus" size={14} />
                Sledovat
              </button>
            </div>
          ))}
      </section>

      {/* Návrhy podle společných přátel — navrhy_pratel() na databázi
          už vylučuje sebe, stávající přátele, čekající žádosti
          i blokované, appka tu jen vykresluje, co dostala. */}
      {navrhy.length > 0 && (
        <section className="social-card">
          <span className="social-card-label">NÁVRHY</span>
          {navrhy.map((n) => (
            <div key={n.id} className="social-row">
              <button className="social-row-otevrit" onClick={() => onOtevritProfil(n.id)}>
                <SocialAvatar id={n.id} jmeno={n.displayName} avatarUrl={n.avatarUrl} />
                <span className="social-row-name">
                  {n.displayName}
                  <span className="social-row-sub">
                    {n.spolecni} {n.spolecni === 1 ? 'společný přítel' : n.spolecni < 5 ? 'společní přátelé' : 'společných přátel'}
                  </span>
                </span>
              </button>
              <button className="social-btn social-btn--small" onClick={() => sledovatZNavrhu(n)}>
                <SocialIcon name="plus" size={14} />
                Sledovat
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Došlé žádosti o sledování — objeví se jen u soukromého účtu,
          veřejné sledování se stane přítelem/sledujícím rovnou. */}
      {prichozi.length > 0 && (
        <section className="social-card">
          <span className="social-card-label">ŽÁDOSTI O SLEDOVÁNÍ ({prichozi.length})</span>
          {prichozi.map((z) => (
            <div key={z.profil.id} className="social-row">
              <button className="social-row-otevrit" onClick={() => onOtevritProfil(z.profil.id)}>
                <SocialAvatar id={z.profil.id} jmeno={z.profil.displayName} avatarUrl={z.profil.avatarUrl} pulzuje />
                <span className="social-row-name">{z.profil.displayName}</span>
              </button>
              <button
                className="social-icon-btn social-icon-btn--ano"
                aria-label="Schválit"
                onClick={() => stav.provest(() => api.schvalitZadost(z.profil.id), 'Schváleno 🎉')}
              >
                <SocialIcon name="check" size={16} />
              </button>
              <button
                className="social-icon-btn social-icon-btn--ne"
                aria-label="Odmítnout"
                onClick={() => stav.provest(() => api.zrusitVazbu(z.profil.id), 'Žádost odmítnuta.')}
              >
                <SocialIcon name="x" size={16} />
              </button>
            </div>
          ))}
        </section>
      )}

      {odchozi.length > 0 && (
        <section className="social-card">
          <span className="social-card-label">ČEKÁ NA SCHVÁLENÍ ({odchozi.length})</span>
          {odchozi.map((z) => (
            <div key={z.profil.id} className="social-row">
              <button className="social-row-otevrit" onClick={() => onOtevritProfil(z.profil.id)}>
                <SocialAvatar id={z.profil.id} jmeno={z.profil.displayName} avatarUrl={z.profil.avatarUrl} />
                <span className="social-row-name">{z.profil.displayName}</span>
              </button>
              <button
                className="social-icon-btn social-icon-btn--ne"
                aria-label="Zrušit žádost"
                onClick={() => stav.provest(() => api.zrusitVazbu(z.profil.id), 'Žádost zrušena.')}
              >
                <SocialIcon name="x" size={16} />
              </button>
            </div>
          ))}
        </section>
      )}

      {prichozi.length === 0 && odchozi.length === 0 && navrhy.length === 0 && !hledano && (
        <p className="social-empty-note social-empty-note--stred">
          Napiš jméno a najdi lidi, se kterými se chceš spojit — nebo #hashtag a najdi jejich příspěvky.
        </p>
      )}

      {otevrenyPrispevek && (
        <PrispevekProhlizec
          prispevek={otevrenyPrispevek}
          jeMoje={otevrenyPrispevek.autorId === stav.mujId}
          mujId={stav.mujId}
          stav={stav}
          onZavrit={() => setOtevrenyPrispevek(null)}
          onSmazano={() => {
            setOtevrenyPrispevek(null)
            setHashtagVysledky((v) => v.filter((p) => p.id !== otevrenyPrispevek.id))
          }}
        />
      )}
    </div>
  )
}
