import React from 'react'
import { AppIcon } from '@/pages/app/components/AppIcon'
import type { FlagshipDlazdice } from './types'

interface Props {
  moznosti: FlagshipDlazdice[]
  aktualniId: string | null
  onVybrat: (widgetId: string) => void
  onOdebrat: () => void
  onZavrit: () => void
}

// ==========================================
// Malý dialog na výběr, který widget (z FlagshipDlazdice appky) se má
// připnout do jednoho ze tří slotů "Můj widget" nahoře ve
// FlagshipShell.tsx. Vlastní, ne přebíraný z Social's .social-overlay/
// .social-dialog — ten vzhled patří Socialu, vlajkové appky mají svůj
// vlastní vizuální jazyk (FlagshipShell.css), tenhle dialog ho jen
// sdílí přes vlastní .fs-* třídy.
// ==========================================

export const WidgetPickerSheet: React.FC<Props> = ({ moznosti, aktualniId, onVybrat, onOdebrat, onZavrit }) => (
  <>
    <div className="fs-overlay" onClick={onZavrit} />
    <div className="fs-picker" role="dialog" aria-label="Vybrat widget">
      <div className="fs-picker-hlavicka">
        <h3>Vyber widget</h3>
        <button className="fs-picker-zavrit" aria-label="Zavřít" onClick={onZavrit}>
          <AppIcon name="x" size={16} />
        </button>
      </div>

      <div className="fs-picker-seznam">
        {moznosti.map((m) => (
          <button
            key={m.id}
            className={`fs-picker-polozka ${aktualniId === m.id ? 'is-aktivni' : ''}`}
            onClick={() => onVybrat(m.id)}
          >
            <span className={`fs-picker-ikona fs-barva--${m.barva}`}>
              <AppIcon name={m.ikona} size={18} />
            </span>
            <span className="fs-picker-text">
              <strong>{m.nazev}</strong>
              <span>{m.popis}</span>
            </span>
            {aktualniId === m.id && <AppIcon name="check" size={16} />}
          </button>
        ))}
      </div>

      {aktualniId && (
        <button className="fs-picker-odebrat" onClick={onOdebrat}>
          Odebrat ze slotu
        </button>
      )}
    </div>
  </>
)
