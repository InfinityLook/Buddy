import React from 'react'
import { AppIcon } from '@/pages/app/components/AppIcon'
import type { FlagshipDlazdice } from '../shared/types'

interface Props {
  nastroje: FlagshipDlazdice[]
  onZavrit: () => void
}

// ==========================================
// Rozbalovací seznam nástrojů za "Nástroje" velkou kartou (dřív "Apps",
// viz SchoolRoomModule.tsx) — čistě spouštěcí seznam, ne výběr do
// slotu jako WidgetPickerSheet.tsx, proto žádný "is-aktivni" stav ani
// tlačítko "Odebrat". Sdílí s ním ale stejné .fs-picker-* třídy
// (FlagshipShell.css) — vizuálně je to stejný tvar dialogu, jen s
// jednodušším obsahem, žádný důvod stavět druhou sadu stylů.
// ==========================================

export const NastrojeSheet: React.FC<Props> = ({ nastroje, onZavrit }) => (
  <>
    <div className="fs-overlay" onClick={onZavrit} />
    <div className="fs-picker" role="dialog" aria-label="Nástroje">
      <div className="fs-picker-hlavicka">
        <h3>Nástroje</h3>
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
