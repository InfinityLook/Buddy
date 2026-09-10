import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/core/store/useAppStore'
import { useBookWriter } from '@/miniapps/book-writer/useBookWriter'
import { celkovyPocetSlov, serazenoPodleUpravy as serazenoPodleUpravyKnih } from '@/miniapps/book-writer/types'
import { useScreenplayWriter } from '@/miniapps/screenplay-writer/useScreenplayWriter'
import { serazenoPodleUpravy as serazenoPodleUpravyScenaru } from '@/miniapps/screenplay-writer/types'
import { useComicWriter } from '@/miniapps/comic-writer/useComicWriter'
import { celkovyPocetPanelu, serazenoPodleUpravy as serazenoPodleUpravyKomiksu } from '@/miniapps/comic-writer/types'
import { plural } from '@/core/utils/pluralCZ'
import { FlagshipShell } from '../shared/FlagshipShell'
import { NastrojeSheet } from '../shared/NastrojeSheet'
import { spocitejDnesniTvorbu, spocitejTvorbuPodleDne } from './writerRoomStats'
import { useWriterRoomCil } from './useWriterRoomCil'
import type { FlagshipDlazdice, FlagshipVelkaKarta } from '../shared/types'
import './WriterRoomModule.css'

// ==========================================
// Writer's Room — šestá vlajková appka, a první, co drží tři úplně
// samostatné appky (Kniha/Scénář/Komiks), ne jednu appku se třemi
// záložkami jako Music Studio. Přesouvat Quick Notes/Textový editor sem
// se schválně nemělo — Writer's Room má jen svoje tři nové appky.
//
// Žádný Můj widget panel, stejně jako Fitness/Economy/Growth/Music
// Room — tělo je vlastní přehled tvorby napříč všemi třemi appkami.
// ==========================================

