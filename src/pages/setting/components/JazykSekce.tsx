import React from 'react'

interface Props {
  onToast: (zprava: string) => void
}

interface JazykOption {
  kod: string
  nazev: string
  vlajka: string
  dostupny: boolean
}

// ==========================================
// Nastavení — Jazyk. Appka nemá nikde žádnou i18n infrastrukturu —
// všechny texty napříč celou appkou jsou napevno v češtině (viz
// CLAUDE.md), takže tahle sekce zatím jen poctivě ukazuje, že čeština
// je jediný skutečně fungující jazyk, místo aby předstírala přepínač,
// co by ve skutečnosti nic nepřekládal. Angličtina a němčina jsou
// "Brzy" řádky — appka je nechává vidět, ne mizet (stejná zdrženlivost
// jako appčina Library dlaždice nebo admin panelu BRZY přepínače),
// ale klepnutí na ně to řekne rovnou, ne že by tiše nic neudělalo.
// ==========================================

const JAZYKY: JazykOption[] = [
  { kod: 'cs', nazev: 'Čeština', vlajka: '🇨🇿', dostupny: true },
  { kod: 'en', nazev: 'English', vlajka: '🇬🇧', dostupny: false },
  { kod: 'de', nazev: 'Deutsch', vlajka: '🇩🇪', dostupny: false },
]

export const JazykSekce: React.FC<Props> = ({ onToast }) => {
  return (
    <section className="settings-card">
      <p className="settings-card-sub settings-jazyk-popis">
        Appka zatím umí jen česky — každý text v ní je napevno v češtině. Další jazyky appka plánuje, ale zatím nic
        nepřekládají.
      </p>

      {JAZYKY.map((jazyk) => (
        <div
          key={jazyk.kod}
          className={`settings-toggle-row ${jazyk.dostupny ? '' : 'settings-toggle-row--soon'}`}
        >
          <div className="settings-toggle-text">
            <span className="settings-toggle-title">
              {jazyk.vlajka} {jazyk.nazev}
              {!jazyk.dostupny && <span className="settings-badge-soon">BRZY</span>}
            </span>
          </div>

          {jazyk.dostupny ? (
            <span className="settings-jazyk-stav je-aktivni" aria-label="Aktuální jazyk appky">
              ✓
            </span>
          ) : (
            <button
              type="button"
              className="settings-jazyk-stav je-zamceno"
              aria-label={`${jazyk.nazev} appka zatím nepodporuje`}
              onClick={() => onToast('Tenhle jazyk appka zatím nepodporuje.')}
            >
              🔒
            </button>
          )}
        </div>
      ))}
    </section>
  )
}

export default JazykSekce
