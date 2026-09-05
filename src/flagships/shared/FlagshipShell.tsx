import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { AppBottomNav } from '@/components/AppBottomNav'
import {
  ProfilNotifications,
  useNotificationItems,
} from '@/pages/profil/components/ProfilNotifications'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { useFlagshipSloty, useFlagshipWidgetsStore } from './useFlagshipWidgets'
import { WidgetPickerSheet } from './WidgetPickerSheet'
import type { FlagshipDlazdice, FlagshipVelkaKarta } from './types'
// Sdílený s Profilem/Aplikacemi stejně jako AppModule.tsx dělá u svého
// vlastního importu — jinak by panel notifikací zůstal bez vzhledu.
import '@/pages/profil/ProfilModule.css'
import '@/pages/app/AppModule.css'
import './FlagshipShell.css'

interface Props {
  /** Krátké, stabilní id appky — klíč do useFlagshipWidgets (a jednou
   *  třeba i do dalších per-appku uložených dat). Nikdy se nemění, i
   *  kdyby se změnil `nazev` zobrazený uživateli. */
  id: string
  nazev: string
  popisHlavicky: string
  ikonaHlavicky: string
  dlazdice: FlagshipDlazdice[]
  velkeKarty: FlagshipVelkaKarta[]
  /** Panel upozornění drží stav appka volající shell, ne shell sám —
   *  jedna z dlaždic (School Room's "Upozornění") totiž potřebuje
   *  spustit úplně tu samou akci jako zvonek v hlavičce, a to jde jen
   *  tehdy, když callback vlastní ten, kdo definuje obě (viz
   *  SchoolRoomModule.tsx). Stejný "rodič vlastní stav, dítě jen
   *  vykresluje" vztah jako AppModule.tsx <-> AppHeader.tsx. */
  notifOpen: boolean
  onOpenNotifications: () => void
  onCloseNotifications: () => void
}

// ==========================================
// Sdílený "plášť" vlajkové appky — hlavička (zpět/titulek/zvonek/
// avatar), karta "Můj widget" (tři vlastní sloty + pevná mřížka
// dlaždic) a dvě velké karty dole, plus AppBottomNav. School Room je
// první appka, co ho používá, ale je stavěný tak, aby ho příští
// podobná appka ("Work Room" a další) jen naplnila vlastními
// dlaždicemi/kartami — žádný kód navíc, jen data (viz School Room's
// vlastní AskUserQuestion rozhodnutí v CLAUDE.md, proč se stavělo
// rovnou takhle, ne jako jednorázová obrazovka).
//
// Hlavička/notifikace/avatar jsou schválně vlastní kopie stejné logiky
// jako AppHeader.tsx (viz src/pages/app/), ne import odsud rovnou —
// AppHeader je vázaný na AppModule's vlastní props (unreadCount z
// AppModule.tsx atd.), kdežto tenhle plášť si tutéž logiku (bell +
// avatar) drží sám, ať je samostatný a nezávislý na tom, jak si to
// řeší /apps. Malá duplicita čtyř řádků logiky je levnější než vázat
// dvě různé stránky na jednu sdílenou komponentu, co by musela nosit
// props obou.
// ==========================================

export const FlagshipShell: React.FC<Props> = ({
  id,
  nazev,
  popisHlavicky,
  ikonaHlavicky,
  dlazdice,
  velkeKarty,
  notifOpen,
  onOpenNotifications,
  onCloseNotifications,
}) => {
  const navigate = useNavigate()
  const { profile, markNotificationRead } = useProfileData()
  const notifications = useNotificationItems()
  const unreadCount = notifications.filter((item) => !profile.readNotifications.includes(item.id)).length

  const [otevrenySlot, setOtevrenySlot] = useState<number | null>(null)

  const sloty = useFlagshipSloty(id)
  const nastavSlot = useFlagshipWidgetsStore((s) => s.nastavSlot)

  const najitDlazdici = (widgetId: string | null) => (widgetId ? dlazdice.find((d) => d.id === widgetId) : undefined)

  return (
    <div className="app-container fs-page">
      <header className="app-header">
        <button className="app-back-btn" aria-label="Zpět" onClick={() => navigate('/apps')}>
          <AppIcon name="arrow-left" size={18} />
        </button>

        <div className="app-header-center">
          <div className="app-header-title-wrap">
            <AppIcon name={ikonaHlavicky} size={22} className="app-header-icon" />
            <h1>{nazev}</h1>
          </div>
          <p>{popisHlavicky}</p>
        </div>

        <div className="app-header-actions">
          <button
            className="app-icon-btn"
            aria-label={unreadCount > 0 ? `Upozornění (${unreadCount} nepřečtených)` : 'Upozornění'}
            onClick={onOpenNotifications}
          >
            <AppIcon name="bell" size={20} />
            {unreadCount > 0 && <span className="app-icon-badge">{unreadCount}</span>}
          </button>

          <button className="app-avatar-btn" aria-label="Otevřít profil" onClick={() => navigate('/profil')}>
            <img className="app-avatar-img" src={profile.avatar} alt="" aria-hidden="true" />
            <span className="app-avatar-dot" aria-hidden="true" />
          </button>
        </div>
      </header>

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
      </div>

      <div className="fs-velke-karty">
        {velkeKarty.map((k) => (
          <button key={k.id} className={`fs-velka-karta fs-velka-karta--${k.barva}`} onClick={k.onClick}>
            <span className={`fs-velka-karta-ikona fs-barva--${k.barva}`}>
              <AppIcon name={k.ikona} size={26} />
            </span>
            <span className="fs-velka-karta-nazev">{k.nazev}</span>
            <span className="fs-velka-karta-popis">{k.popis}</span>
            <span className={`fs-velka-karta-sipka fs-barva--${k.barva}`}>
              <AppIcon name="arrow-right" size={16} />
            </span>
          </button>
        ))}
      </div>

      <AppBottomNav />

      <ProfilNotifications
        open={notifOpen}
        readIds={profile.readNotifications}
        onMarkRead={markNotificationRead}
        onClose={onCloseNotifications}
      />

      {otevrenySlot !== null && (
        <WidgetPickerSheet
          moznosti={dlazdice}
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
