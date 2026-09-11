import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/core/store/useAppStore'
import { useFormCheck } from '@/miniapps/form-check/useFormCheck'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { plural } from '@/core/utils/pluralCZ'
import { FlagshipShell } from '../shared/FlagshipShell'
import { NastrojeSheet } from '../shared/NastrojeSheet'
import {
  spocitatFitnessPrehled,
  formatujRozdil,
  spocitejOsobniRekordy,
  spocitejSeriiTreninku,
  spocitejTreninkovychDniZaTyden,
  spocitejAktivituPodleDne,
} from './fitnessStats'
import { useFitnessCil } from './useFitnessCil'
import type { FlagshipDlazdice, FlagshipVelkaKarta } from '../shared/types'
import './FitnessRoomModule.css'

// Skromné, historické výchozí hodnoty denního cíle — appka do teď
// netrénovala nic než dřepy, takže šlo od začátku o natvrdo dané číslo,
// ne o vyladěný plán. Od zavedení useFitnessCil.ts jde jen o fallback
// pro chvíli, kdy si uživatel vlastní cíl ještě nenastavil — kdo
// nastavení nikdy neotevře, uvidí přesně tahle čísla jako dřív.
const CIL_KCAL_VYCHOZI = 300
const CIL_TRENINK_MIN_VYCHOZI = 20

const formatCasMinSek = (sekund: number): string => {
  if (sekund === 0) return '0 s'
  if (sekund < 60) return `${sekund} s`
  return `${Math.floor(sekund / 60)} min ${sekund % 60} s`
}

// ==========================================
// Fitness Room — druhá vlajková appka (viz FlagshipShell.tsx pro celé
// zdůvodnění rozděleného pláště). Na rozdíl od School Roomu nemá
// "Můj widget" panel vůbec — tělo je vlastní přehled/cíle/rychlý
// trénink, proto se sem MujWidgetPanel neimportuje.
//
// Form Check je jediná appka přesunutá sem zatím (jenVeVlajkoveAppce
// v useAppStore.ts) — "Apps" velká karta (na rozdíl od School Roomu
// si tenhle název podržela, referenční návrh ji nepřejmenovával)
// rozbaluje NastrojeSheet.tsx s jednou jedinou položkou. "Soubory"
// deep-linkuje do File Manageru stejně jako School Room — obecná
// appka na ukládání souborů, nic nebrání dvěma vlajkovým appkám
// odkazovat na tu samou.
//
// Skutečná data místo tři: appka nemá krokoměr ani senzor spánku
// nikde v kódu, takže "Kroky"/"Spánek" jsou natvrdo "zatím
// nesledujeme", ne vymyšlené číslo, co by vypadalo jako naměřené.
// "Kalorie" je výslovně označený odhad (fitnessStats.ts), "Trénink"
// jediný skutečně přesný údaj (součet trvaniSekund dnešních sezení
// Form Checku).
// ==========================================

