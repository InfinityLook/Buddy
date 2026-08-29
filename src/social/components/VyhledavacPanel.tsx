import React, { useEffect, useState } from 'react'
import { SocialIcon } from './SocialIcon'
import { SocialAvatar } from './SocialAvatar'
import * as api from '../api'
import type { SocialStav } from '../useSocial'
import type { PratelskyNavrh, SocialProfil } from '../types'

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

  const hledatLidi = async (e: React.FormEvent) => {
    e.preventDefault()
    if (dotaz.trim().length < 2) return

    setHleda(true)
    const vysledek = await api.hledejPodleJmena(dotaz)
    setVysledky(vysledek)
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
      {/* Najít lidi podle jména */}
      <section className="social-card">
        <span className="social-card-label">NAJÍT LIDI</span>
        <form className="social-add-row" onSubmit={hledatLidi}>
          <input
            className="social-input"
            placeholder="Jméno…"
            value={dotaz}
            maxLength={40}
            onChange={(e) => {
              setDotaz(e.target.value)
              setHledano(false)
            }}
          />
          <button className="social-btn" type="submit" disabled={hleda || dotaz.trim().length < 2}>
            {hleda ? '…' : 'Hledat'}
          </button>
        </form>

        {hledano && vysledky.length === 0 && (
          <p className="social-empty-note">Nikoho takového jsme nenašli.</p>
        )}

        {vysledky.map((profil) => (
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
          Napiš jméno a najdi lidi, se kterými se chceš spojit.
        </p>
      )}
    </div>
  )
}
