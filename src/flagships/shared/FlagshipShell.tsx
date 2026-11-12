import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/pages/app/components/AppHeader'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { AppBottomNav } from '@/components/AppBottomNav'
import {
  ProfilNotifications,
  useNotificationItems,
} from '@/pages/profil/components/ProfilNotifications'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import type { SurfaceId } from '@/features/appearance/themeCatalog'
import type { FlagshipVelkaKarta } from './types'
// Sdílený s Profilem/Aplikacemi stejně jako AppModule.tsx dělá u svého
// vlastního importu — jinak by panel notifikací zůstal bez vzhledu.
import '@/pages/profil/ProfilModule.css'
import '@/pages/app/AppModule.css'
import './FlagshipShell.css'

interface Props {
  /** Buddy v2 — appka šestice vlajkových appek sdílí tenhle jeden shell,
   *  takže appka chtěla jedno místo, co napojí SurfaceBackdrop/
   *  buddy-theme-scope na všech šest naráz, místo šesti kopií stejných
   *  tří řádků v každém Module.tsx zvlášť — každá Room appce pošle svoje
   *  vlastní surfaceId (economy-room/fitness-room/growth-room/
   *  music-room/school-room/writer-room). */
  surfaceId: SurfaceId
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
// Šipky mezi Roomy (myš-only, mezi Hub/Apps/Profil/Nastavení i mezi
// vlajkovými Roomy) appka odstranila na uživatelovo přání — <AppBottomNav />
// se tu teď volá bez props, appka tu žádnou náhradní navigaci mezi
// Roomy nenechala. Přepínání mezi Roomy jde dál přes RoomCarousel.tsx
// na /apps (swipe/tažení, nesouvisí s tímhle souborem vůbec) nebo přes
// appčino menu/dlaždice v jednotlivých Roomech.
// ==========================================

export const FlagshipShell: React.FC<Props> = ({
  surfaceId,
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
  const { rootAttributes } = useSurfaceAppearance(surfaceId)

  return (
    <div className="app-container app-container--shared-header fs-page buddy-theme-scope" {...rootAttributes}>
      <SurfaceBackdrop surfaceId={surfaceId} />

      <AppHeader
        title={nazev}
        subtitle={popisHlavicky}
        icon={ikonaHlavicky}
        onBack={() => navigate('/rooms', { state: { selectedRoom: surfaceId } })}
        unreadCount={unreadCount}
        onOpenNotifications={onOpenNotifications}
        extraActions={
          <button
            type="button"
            className="buddy-ui-button buddy-ui-button--icon buddy-ui-avatar-button"
            aria-label="Otevřít profil"
            onClick={() => navigate('/profil')}
          >
            <img className="app-avatar-img" src={profile.avatar} alt="" />
            <span className="app-avatar-dot" aria-hidden="true" />
          </button>
        }
      />

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
        callerId={surfaceId}
        open={notifOpen}
        readIds={profile.readNotifications}
        onMarkRead={markNotificationRead}
        onClose={onCloseNotifications}
      />
    </div>
  )
}
