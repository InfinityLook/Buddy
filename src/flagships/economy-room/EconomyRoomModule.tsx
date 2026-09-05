import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/core/store/useAppStore'
import { useFinance } from '@/miniapps/finance/useFinance'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { FlagshipShell } from '../shared/FlagshipShell'
import { NastrojeSheet } from '../shared/NastrojeSheet'
import { spocitatMesicniSrovnani, formatujRozdilMesic } from './economyStats'
import type { FlagshipDlazdice, FlagshipVelkaKarta } from '../shared/types'
import './EconomyRoomModule.css'

// Barvy prstenců "Výdaje podle kategorie" — stejná paleta jako Finance's
// vlastní PALETA v Finance.tsx (pět z jejích sedmi barev), ať appka
// nepůsobí, že pro tu samou kategorii používá dvě různá schémata na
// dvou různých obrazovkách.
const PALETA_PRSTENCU = ['#38bdf8', '#a855f7', '#f472b6', '#fbbf24']

// Kolik kategorií výdajů se zobrazí jako prstence — Finance's vlastní
// donut ukazuje všechny, ale čtyři prstence vedle sebe jsou strop, kdy
// se to ještě vejde do jednoho řádku bez zmenšení pod čitelnost.
const MAX_PRSTENCU = 4

// ==========================================
// Economy Room — třetí vlajková appka (viz FlagshipShell.tsx pro celé
// zdůvodnění rozděleného pláště). Stejně jako Fitness Room nemá "Můj
// widget" panel — tělo je vlastní přehled/rozdělení podle kategorie/
// rychlé akce, proto se sem MujWidgetPanel neimportuje.
//
// Finance je jediná appka přesunutá sem (jenVeVlajkoveAppce v
// useAppStore.ts) — "Apps" velká karta (jméno podržené stejně jako u
// Fitness Room, ne přejmenované na "Nástroje" jako u School Roomu)
// rozbaluje NastrojeSheet.tsx s jednou jedinou položkou. "Soubory"
// deep-linkuje do File Manageru stejně jako obě předchozí vlajkové
// appky — obecná appka na ukládání souborů, nic nebrání třem vlajkovým
// appkám odkazovat na tu samou.
//
// Návrh vzhledu byl nejdřív odsouhlasen jako statický náhled (Artifact,
// bez napojení na appku) — teprve po schválení vznikl tenhle skutečný
// build s reálnými daty z useFinance().
//
// "Rozpočet" z náhledu se přejmenoval na "Výdaje podle kategorie",
// protože appka nikde nemá skutečný koncept rozpočtového limitu (žádné
// uživatelem nastavené cílové částky na kategorii) — ukazovat prstence
// jako "370 z 500" by znamenalo vymyslet cílovou hodnotu, kterou appka
// fakticky nezná, přesně to, co CLAUDE.md's "poctivé zpřístupnění dat"
// zásada (viz Fitness Room's Kroky/Spánek) zakazuje. Prstence místo
// toho ukazují skutečný podíl výdajů podle kategorie za tento měsíc
// (stejné číslo, jaké Finance's vlastní donut graf používá), ne
// procento nedosažitelného cíle.
// ==========================================