export const WriterRoomModule: React.FC = () => {
  const navigate = useNavigate()
  const setActiveAppId = useAppStore((s) => s.setActiveAppId)
  const { knihy } = useBookWriter()
  const { scenare } = useScreenplayWriter()
  const { komiksy } = useComicWriter()
  const [notifOpen, setNotifOpen] = useState(false)
  const [appsOtevrene, setAppsOtevrene] = useState(false)

  // Podle poslední ÚPRAVY, ne podle založení — jinak by tenhle panel
  // pořád ukazoval naposledy založenou knihu/scénář/komiks, i když se
  // ve skutečnosti dopisuje jiný, starší.
  const posledniKniha = serazenoPodleUpravyKnih(knihy)[0] ?? null
  const posledniScenar = serazenoPodleUpravyScenaru(scenare)[0] ?? null
  const posledniKomiks = serazenoPodleUpravyKomiksu(komiksy)[0] ?? null
  const dnesniTvorba = spocitejDnesniTvorbu(knihy, scenare, komiksy)
  const tvorbaPodleDne = spocitejTvorbuPodleDne(knihy, scenare, komiksy)
  const maxZaDen = Math.max(1, ...tvorbaPodleDne.map((d) => d.pocet))
  const { cilDenne, cilTydenne, setCilDenne, setCilTydenne } = useWriterRoomCil()
  // Cíl je "kolik kapitol/scén/panelů dohromady", stejné kombinované
  // číslo, co dashboard už počítá pro 14denní graf výš — ne "kolik
  // slov", protože scéna/panel žádný cíl počtu slov nemá.
  const dnesPocet = dnesniTvorba.kapitol + dnesniTvorba.scen + dnesniTvorba.panelu
  const tydenniPocet = tvorbaPodleDne.slice(-7).reduce((soucet, d) => soucet + d.pocet, 0)
  const cilDenneProcenta = cilDenne && cilDenne > 0 ? Math.min(100, Math.round((dnesPocet / cilDenne) * 100)) : null
  const cilTydenniProcenta = cilTydenne && cilTydenne > 0 ? Math.min(100, Math.round((tydenniPocet / cilTydenne) * 100)) : null
  const dnesniCasti: string[] = []
  if (dnesniTvorba.kapitol > 0) {
    dnesniCasti.push(`${dnesniTvorba.kapitol} ${plural(dnesniTvorba.kapitol, 'kapitola', 'kapitoly', 'kapitol')}`)
  }
  if (dnesniTvorba.scen > 0) {
    dnesniCasti.push(`${dnesniTvorba.scen} ${plural(dnesniTvorba.scen, 'scéna', 'scény', 'scén')}`)
  }
  if (dnesniTvorba.panelu > 0) {
    dnesniCasti.push(`${dnesniTvorba.panelu} ${plural(dnesniTvorba.panelu, 'panel', 'panely', 'panelů')}`)
  }

  const otevritKnihu = () => {
    setActiveAppId('book-writer', '/spisovatel')
    navigate('/apps')
  }
  const otevritScenare = () => {
    setActiveAppId('screenplay-writer', '/spisovatel')
    navigate('/apps')
  }
  const otevritKomiksy = () => {
    setActiveAppId('comic-writer', '/spisovatel')
    navigate('/apps')
  }

  const nastroje: FlagshipDlazdice[] = [
    { id: 'book-writer', nazev: 'Kniha', popis: 'Piš knihu po kapitolách', ikona: 'book', barva: 'gold', onClick: otevritKnihu },
    { id: 'screenplay-writer', nazev: 'Scénář', popis: 'Scény ve scénáristickém formátu', ikona: 'clapperboard', barva: 'gold', onClick: otevritScenare },
    { id: 'comic-writer', nazev: 'Komiks', popis: 'Strany, panely, dialogy', ikona: 'comic', barva: 'gold', onClick: otevritKomiksy },
  ]

  const velkeKarty: FlagshipVelkaKarta[] = [
    {
      id: 'soubory',
      nazev: 'Soubory',
      popis: 'Ukládej podklady a poznámky k tvorbě',
      ikona: 'file-manager',
      barva: 'cyan',
      onClick: () => {
        setActiveAppId('file-manager', '/spisovatel')
        navigate('/apps')
      },
    },
    {
      id: 'apps',
      nazev: 'Apps',
      popis: 'Kniha, Scénář a Komiks',
      ikona: 'grid',
      barva: 'purple',
      onClick: () => setAppsOtevrene(true),
    },
  ]

  return (
    <>
      <FlagshipShell
        nazev="Writer's Room"
        popisHlavicky="Piš knihy, scénáře i komiksy"
        ikonaHlavicky="book"
        velkeKarty={velkeKarty}
        notifOpen={notifOpen}
        onOpenNotifications={() => setNotifOpen(true)}
        onCloseNotifications={() => setNotifOpen(false)}
      >
        <div className="wr-panel">
          <div className="wr-panel-hlavicka">
            <h2>Moje tvorba</h2>
          </div>
          <div className="wr-staty-mrizka">
            <div className="wr-stat-dlazdice">
              <span className="wr-stat-cislo">{knihy.length}</span>
              <span className="wr-stat-popis">{plural(knihy.length, 'kniha', 'knihy', 'knih')}</span>
            </div>
            <div className="wr-stat-dlazdice">
              <span className="wr-stat-cislo">{scenare.length}</span>
              <span className="wr-stat-popis">{plural(scenare.length, 'scénář', 'scénáře', 'scénářů')}</span>
            </div>
            <div className="wr-stat-dlazdice">
              <span className="wr-stat-cislo">{komiksy.length}</span>
              <span className="wr-stat-popis">{plural(komiksy.length, 'komiks', 'komiksy', 'komiksů')}</span>
            </div>
          </div>
          <p className="wr-dnes">
            {dnesniCasti.length === 0 ? 'Dnes jsi ještě nic nenapsal(a).' : `✍️ Dnes: ${dnesniCasti.join(', ')}`}
          </p>
        </div>

        <div className="wr-panel">
          <div className="wr-panel-hlavicka">
            <h2>Aktivita za posledních 14 dní</h2>
          </div>
          <div className="wr-graf" role="img" aria-label="Graf psací aktivity za posledních 14 dní">
            {tvorbaPodleDne.map((den) => (
              <div className="wr-graf-sloupec" key={den.datumIso}>
                <div className="wr-graf-tyc-obal">
                  <div
                    className={`wr-graf-tyc${den.pocet > 0 ? ' ma-hodnotu' : ''}`}
                    style={{ height: `${Math.max(4, (den.pocet / maxZaDen) * 100)}%` }}
                    title={`${den.label}: ${den.pocet}`}
                  />
                </div>
                <span className="wr-graf-popisek">{den.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="wr-panel">
          <div className="wr-panel-hlavicka">
            <h2>🎯 Psací cíl</h2>
          </div>
          <div className="wr-cil-radek">
            <label htmlFor="wr-cil-denni">Denní cíl (kapitol/scén/panelů dohromady)</label>
            <input
              id="wr-cil-denni"
              type="number"
              min={0}
              placeholder="např. 1"
              value={cilDenne ?? ''}
              onChange={(e) => setCilDenne(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
            />
            {cilDenneProcenta !== null && (
              <>
                <div className="wr-cil-lista" role="progressbar" aria-valuenow={cilDenneProcenta} aria-valuemin={0} aria-valuemax={100}>
                  <div className="wr-cil-vypln" style={{ width: `${cilDenneProcenta}%` }} />
                </div>
                <span className="wr-cil-popisek">
                  {dnesPocet} z {cilDenne} dnes
                </span>
              </>
            )}
          </div>
          <div className="wr-cil-radek">
            <label htmlFor="wr-cil-tydenni">Týdenní cíl</label>
            <input
              id="wr-cil-tydenni"
              type="number"
              min={0}
              placeholder="např. 7"
              value={cilTydenne ?? ''}
              onChange={(e) => setCilTydenne(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
            />
            {cilTydenniProcenta !== null && (
              <>
                <div className="wr-cil-lista" role="progressbar" aria-valuenow={cilTydenniProcenta} aria-valuemin={0} aria-valuemax={100}>
                  <div className="wr-cil-vypln" style={{ width: `${cilTydenniProcenta}%` }} />
                </div>
                <span className="wr-cil-popisek">
                  {tydenniPocet} z {cilTydenne} tento týden
                </span>
              </>
            )}
          </div>
        </div>

        <div className="wr-panel">
          <div className="wr-panel-hlavicka">
            <h2>📖 Kniha</h2>
            <button className="wr-zobrazit-vse" onClick={otevritKnihu}>
              Otevřít ›
            </button>
          </div>
          {!posledniKniha ? (
            <p className="wr-prazdno">Zatím žádná kniha. Založ první v Knize.</p>
          ) : (
            <div className="wr-preview-radek">
              <div className="wr-preview-ikona">📖</div>
              <div className="wr-preview-text">
                <strong>{posledniKniha.nazev}</strong>
                <span>
                  {posledniKniha.kapitoly.length} {plural(posledniKniha.kapitoly.length, 'kapitola', 'kapitoly', 'kapitol')} ·{' '}
                  {celkovyPocetSlov(posledniKniha)} {plural(celkovyPocetSlov(posledniKniha), 'slovo', 'slova', 'slov')}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="wr-panel">
          <div className="wr-panel-hlavicka">
            <h2>🎬 Scénář</h2>
            <button className="wr-zobrazit-vse" onClick={otevritScenare}>
              Otevřít ›
            </button>
          </div>
          {!posledniScenar ? (
            <p className="wr-prazdno">Zatím žádný scénář. Založ první ve Scénáři.</p>
          ) : (
            <div className="wr-preview-radek">
              <div className="wr-preview-ikona">🎬</div>
              <div className="wr-preview-text">
                <strong>{posledniScenar.nazev}</strong>
                <span>
                  {posledniScenar.sceny.length} {plural(posledniScenar.sceny.length, 'scéna napsána', 'scény napsány', 'scén napsáno')}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="wr-panel">
          <div className="wr-panel-hlavicka">
            <h2>💥 Komiks</h2>
            <button className="wr-zobrazit-vse" onClick={otevritKomiksy}>
              Otevřít ›
            </button>
          </div>
          {!posledniKomiks ? (
            <p className="wr-prazdno">Zatím žádný komiks. Založ první v Komiksu.</p>
          ) : (
            <div className="wr-preview-radek">
              <div className="wr-preview-ikona">💥</div>
              <div className="wr-preview-text">
                <strong>{posledniKomiks.nazev}</strong>
                <span>
                  {posledniKomiks.strany.length} {plural(posledniKomiks.strany.length, 'strana', 'strany', 'stran')} ·{' '}
                  {celkovyPocetPanelu(posledniKomiks)} {plural(celkovyPocetPanelu(posledniKomiks), 'panel', 'panely', 'panelů')}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="wr-panel">
          <div className="wr-panel-hlavicka">
            <h2>Rychlé akce</h2>
          </div>
          <div className="wr-akce-mrizka">
            <button className="wr-akce-dlazdice" onClick={otevritKnihu}>
              <span className="wr-text--gold">📖</span>
              <span className="wr-akce-nazev">Nová kniha</span>
            </button>
            <button className="wr-akce-dlazdice" onClick={otevritScenare}>
              <span className="wr-text--gold">🎬</span>
              <span className="wr-akce-nazev">Nový scénář</span>
            </button>
            <button className="wr-akce-dlazdice" onClick={otevritKomiksy}>
              <span className="wr-text--gold">💥</span>
              <span className="wr-akce-nazev">Nový komiks</span>
            </button>
          </div>
        </div>
      </FlagshipShell>

      {appsOtevrene && <NastrojeSheet nadpis="Apps" nastroje={nastroje} onZavrit={() => setAppsOtevrene(false)} />}
    </>
  )
}

export default WriterRoomModule
