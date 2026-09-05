import React, { useState } from 'react'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { useFlagshipSloty, useFlagshipWidgetsStore } from './useFlagshipWidgets'
import { WidgetPickerSheet } from './WidgetPickerSheet'
import type { FlagshipDlazdice } from './types'

interface Props {
  /** Krátké, stabilní id appky — klíč do useFlagshipWidgets. Nikdy se
   *  nemění, i kdyby se změnil zobrazený název appky. */
  id: string
  dlazdice: FlagshipDlazdice[]
  /** Widgety navíc, co jdou připnout do slotů "Můj widget", ale
   *  nekreslí se v pevné mřížce dlaždic — School Roomovy "Nástroje"
   *  (Maturitní centrum, Flashcards, Math Solver, Textový editor, Mind
   *  Map) mají vlastní rozbalovací seznam pod velkou kartou
   *  (NastrojeSheet.tsx), ne místo v šestici nahoře, ale pořád mají jít
   *  připnout stejně jako kterákoli z ní. */
  dalsiMoznostiProSloty?: FlagshipDlazdice[]
}

// ==========================================
// "Můj widget" panel — tři vlastní, ukládané sloty plus pevná mřížka
// dlaždic. Bývalo součástí FlagshipShell.tsx přímo, vytažené sem, jakmile
// druhá vlajková appka (Fitness Room) přišla s tělem, co tenhle vzorec
// vůbec nemá — viz FlagshipShell.tsx's vlastní komentář o tom, proč se
// obecnost dělá až podle druhého skutečného případu, ne dopředu.
// ==========================================

export const MujWidgetPanel: React.FC<Props> = ({ id, dlazdice, dalsiMoznostiProSloty }) => {
  const [otevrenySlot, setOtevrenySlot] = useState<number | null>(null)

  const sloty = useFlagshipSloty(id)
  const nastavSlot = useFlagshipWidgetsStore((s) => s.nastavSlot)

  // Sloty smí ukazovat i widget, co v pevné mřížce vůbec nemá dlaždici
  // (viz dalsiMoznostiProSloty výš) — hledá se proto vždycky v obou
  // polích dohromady, ne jen v dlazdice.
  const vsechnyMoznostiProSloty = [...dlazdice, ...(dalsiMoznostiProSloty ?? [])]
  const najitDlazdici = (widgetId: string | null) =>
    widgetId ? vsechnyMoznostiProSloty.find((d) => d.id === widgetId) : undefined

  return (
    <div className="fs-panel">
      <div className="fs-panel-hlavicka">
        <div>
          <h2>Můj widget</h2>
          <p>Přizpůsob si svůj prostor</p>
        </div>
        {/* Zkratka na první prázdný slot — když jsou plné všechny tři,
            otevře aspoň první, ať tlačítko nikdy nezůstane bez akce. */}
        <button
          className="fs-plus-btn"
          aria-label="Přidat widget"
          onClick={() => {
            const prvniPrazdny = sloty.findIndex((s) => s === null)
            setOtevrenySlot(prvniPrazdny !== -1 ? prvniPrazdny : 0)
          }}
        >
          <AppIcon name="plus" size={20} />
        </button>
      </div>

      <div className="fs-sloty">
        {sloty.map((widgetId, i) => {
          const d = najitDlazdici(widgetId)
          return (
            <button
              key={i}
              className={`fs-slot ${d ? 'fs-slot--vyplneny' : ''}`}
              onClick={() => (d ? d.onClick() : setOtevrenySlot(i))}
            >
              {d ? (
                <>
                  <span
                    className="fs-slot-odebrat"
                    role="button"
                    tabIndex={0}
                    aria-label={`Odebrat ${d.nazev} ze slotu`}
                    onClick={(e) => {
                      e.stopPropagation()
                      nastavSlot(id, i, null)
                    }}
                  >
                    <AppIcon name="x" size={12} />
                  </span>
                  <span className={`fs-slot-ikona fs-barva--${d.barva}`}>
                    <AppIcon name={d.ikona} size={22} />
                  </span>
                  <span className="fs-slot-nazev">{d.nazev}</span>
                </>
              ) : (
                <AppIcon name="plus" size={26} />
              )}
            </button>
          )
        })}
      </div>

      <div className="fs-dlazdice-mrizka">
        {dlazdice.map((d) => (
          <button key={d.id} className="fs-dlazdice" onClick={d.onClick}>
            <span className={`fs-dlazdice-ikona fs-barva--${d.barva}`}>
              <AppIcon name={d.ikona} size={24} />
            </span>
            <span className="fs-dlazdice-nazev">{d.nazev}</span>
            <span className="fs-dlazdice-popis">{d.popis}</span>
          </button>
        ))}
      </div>

      {otevrenySlot !== null && (
        <WidgetPickerSheet
          moznosti={vsechnyMoznostiProSloty}
          aktualniId={sloty[otevrenySlot]}
          onVybrat={(widgetId) => {
            nastavSlot(id, otevrenySlot, widgetId)
            setOtevrenySlot(null)
          }}
          onOdebrat={() => {
            nastavSlot(id, otevrenySlot, null)
            setOtevrenySlot(null)
          }}
          onZavrit={() => setOtevrenySlot(null)}
        />
      )}
    </div>
  )
}
