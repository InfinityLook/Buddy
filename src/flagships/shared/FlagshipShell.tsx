import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/pages/app/components/AppHeader'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { useAppStore } from '@/core/store/useAppStore'
import { AppBottomNav } from '@/components/AppBottomNav'
import {
  ProfilNotifications,
  useNotificationItems,
} from '@/pages/profil/components/ProfilNotifications'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { SurfaceBackdrop, themeAssetUrl, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import type { SurfaceId } from '@/features/appearance/themeCatalog'
import type { FlagshipVelkaKarta } from './types'
// Sdílený s Profilem/Aplikacemi stejně jako AppModule.tsx dělá u svého
// vlastního importu — jinak by panel notifikací zůstal bez vzhledu.
import '@/pages/profil/ProfilModule.css'
import '@/pages/app/AppModule.css'
import './FlagshipShell.css'

interface Props {
  surfaceId: SurfaceId
  nazev: string
  popisHlavicky: string
  ikonaHlavicky: string
  children: React.ReactNode
  velkeKarty: FlagshipVelkaKarta[]
  notifOpen: boolean
  onOpenNotifications: () => void
  onCloseNotifications: () => void
}

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
  const photo = useAppStore(state => state.apps.find(app => app.id === surfaceId)?.nahled)
  const { rootAttributes } = useSurfaceAppearance(surfaceId)

  return (
    <div className={`app-container app-container--shared-header fs-page buddy-theme-scope${surfaceId === 'school-room' ? '' : ' fs-page--room'}`} {...rootAttributes}>
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

      <main className="fs-page-content">
        {photo && surfaceId !== 'school-room' && (
          <div className="fs-room-cover" aria-hidden="true">
            <img key={photo} src={themeAssetUrl(photo)} alt="" decoding="async" onError={event => { event.currentTarget.hidden = true }} />
          </div>
        )}
        {children}

        <div className="fs-velke-karty">
          {velkeKarty.map((k) => (
            <button key={k.id} type="button" className={`fs-velka-karta buddy-ui-card fs-velka-karta--${k.barva}`} onClick={k.onClick}>
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

      </main>

      <AppBottomNav placement="edge" />

      {notifOpen && (
        <div className="fs-notifications">
          <ProfilNotifications
            callerId={surfaceId}
            open
            readIds={profile.readNotifications}
            onMarkRead={markNotificationRead}
            onClose={onCloseNotifications}
          />
        </div>
      )}
    </div>
  )
}
