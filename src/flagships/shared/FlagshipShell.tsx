import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { AppBottomNav } from '@/components/AppBottomNav'
import {
  ProfilNotifications,
  useNotificationItems,
} from '@/pages/profil/components/ProfilNotifications'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import type { FlagshipVelkaKarta } from './types'
// Sdílený s Profilem/Aplikacemi stejně jako AppModule.tsx dělá u svého
// vlastního importu — jinak by panel notifikací zůstal bez vzhledu.
import '@/pages/profil/ProfilModule.css'
import '@/pages/app/AppModule.css'
import './FlagshipShell.css'

interface Props {
  nazev: string
  popisHlavicky: string
  ikonaHlavicky: string
  /** Vlastní tělo obrazovky — School Room sem vloží <MujWidgetPanel>,
   *  Fitness Room svůj vlastní přehled/cíle/rychlý trénink. Shell sám
   *  o obsahu nic neví — jediné, co je opravdu společné napříč každou
   *  vlajkovou appkou, je hlavička, dvě velké karty dole, spodní lišta
   *  a panel notifikací. Viz komentář níž, proč se to takhle rozdělilo
   *  až u druhé appky, ne hned u první. */
  children: React.ReactNode
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
// avatar), vlastní tělo appky (children) a dvě velké karty dole, plus
// AppBottomNav a panel notifikací. School Room byl první, kdo ho
// používal, a napoprvé v sobě celý shell nesl i "Můj widget" panel
// natvrdo — Fitness Room (druhá vlajková appka) přišel s úplně jiným
// tělem (přehled/cíle/rychlý trénink, žádné sloty ani pevná mřížka
// dlaždic), takže shell se rozdělil na tohle, co je doopravdy společné
// VŠEM vlajkovým appkám, a MujWidgetPanel.tsx, co je vlastní jen
// School Roomu (a čemukoli dalšímu, co bude tenhle konkrétní widgetový
// vzorec chtít taky). Obecnost se tak nebuduje dopředu na základě
// dohadu, ale až ve chvíli, kdy druhý skutečný případ ukáže, co je
// doopravdy sdílené — přesně proto první verze shellu widgety nesla
// natvrdo a teprve teď se to rozpojilo.
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
  nazev,
  popisHlavicky,
  ikonaHlavicky,
  children,
  velkeKarty,
  notifOpen,
  onOpenNotifications,
  onCloseNotifications,
}) => {
  const navigate = useNavigate()
  const { profile, markNotificationRead } = useProfileData()
  const notifications = useNotificationItems()
  const unreadCount = notifications.filter((item) => !profile.readNotifications.includes(item.id)).length

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

      {children}

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
    </div>
  )
}
