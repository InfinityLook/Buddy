import React from 'react'
import { SurvivalHerniStav } from '../types'
import { PERKY } from '../data/perky'
import { SYNERGIE } from '../data/synergie'

// ==========================================
// Bod 12 zadání, poslední zbývající kus ("přehled buildu/synergií na
// obrazovce") — appka od kroku 3/4 už počítala/aplikovala synergie
// správně (viz engine.ts's zkontrolujSynergie), jen je nikde
// nezobrazovala jinak než jednorázovým řádkem v logu (stav.log), který
// za pár vteřin zmizí pod novějšími zprávami. Tenhle panel čte
// stav.ziskanePerky/stav.aplikovaneSynergie znovu KDYKOLI je otevřený —
// appka si nic nepamatuje navíc, jen zobrazuje, co engine už dávno
// sleduje.
//
// Nepozastavuje hru (na rozdíl od LevelUpPrompt/ExtractionPrompt) —
// tohle je čistě informativní přehled "jak na tom jsem", ne rozhodnutí,
// na které appka musí čekat, takže simulace pod ním klidně běží dál.
// ==========================================

interface Props {
  stav: SurvivalHerniStav
  onZavrit: () => void
}

export const BuildPanel: React.FC<Props> = ({ stav, onZavrit }) => {
  const perkyZaznamy = Object.entries(stav.ziskanePerky)
    .map(([id, pocet]) => ({ perk: PERKY.find((p) => p.id === id), pocet }))
    .filter((z): z is { perk: (typeof PERKY)[number]; pocet: number } => !!z.perk)
    .sort((a, b) => b.pocet - a.pocet)

  const synergieZaznamy = stav.aplikovaneSynergie.map((id) => SYNERGIE.find((s) => s.id === id)).filter((s): s is (typeof SYNERGIE)[number] => !!s)

  return (
    <div className="sn-build-prekryv" onClick={onZavrit}>
      <div className="sn-build-karta" onClick={(e) => e.stopPropagation()}>
        <div className="sn-build-hlavicka">
          <h2 className="sn-build-nadpis">📊 Můj build</h2>
          <button className="sn-build-zavrit" onClick={onZavrit} aria-label="Zavřít přehled buildu">
            ✕
          </button>
        </div>

        <section className="sn-build-sekce">
          <h3 className="sn-build-sekce-nadpis">Perky</h3>
          {perkyZaznamy.length === 0 ? (
            <p className="sn-build-prazdno">Zatím žádné perky — dosáhni další úrovně.</p>
          ) : (
            <ul className="sn-build-seznam">
              {perkyZaznamy.map(({ perk, pocet }) => (
                <li key={perk.id} className="sn-build-polozka">
                  <span className="sn-build-ikona">{perk.ikona}</span>
                  <span className="sn-build-jmeno">{perk.jmeno}</span>
                  {pocet > 1 && <span className="sn-build-pocet">×{pocet}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="sn-build-sekce">
          <h3 className="sn-build-sekce-nadpis">Synergie</h3>
          {synergieZaznamy.length === 0 ? (
            <p className="sn-build-prazdno">Zatím žádná synergie — kombinuj nebo stackuj perky.</p>
          ) : (
            <ul className="sn-build-seznam sn-build-seznam--synergie">
              {synergieZaznamy.map((s) => (
                <li key={s.id} className="sn-build-polozka sn-build-polozka--synergie">
                  <span className="sn-build-ikona">{s.ikona}</span>
                  <div className="sn-build-synergie-text">
                    <span className="sn-build-jmeno">{s.jmeno}</span>
                    <span className="sn-build-synergie-popis">{s.popis}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
