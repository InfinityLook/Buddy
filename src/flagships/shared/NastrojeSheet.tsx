import React from 'react'
import { AppIcon } from '@/pages/app/components/AppIcon'
import type { FlagshipDlazdice } from './types'

interface Props {
  nadpis: string
  nastroje: FlagshipDlazdice[]
  onZavrit: () => void
}

// ==========================================
// Rozbalovací seznam appek za velkou kartou "Nástroje"/"Apps" (viz
// SchoolRoomModule.tsx a FitnessRoomModule.tsx) — čistě spouštěcí
// seznam, ne výběr do slotu jako WidgetPickerSheet.tsx, proto žádný
// "is-aktivni" stav ani tlačítko "Odebrat". Sdílí s ním ale stejné
// .fs-picker-* třídy (FlagshipShell.css) — vizuálně je to stejný tvar
// dialogu, jen s jednodušším obsahem, žádný důvod stavět druhou sadu
// stylů. Vytažené do shared/ ve chvíli, kdy Fitness Room potřeboval
// úplně tu samou věc pro svůj vlastní, menší seznam (zatím jen Form
// Check) — `nadpis` je jediné, co se mezi appkami liší.
// ==========================================

export const NastrojeSheet: React.FC<Props> = ({ nadpis, nastroje, onZavrit }) => (
  <>
    <div className="fs-overlay" onClick={onZavrit} />
    <div className="fs-picker" role="dialog" aria-label={nadpis}>
      <div className="fs-picker-hlavicka">
        <h3>{nadpis}</h3>
        <button className="fs-picker-zavrit" aria-label="Zavřít" onClick={onZavrit}>
          <AppIcon name="x" size={16} />
        </button>
      </div>

      <div className="fs-picker-seznam">
        {nastroje.map((n) => (
          <button key={n.id} className="fs-picker-polozka" onClick={n.onClick}>
            <span className={`fs-picker-ikona fs-barva--${n.barva}`}>
              <AppIcon name={n.ikona} size={18} />
            </span>
            <span className="fs-picker-text">
              <strong>{n.nazev}</strong>
              <span>{n.popis}</span>
            </span>
            <AppIcon name="arrow-right" size={15} />
          </button>
        ))}
      </div>
    </div>
  </>
)
