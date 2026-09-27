import React, { useState } from 'react'
import { AppBottomNav } from '@/components/AppBottomNav'
import { HubNavod } from './napoveda/HubNavod'
import { PodporaNavod } from './napoveda/PodporaNavod'
import { ProfilNavod } from './napoveda/ProfilNavod'
import { ZalohujemiNavod } from './napoveda/ZalohujemiNavod'
import { ZvukVzhledNavod } from './napoveda/ZvukVzhledNavod'

type TypNapovedy = 'hub' | 'profil' | 'zvukVzhled' | 'zalohovani' | 'podpora'

interface PoložkaNapovědy {
  id: TypNapovedy
  ikona: string
  titulek: string
  popis: string
  barva: string
}

const POLOZKY_NAPOVEDY: PoložkaNapovědy[] = [
  {
    id: 'hub',
    ikona: '🏠',
    titulek: 'Hub — Tvůj domov',
    popis: 'Jak se orientovat na hlavní obrazovce aplikace',
    barva: 'blue',
  },
  {
    id: 'profil',
    ikona: '👤',
    titulek: 'Tvůj profil',
    popis: 'Osobní údaje, avatar a nastavení profilu',
    barva: 'purple',
  },
  {
    id: 'zvukVzhled',
    ikona: '🎨',
    titulek: 'Zvuk a vzhled',
    popis: 'Jak si Buddyho přizpůsobit podle sebe',
    barva: 'amber',
  },
  {
    id: 'zalohovani',
    ikona: '💾',
    titulek: 'Zálohování dat',
    popis: 'Jak si bezpečně uložit a obnovit svá data',
    barva: 'blue',
  },
  {
    id: 'podpora',
    ikona: '❓',
    titulek: 'Podpora a nápověda',
    popis: 'Co dělat, když potřebuješ pomoc',
    barva: 'purple',
  },
]

// ==========================================
// Nastavení — Nápověda. Nejprve zobrazí menu,
// ze kterého si uživatel vybere konkrétní návod.
// ==========================================

export const NapovedaSekce: React.FC = () => {
  const [vybranaNapoveda, setVybranaNapoveda] = useState<TypNapovedy | null>(null)

  const onVratit = () => setVybranaNapoveda(null)

  const zobrazitNapovedu = () => {
    switch (vybranaNapoveda) {
      case 'hub':
        return <HubNavod />
      case 'profil':
        return <ProfilNavod />
      case 'zvukVzhled':
        return <ZvukVzhledNavod />
      case 'zalohovani':
        return <ZalohujemiNavod />
      case 'podpora':
        return <PodporaNavod />
      default:
        return null
    }
  }

  return (
    <div className="settings-page">
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon blue" aria-hidden="true">📘</span>
          <div>
            <h1 className="settings-card-title">Nápověda</h1>
            <p className="settings-card-sub">
              {vybranaNapoveda ? 'Vybraný návod' : 'Vyber si, s čím potřebuješ poradit'}
            </p>
          </div>
        </div>
      </section>

      {vybranaNapoveda ? (
        <>
          <button type="button" className="settings-back-btn" onClick={onVratit}>
            ← Zpět na přehled nápovědy
          </button>
          {zobrazitNapovedu()}
        </>
      ) : (
        POLOZKY_NAPOVEDY.map((polozka) => (
          <section key={polozka.id} className="settings-card">
            <button
              type="button"
              className="settings-accordion-hlava"
              onClick={() => setVybranaNapoveda(polozka.id)}
            >
              <span
                className={`settings-card-icon ${polozka.barva}`}
                aria-hidden="true"
              >
                {polozka.ikona}
              </span>
              <span>
                <strong className="settings-card-title">{polozka.titulek}</strong>
                <span className="settings-card-sub">{polozka.popis}</span>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          </section>
        ))
      )}

      <AppBottomNav />
    </div>
  )
}

export default NapovedaSekce