export const FitnessRoomModule: React.FC = () => {
  const navigate = useNavigate()
  const setActiveAppId = useAppStore((s) => s.setActiveAppId)
  const { sezeni } = useFormCheck()
  const cile = useFitnessCil()
  const [notifOpen, setNotifOpen] = useState(false)
  const [appsOtevrene, setAppsOtevrene] = useState(false)
  const [upravujeCile, setUpravujeCile] = useState(false)

  const otevritFormCheck = () => {
    setActiveAppId('form-check', '/fitness')
    navigate('/apps')
  }

  const { dnes, vcera } = spocitatFitnessPrehled(sezeni)
  const rekordy = spocitejOsobniRekordy(sezeni)
  const serie = spocitejSeriiTreninku(sezeni)
  const treninkovychDniZaTyden = spocitejTreninkovychDniZaTyden(sezeni)
  const aktivita = spocitejAktivituPodleDne(sezeni, 14)
  const maxMinutAktivity = Math.max(1, ...aktivita.map((d) => d.minutTreninku))

  const cilKcal = cile.cilKcal ?? CIL_KCAL_VYCHOZI
  const cilTreninkMin = cile.cilTreninkMin ?? CIL_TRENINK_MIN_VYCHOZI

  const kcalProgres = Math.min(100, Math.round((dnes.odhadKcal / cilKcal) * 100))
  const treninkProgres = Math.min(100, Math.round((dnes.minutTreninku / cilTreninkMin) * 100))
  const pocetDokoncenychCilu = [kcalProgres, treninkProgres].filter((p) => p >= 100).length

  const nastroje: FlagshipDlazdice[] = [
    {
      id: 'form-check',
      nazev: 'Form Check',
      popis: 'Počítání cviků přes kameru',
      ikona: 'form-check',
      barva: 'orange',
      onClick: otevritFormCheck,
    },
  ]

  const velkeKarty: FlagshipVelkaKarta[] = [
    {
      id: 'soubory',
      nazev: 'Soubory',
      popis: 'Ukládej tréninky, plány a výsledky',
      ikona: 'file-manager',
      barva: 'cyan',
      onClick: () => {
        setActiveAppId('file-manager', '/fitness')
        navigate('/apps')
      },
    },
    {
      id: 'apps',
      nazev: 'Apps',
      popis: 'Oblíbené fitness aplikace na dosah',
      ikona: 'grid',
      barva: 'purple',
      onClick: () => setAppsOtevrene(true),
    },
  ]

  return (
    <>
      <FlagshipShell
        nazev="Fitness Room"
        popisHlavicky="Trénuj chytře"
        ikonaHlavicky="dumbbell"
        velkeKarty={velkeKarty}
        notifOpen={notifOpen}
        onOpenNotifications={() => setNotifOpen(true)}
        onCloseNotifications={() => setNotifOpen(false)}
      >
        <div className="fit-panel">
          <div className="fit-panel-hlavicka">
            <div>
              <h2>Moje přehled</h2>
              <p>Dnes je skvělý den na trénink!</p>
            </div>
            <button className="fit-historie-btn" aria-label="Historie tréninků" onClick={otevritFormCheck}>
              <AppIcon name="calendar" size={18} />
            </button>
          </div>

          <div className="fit-prehled-telo">
            <div className="fit-postava" aria-hidden="true">
              <span className="fit-postava-emoji">🏋️</span>
            </div>

            <div className="fit-staty">
              <div className="fit-stat-radek">
                <span className="fit-stat-ikona fs-barva--orange">
                  <AppIcon name="flame" size={18} />
                </span>
                <span className="fit-stat-text">
                  <span className="fit-stat-nazev">Kalorie (odhad)</span>
                  <span className="fit-stat-hodnota">
                    {dnes.odhadKcal} <small>kcal</small>
                  </span>
                </span>
                <span className="fit-stat-delta">{formatujRozdil(dnes.odhadKcal, vcera.odhadKcal)}</span>
              </div>

              <div className="fit-stat-radek">
                <span className="fit-stat-ikona fs-barva--purple">
                  <AppIcon name="dumbbell" size={18} />
                </span>
                <span className="fit-stat-text">
                  <span className="fit-stat-nazev">Trénink</span>
                  <span className="fit-stat-hodnota">
                    {dnes.minutTreninku} <small>min</small>
                  </span>
                </span>
                <span className="fit-stat-delta">{formatujRozdil(dnes.minutTreninku, vcera.minutTreninku)}</span>
              </div>

              <div className="fit-stat-radek fit-stat-radek--nesledujeme">
                <span className="fit-stat-ikona fs-barva--green">
                  <AppIcon name="footprints" size={18} />
                </span>
                <span className="fit-stat-text">
                  <span className="fit-stat-nazev">Kroky</span>
                  <span className="fit-stat-hodnota-nesledujeme">Zatím nesledujeme</span>
                </span>
              </div>

              <div className="fit-stat-radek fit-stat-radek--nesledujeme">
                <span className="fit-stat-ikona fs-barva--cyan">
                  <AppIcon name="moon" size={18} />
                </span>
                <span className="fit-stat-text">
                  <span className="fit-stat-nazev">Spánek</span>
                  <span className="fit-stat-hodnota-nesledujeme">Zatím nesledujeme</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {sezeni.length > 0 && (
          <div className="fit-panel">
            <div className="fit-panel-hlavicka">
              <h2>🏆 Osobní rekordy</h2>
            </div>

            <div className="fit-rekordy-mrizka">
              <div className="fit-rekord-dlazdice">
                <span className="fit-rekord-hodnota">{formatCasMinSek(rekordy.nejdelsiSezeniSekund)}</span>
                <span className="fit-rekord-popis">Nejdelší sezení</span>
              </div>
              <div className="fit-rekord-dlazdice">
                <span className="fit-rekord-hodnota">{rekordy.nejvicOpakovaniZaDen}</span>
                <span className="fit-rekord-popis">Nejvíc opakování za den</span>
              </div>
              <div className="fit-rekord-dlazdice">
                <span className="fit-rekord-hodnota">{serie}</span>
                <span className="fit-rekord-popis">{plural(serie, 'den v řadě', 'dny v řadě', 'dní v řadě')}</span>
              </div>
            </div>
          </div>
        )}

        <div className="fit-panel">
          <div className="fit-panel-hlavicka">
            <h2>Aktivita za 14 dní</h2>
          </div>

          <div className="fit-graf" role="img" aria-label="Sloupcový graf tréninkových minut za posledních 14 dní">
            {aktivita.map((d) => (
              <div key={d.datum} className="fit-graf-sloupec-wrap">
                <div
                  className={`fit-graf-sloupec ${d.minutTreninku > 0 ? 'fit-graf-sloupec--aktivni' : ''}`}
                  style={{ height: `${Math.max(6, (d.minutTreninku / maxMinutAktivity) * 100)}%` }}
                  title={`${new Date(d.datum).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}: ${d.minutTreninku} min`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="fit-panel">
          <div className="fit-panel-hlavicka">
            <div>
              <h2>Dnešní cíl</h2>
              <span className="fit-cile-pocet">{pocetDokoncenychCilu} z 2 dokončeno</span>
            </div>
            <button
              className="fit-historie-btn"
              aria-label="Upravit cíle"
              onClick={() => setUpravujeCile((v) => !v)}
            >
              ✏️
            </button>
          </div>

          {upravujeCile && (
            <div className="fit-cile-editace">
              <label>
                Cíl kalorií
                <input
                  type="number"
                  min={1}
                  value={cile.cilKcal ?? ''}
                  placeholder={String(CIL_KCAL_VYCHOZI)}
                  onChange={(e) => cile.setCilKcal(e.target.value === '' ? null : Number(e.target.value))}
                />
              </label>
              <label>
                Cíl tréninku (min)
                <input
                  type="number"
                  min={1}
                  value={cile.cilTreninkMin ?? ''}
                  placeholder={String(CIL_TRENINK_MIN_VYCHOZI)}
                  onChange={(e) => cile.setCilTreninkMin(e.target.value === '' ? null : Number(e.target.value))}
                />
              </label>
              <label>
                Tréninky týdně (nepovinné)
                <input
                  type="number"
                  min={1}
                  value={cile.cilTreninkuTydne ?? ''}
                  placeholder="např. 3"
                  onChange={(e) => cile.setCilTreninkuTydne(e.target.value === '' ? null : Number(e.target.value))}
                />
              </label>
            </div>
          )}

          <div className="fit-krouzky">
            <div className="fit-krouzek-wrap">
              <div
                className="fit-krouzek fit-barva-krouzek--orange"
                style={{ '--fit-progres': `${kcalProgres}%` } as React.CSSProperties}
              >
                <AppIcon name="flame" size={20} />
              </div>
              <span className="fit-krouzek-nazev">{cilKcal} kcal</span>
              <span className="fit-krouzek-hodnota fit-text--orange">
                {dnes.odhadKcal} / {cilKcal}
              </span>
            </div>

            <div className="fit-krouzek-wrap">
              <div
                className="fit-krouzek fit-barva-krouzek--purple"
                style={{ '--fit-progres': `${treninkProgres}%` } as React.CSSProperties}
              >
                <AppIcon name="dumbbell" size={20} />
              </div>
              <span className="fit-krouzek-nazev">{cilTreninkMin} min</span>
              <span className="fit-krouzek-hodnota fit-text--purple">
                {dnes.minutTreninku} / {cilTreninkMin}
              </span>
            </div>

            <div className="fit-krouzek-wrap fit-krouzek-wrap--brzy">
              <div className="fit-krouzek fit-krouzek--brzy">
                <AppIcon name="footprints" size={20} />
              </div>
              <span className="fit-krouzek-nazev">Kroky</span>
              <span className="fit-krouzek-hodnota">Brzy</span>
            </div>

            <div className="fit-krouzek-wrap fit-krouzek-wrap--brzy">
              <div className="fit-krouzek fit-krouzek--brzy">
                <AppIcon name="moon" size={20} />
              </div>
              <span className="fit-krouzek-nazev">Spánek</span>
              <span className="fit-krouzek-hodnota">Brzy</span>
            </div>
          </div>

          {cile.cilTreninkuTydne !== null && (
            <div className="fit-tydenni-cil">
              <div className="fit-tydenni-cil-hlavicka">
                <span>Tréninky tento týden</span>
                <span>
                  {treninkovychDniZaTyden} / {cile.cilTreninkuTydne}
                </span>
              </div>
              <div
                className="fit-tydenni-cil-pruh"
                role="progressbar"
                aria-valuenow={treninkovychDniZaTyden}
                aria-valuemin={0}
                aria-valuemax={cile.cilTreninkuTydne}
              >
                <div
                  className="fit-tydenni-cil-vypln"
                  style={{ width: `${Math.min(100, (treninkovychDniZaTyden / cile.cilTreninkuTydne) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="fit-panel">
          <div className="fit-panel-hlavicka">
            <h2>Rychlý trénink</h2>
            <button className="fit-zobrazit-vse" onClick={otevritFormCheck}>
              Zobrazit vše ›
            </button>
          </div>

          <div className="fit-treninky-mrizka">
            <button className="fit-trenink-dlazdice" onClick={otevritFormCheck}>
              <span className="fit-text--purple">
                <AppIcon name="dumbbell" size={22} />
              </span>
              <span className="fit-trenink-nazev">Síla</span>
              <span className="fit-trenink-popis">Dřep / Klik</span>
            </button>
            {[
              { nazev: 'Kardio', popis: '20 min', ikona: 'flame', barva: 'orange' },
              { nazev: 'Mobilita', popis: '15 min', ikona: 'moon', barva: 'cyan' },
              { nazev: 'Core', popis: '10 min', ikona: 'bar-chart', barva: 'green' },
            ].map((t) => (
              <button key={t.nazev} className="fit-trenink-dlazdice fit-trenink-dlazdice--brzy" disabled>
                <span className={`fit-text--${t.barva}`}>
                  <AppIcon name={t.ikona} size={22} />
                </span>
                <span className="fit-trenink-nazev">{t.nazev}</span>
                <span className="fit-trenink-popis">{t.popis}</span>
                <span className="fit-trenink-brzy">Brzy</span>
              </button>
            ))}
          </div>
        </div>
      </FlagshipShell>

      {appsOtevrene && <NastrojeSheet nadpis="Apps" nastroje={nastroje} onZavrit={() => setAppsOtevrene(false)} />}
    </>
  )
}

export default FitnessRoomModule
