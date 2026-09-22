import React, { useMemo, useState } from 'react'
import { AppIcon } from './AppIcon'
import { normalizeText } from '@/core/utils/text'
import type { AppItem } from '@/core/store/useAppStore'
import './RychleSpusteni.css'

interface RychleSpusteniProps {
  miniaplikace: AppItem[]
  onOpen: (id: string) => void
}

// ==========================================
// Nahrazuje starý AppToolbar/AppCard-grid/AppBanner blok pod
// carouselem Roomů (viz CLAUDE.md) — ten byl navždy prázdný, protože
// úplně každá appka v DEFAULT_APPS má dnes jenVeVlajkoveAppce: true.
// Appky bez vlastní route (ty, co appka umí otevřít jen deep-linkem
// dovnitř nějakého Roomu, ne jako vlastní stránku) tu ale pořád
// existují — jen se z hlavní mřížky přesunuly do Roomů. Tenhle blok
// je dělá znovu dosažitelné, rovnou z /apps, bez nutnosti procházet
// příslušný Room a jeho "Nástroje" sheet.
//
// Otevření je pořád ten samý setActiveAppId(id) appka odjakživa
// používá pro deep-link do miniaplikace (Hub's daily-challenge
// banner, School Roomovy dlaždice) — appky samy jsou dál registrované
// v MINI_APP_REGISTRY beze změny, jen se sem přidal další vstupní bod.
// ==========================================

export const RychleSpusteni: React.FC<RychleSpusteniProps> = ({ miniaplikace, onOpen }) => {
  const [dotaz, setDotaz] = useState('')

  const filtrovane = useMemo(() => {
    const q = normalizeText(dotaz.trim())
    if (q === '') return miniaplikace
    return miniaplikace.filter(
      (app) => normalizeText(app.title).includes(q) || normalizeText(app.category).includes(q)
    )
  }, [miniaplikace, dotaz])

  // Pořadí kategorií podle toho, v jakém appka appky historicky
  // přidávala do DEFAULT_APPS (ne abecedně) — stejná reasoning jako
  // roomStranky.ts's pořadí Roomů: aspoň odněkud odvozené, ne libovolné.
  const kategorie = useMemo(() => {
    const videne = new Set<string>()
    const poradi: string[] = []
    for (const app of filtrovane) {
      if (!videne.has(app.category)) {
        videne.add(app.category)
        poradi.push(app.category)
      }
    }
    return poradi
  }, [filtrovane])

  return (
    <section className="rs-section">
      <h2 className="rs-nadpis">
        <AppIcon name="rocket" size={18} />
        Rychlé spuštění
      </h2>
      <p className="rs-popis">Hledej napříč appkami uvnitř Roomů — klepnutím skočíš rovnou dovnitř.</p>

      <div className="rs-search-box">
        <AppIcon name="search" size={18} className="rs-search-icon" />
        <input
          type="text"
          placeholder="Hledej appku…"
          value={dotaz}
          onChange={(e) => setDotaz(e.target.value)}
        />
        {dotaz && (
          <button className="rs-search-clear" aria-label="Vymazat hledání" onClick={() => setDotaz('')}>
            <AppIcon name="x" size={14} />
          </button>
        )}
      </div>

      {filtrovane.length === 0 ? (
        <p className="rs-prazdno">Appka nic nenašla pro „{dotaz}“.</p>
      ) : (
        kategorie.map((kat) => (
          <div key={kat} className="rs-skupina">
            <h3 className="rs-skupina-nadpis">{kat}</h3>
            <div className="rs-mrizka">
              {filtrovane
                .filter((app) => app.category === kat)
                .map((app) => (
                  <button
                    key={app.id}
                    className="rs-dlazdice"
                    onClick={() => onOpen(app.id)}
                  >
                    <span className={`rs-dlazdice-ikona ${app.color}`}>
                      <AppIcon name={app.icon} size={22} />
                    </span>
                    <span className="rs-dlazdice-nazev">{app.title}</span>
                  </button>
                ))}
            </div>
          </div>
        ))
      )}
    </section>
  )
}
