import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHasPermission } from '@/core/role'
import { useAppStore } from '@/core/store/useAppStore'
import { useFinance } from '@/miniapps/finance/useFinance'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { FlagshipShell } from '../shared/FlagshipShell'
import { NastrojeSheet } from '../shared/NastrojeSheet'
import { spocitejPredpovedCashflow } from '@/miniapps/finance/types'
import { spocitatMesicniSrovnani, formatujRozdilMesic, spocitejGrafCistehoJmeni, VYCHOZI_MESICU_JMENI } from './economyStats'
import { FINANCNI_TIPY } from './data/financniTipy'
import type { FlagshipDlazdice, FlagshipVelkaKarta } from '../shared/types'
import './EconomyRoomModule.css'

/** Deterministický "tip dne" podle dne v roce — appka ho nevybírá
 *  náhodně, ať se ve stejný den nikdy neukáže jiný VIP účtům. Stejná
 *  úvaha jako Fitness Roomovo tipDne. */
const financniTipDne = (): string => {
  const zacatekRoku = new Date(new Date().getFullYear(), 0, 0)
  const denRoku = Math.floor((Date.now() - zacatekRoku.getTime()) / 86_400_000)
  return FINANCNI_TIPY[denRoku % FINANCNI_TIPY.length]
}

// Barvy prstenců "Výdaje podle kategorie" — stejná paleta jako Finance's
// vlastní PALETA v Finance.tsx (pět z jejích sedmi barev), ať appka
// nepůsobí, že pro tu samou kategorii používá dvě různá schémata na
// dvou různých obrazovkách.
const PALETA_PRSTENCU = ['#38bdf8', '#a855f7', '#f472b6', '#fbbf24']

// Kolik kategorií výdajů se zobrazí jako prstence — Finance's vlastní
// donut ukazuje všechny, ale čtyři prstence vedle sebe jsou strop, kdy
// se to ještě vejde do jednoho řádku bez zmenšení pod čitelnost.
const MAX_PRSTENCU = 4

