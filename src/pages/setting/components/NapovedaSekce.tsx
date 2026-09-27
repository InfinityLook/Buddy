import React from 'react'
import { AppBottomNav } from '@/components/AppBottomNav'
import { HubNavod } from './napoveda/HubNavod'
import { PodporaNavod } from './napoveda/PodporaNavod'
import { ProfilNavod } from './napoveda/ProfilNavod'
import { ZalohujemiNavod } from './napoveda/ZalohujemiNavod'
import { ZvukVzhledNavod } from './napoveda/ZvukVzhledNavod'

// ==========================================
// Nastavení — Nápověda. Přehled návodů na používání aplikace.
// ==========================================

export const NapovedaSekce: React.FC = () => {
  const onVratit = () => undefined

  return (
    <div className="settings-page">
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon blue" aria-hidden="true">📘</span>
          <div>
            <h1 className="settings-card-title">Nápověda</h1>
            <p className="settings-card-sub">Průvodce používáním aplikace Buddy</p>
          </div>
        </div>
      </section>

      <HubNavod onVratit={onVratit} />
      <ProfilNavod onVratit={onVratit} />
      <ZvukVzhledNavod onVratit={onVratit} />
      <ZalohujemiNavod onVratit={onVratit} />
      <PodporaNavod onVratit={onVratit} />

      <AppBottomNav />
    </div>
  )
}

export default NapovedaSekce