export const EconomyRoomModule: React.FC = () => {
  const navigate = useNavigate()
  const setActiveAppId = useAppStore((s) => s.setActiveAppId)
  const { zustatek, prijmyObdobi, vydajeObdobi, kategorieVydaje, transactions } = useFinance()
  const [notifOpen, setNotifOpen] = useState(false)
  const [appsOtevrene, setAppsOtevrene] = useState(false)

  const otevritFinance = () => {
    setActiveAppId('finance', '/economy')
    navigate('/apps')
  }

  const { prijmyMinuly, vydajeMinuly } = spocitatMesicniSrovnani(transactions)
  const prstence = kategorieVydaje.slice(0, MAX_PRSTENCU)

  const nastroje: FlagshipDlazdice[] = [
    {
      id: 'finance',
      nazev: 'Finance',
      popis: 'Příjmy, výdaje a přehled podle kategorie',
      ikona: 'finance',
      barva: 'green',
      onClick: otevritFinance,
    },
  ]

  const velkeKarty: FlagshipVelkaKarta[] = [
    {
      id: 'soubory',
      nazev: 'Soubory',
      popis: 'Ukládej účtenky a výpisy na jednom místě',
      ikona: 'file-manager',
      barva: 'cyan',
      onClick: () => {
        setActiveAppId('file-manager', '/economy')
        navigate('/apps')
      },
    },
    {
      id: 'apps',
      nazev: 'Apps',
      popis: 'Finance a další nástroje na peníze',
      ikona: 'grid',
      barva: 'purple',
      onClick: () => setAppsOtevrene(true),
    },
  ]

  return (
    <>
      <FlagshipShell
        nazev="Economy Room"
        popisHlavicky="Peníze pod kontrolou"
        ikonaHlavicky="finance"
        velkeKarty={velkeKarty}
        notifOpen={notifOpen}
        onOpenNotifications={() => setNotifOpen(true)}
        onCloseNotifications={() => setNotifOpen(false)}
      >
        <div className="eco-panel">
          <div className="eco-panel-hlavicka">
            <div>
              <h2>Moje finance</h2>
              <p>Zůstatek a pohyby tohoto měsíce</p>
            </div>
            <button className="eco-historie-btn" aria-label="Otevřít Finance" onClick={otevritFinance}>
              <AppIcon name="finance" size={18} />
            </button>
          </div>

          <div className="eco-prehled-telo">
            <div className="eco-postava" aria-hidden="true">
              <span className="eco-postava-emoji">💰</span>
            </div>

            <div className="eco-staty">
              <div className="eco-stat-radek">
                <span className="eco-stat-ikona fs-barva--green">
                  <AppIcon name="finance" size={18} />
                </span>
                <span className="eco-stat-text">
                  <span className="eco-stat-nazev">Zůstatek</span>
                  <span className={`eco-stat-hodnota ${zustatek < 0 ? 'je-zaporny' : ''}`}>
                    {zustatek.toLocaleString('cs-CZ')} <small>Kč</small>
                  </span>
                </span>
              </div>

              <div className="eco-stat-radek">
                <span className="eco-stat-ikona fs-barva--cyan">
                  <AppIcon name="plus" size={18} />
                </span>
                <span className="eco-stat-text">
                  <span className="eco-stat-nazev">Příjmy (tento měsíc)</span>
                  <span className="eco-stat-hodnota">
                    +{prijmyObdobi.toLocaleString('cs-CZ')} <small>Kč</small>
                  </span>
                </span>
                <span className="eco-stat-delta">{formatujRozdilMesic(prijmyObdobi, prijmyMinuly)}</span>
              </div>

              <div className="eco-stat-radek">
                <span className="eco-stat-ikona fs-barva--orange">
                  <AppIcon name="minus" size={18} />
                </span>
                <span className="eco-stat-text">
                  <span className="eco-stat-nazev">Výdaje (tento měsíc)</span>
                  <span className="eco-stat-hodnota">
                    −{vydajeObdobi.toLocaleString('cs-CZ')} <small>Kč</small>
                  </span>
                </span>
                <span className="eco-stat-delta">{formatujRozdilMesic(vydajeObdobi, vydajeMinuly)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="eco-panel">
          <div className="eco-panel-hlavicka">
            <h2>Výdaje podle kategorie</h2>
            <span className="eco-obdobi-znacka">Tento měsíc</span>
          </div>

          {prstence.length === 0 ? (
            <p className="eco-prazdno">Zatím žádné výdaje tento měsíc.</p>
          ) : (
            <div className="eco-krouzky">
              {prstence.map((v, i) => (
                <div key={v.category} className="eco-krouzek-wrap">
                  <div
                    className="eco-krouzek"
                    style={
                      {
                        '--eco-progres': `${Math.round(v.percent)}%`,
                        '--eco-ring-barva': PALETA_PRSTENCU[i % PALETA_PRSTENCU.length],
                      } as React.CSSProperties
                    }
                  >
                    <span className="eco-krouzek-procent">{Math.round(v.percent)}%</span>
                  </div>
                  <span className="eco-krouzek-nazev">{v.category}</span>
                  <span className="eco-krouzek-hodnota">{v.amount.toLocaleString('cs-CZ')} Kč</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="eco-panel">
          <div className="eco-panel-hlavicka">
            <h2>Rychlé akce</h2>
          </div>

          <div className="eco-akce-mrizka">
            <button className="eco-akce-dlazdice" onClick={otevritFinance}>
              <span className="eco-text--green">
                <AppIcon name="plus" size={22} />
              </span>
              <span className="eco-akce-nazev">Příjem</span>
            </button>
            <button className="eco-akce-dlazdice" onClick={otevritFinance}>
              <span className="eco-text--orange">
                <AppIcon name="minus" size={22} />
              </span>
              <span className="eco-akce-nazev">Výdaj</span>
            </button>
            <button className="eco-akce-dlazdice" onClick={otevritFinance}>
              <span className="eco-text--cyan">
                <AppIcon name="bar-chart" size={22} />
              </span>
              <span className="eco-akce-nazev">Přehled</span>
            </button>
            <button className="eco-akce-dlazdice" onClick={otevritFinance}>
              <span className="eco-text--purple">
                <AppIcon name="grid" size={22} />
              </span>
              <span className="eco-akce-nazev">Kategorie</span>
            </button>
          </div>
        </div>
      </FlagshipShell>

      {appsOtevrene && <NastrojeSheet nadpis="Apps" nastroje={nastroje} onZavrit={() => setAppsOtevrene(false)} />}
    </>
  )
}

export default EconomyRoomModule