const formatDatumKratce = (iso: string): string => {
  const [, mesic, den] = iso.split('-')
  return `${den}.${mesic}.`
}

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
  const { zustatek, prijmyObdobi, vydajeObdobi, kategorieVydaje, transactions, wallets, recurring } = useFinance()
  const [notifOpen, setNotifOpen] = useState(false)
  const [appsOtevrene, setAppsOtevrene] = useState(false)

  const otevritFinance = () => {
    setActiveAppId('finance', '/economy')
    navigate('/apps')
  }

  const otevritKalkulacky = (id: string) => {
    setActiveAppId(id, '/economy')
    navigate('/apps')
  }

  const { prijmyMinuly, vydajeMinuly } = spocitatMesicniSrovnani(transactions)
  const prstence = kategorieVydaje.slice(0, MAX_PRSTENCU)
  const predpoved = spocitejPredpovedCashflow(recurring, zustatek)
  const grafJmeni = spocitejGrafCistehoJmeni(transactions, wallets)

  // ------------------------------------------
  // VIP: zlatý vzhled — session-only, stejný "smí se dívat, ne trvale
  // uložit" tvar jako Fitness Roomův zlatyRezim/Writer's Roomův
  // pergamenRezim. Zpráva se sama schová po pár vteřinách.
  // ------------------------------------------
  const smiVip = useHasPermission('cosmetics.premium')
  const [zlatyRezim, setZlatyRezim] = useState(false)
  const [vipZprava, setVipZprava] = useState<string | null>(null)

  useEffect(() => {
    if (!vipZprava) return
    const timer = window.setTimeout(() => setVipZprava(null), 3500)
    return () => window.clearTimeout(timer)
  }, [vipZprava])

  const handleTogglZlaty = () => {
    if (!smiVip) {
      setVipZprava('Zlatý vzhled je jen pro VIP.')
      return
    }
    setZlatyRezim((v) => !v)
  }

  const panelClass = smiVip && zlatyRezim ? 'eco-panel eco-panel--zlaty' : 'eco-panel'

  const nastroje: FlagshipDlazdice[] = [
    {
      id: 'finance',
      nazev: 'Finance',
      popis: 'Příjmy, výdaje a přehled podle kategorie',
      ikona: 'finance',
      barva: 'green',
      onClick: otevritFinance,
    },
    {
      id: 'sporici-simulator',
      nazev: 'Spořicí simulátor',
      popis: 'Kolik naspoříš se složeným úrokem',
      ikona: 'trending-up',
      barva: 'green',
      onClick: () => otevritKalkulacky('sporici-simulator'),
    },
    {
      id: 'uver-kalkulacka',
      nazev: 'Splátkový kalkulátor',
      popis: 'Amortizace půjčky a plán splácení víc dluhů',
      ikona: 'finance',
      barva: 'orange',
      onClick: () => otevritKalkulacky('uver-kalkulacka'),
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
        <div className={panelClass}>
          <div className="eco-panel-hlavicka">
            <div>
              <h2>Moje finance</h2>
              <p>Zůstatek a pohyby tohoto měsíce</p>
            </div>
            <div className="eco-panel-hlavicka-akce">
              <button
                className={`eco-historie-btn ${smiVip && zlatyRezim ? 'eco-historie-btn--zlaty-aktivni' : ''}`}
                aria-label="Zlatý vzhled (VIP)"
                aria-pressed={zlatyRezim}
                onClick={handleTogglZlaty}
              >
                <AppIcon name="sparkles" size={18} />
              </button>
              <button className="eco-historie-btn" aria-label="Otevřít Finance" onClick={otevritFinance}>
                <AppIcon name="finance" size={18} />
              </button>
            </div>
          </div>

          {vipZprava && <p className="eco-vip-zprava">{vipZprava}</p>}

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

        <div className={panelClass}>
          <div className="eco-panel-hlavicka">
            <h2>Vývoj čistého jmění</h2>
            <span className="eco-obdobi-znacka">Posledních {VYCHOZI_MESICU_JMENI} měsíců</span>
          </div>

          <div className="eco-graf" role="img" aria-label="Sloupcový graf čistého jmění za posledních 6 měsíců">
            {grafJmeni.map((b) => (
              <div key={b.mesic} className="eco-graf-sloupec-wrap">
                <div
                  className="eco-graf-sloupec"
                  style={{ height: `${b.vyskaProcent}%` }}
                  title={`${b.label}: ${b.hodnota.toLocaleString('cs-CZ')} Kč`}
                />
                <span className="eco-graf-popisek">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={panelClass}>
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

        <div className={panelClass}>
          <div className="eco-panel-hlavicka">
            <h2>Předpověď plateb</h2>
            <span className="eco-obdobi-znacka">Podle opakujících se plateb</span>
          </div>

          {predpoved.length === 0 ? (
            <p className="eco-prazdno">Zatím žádné aktivní opakující se platby, není z čeho předpovídat.</p>
          ) : (
            <div className="eco-predpoved-seznam">
              {predpoved.map((p) => (
                <div key={p.recurring.id} className="eco-predpoved-radek">
                  <span className={`eco-predpoved-ikona ${p.recurring.type === 'prijem' ? 'fs-barva--cyan' : 'fs-barva--orange'}`}>
                    <AppIcon name={p.recurring.type === 'prijem' ? 'plus' : 'minus'} size={16} />
                  </span>
                  <span className="eco-predpoved-text">
                    <span className="eco-predpoved-nazev">
                      {p.recurring.note || p.recurring.category} · {formatDatumKratce(p.datum)}
                    </span>
                    <span className="eco-predpoved-castka">
                      {p.recurring.type === 'prijem' ? '+' : '−'}
                      {p.recurring.amount.toLocaleString('cs-CZ')} Kč
                    </span>
                  </span>
                  <span className={`eco-predpoved-zustatek ${p.zustatekPo < 0 ? 'je-zaporny' : ''}`}>
                    {p.zustatekPo.toLocaleString('cs-CZ')} Kč
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={panelClass}>
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

        <div className={panelClass}>
          <div className="eco-panel-hlavicka">
            <h2>Finanční kalkulačky</h2>
            <span className="eco-obdobi-znacka">Nové nástroje</span>
          </div>

          <div className="eco-akce-mrizka eco-akce-mrizka--dva">
            <button className="eco-akce-dlazdice" onClick={() => otevritKalkulacky('sporici-simulator')}>
              <span className="eco-text--green">
                <AppIcon name="trending-up" size={22} />
              </span>
              <span className="eco-akce-nazev">Spořicí simulátor</span>
            </button>
            <button className="eco-akce-dlazdice" onClick={() => otevritKalkulacky('uver-kalkulacka')}>
              <span className="eco-text--orange">
                <AppIcon name="finance" size={22} />
              </span>
              <span className="eco-akce-nazev">Splátkový kalkulátor</span>
            </button>
          </div>
        </div>

        <div className="fs-dlazdice-sekce-hlavicka">
          <span className="fs-dlazdice-sekce-ikona fs-barva--gold">
            <AppIcon name="sparkles" size={14} />
          </span>
          <h3>VIP</h3>
        </div>

        <div className={panelClass}>
          <div className="eco-panel-hlavicka">
            <h2>👑 VIP: Finanční tip dne</h2>
          </div>

          {smiVip ? (
            <p className="eco-tip-dne">
              <AppIcon name="lightbulb" size={16} /> {financniTipDne()}
            </p>
          ) : (
            <button className="eco-vip-zamceno" onClick={() => setVipZprava('Denní finanční tip je jen pro VIP.')}>
              🔒 Odemkni denní finanční tip s VIP
            </button>
          )}
        </div>
      </FlagshipShell>

      {appsOtevrene && <NastrojeSheet nadpis="Apps" nastroje={nastroje} onZavrit={() => setAppsOtevrene(false)} />}
    </>
  )
}

export default EconomyRoomModule
