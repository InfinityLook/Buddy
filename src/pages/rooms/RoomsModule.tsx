import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/pages/app/components/AppHeader'
import { RoomCarousel } from '@/pages/app/components/RoomCarousel'
import { AppBottomNav } from '@/components/AppBottomNav'
import { useAppStore } from '@/core/store/useAppStore'
import {
  ProfilNotifications,
  useNotificationItems,
} from '@/pages/profil/components/ProfilNotifications'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import {
  SurfaceBackdrop,
  useSurfaceAppearance,
} from '@/features/appearance/SurfaceAppearance'
import '@/pages/profil/ProfilModule.css'
import '@/pages/app/AppModule.css'
import './RoomsModule.css'

export default function RoomsModule() {
  const navigate = useNavigate()
  const { apps, setActiveAppId, markAppOpened } = useAppStore()
  const { profile, markNotificationRead } = useProfileData()
  const [notifOpen, setNotifOpen] = useState(false)

  // Přehled Rooms přebírá stávající motiv launcheru a jeho pět variant.
  const { rootAttributes } = useSurfaceAppearance('apps-launcher')

  const rooms = useMemo(
    () => apps.filter((app) => !!app.route),
    [apps]
  )

  const notifications = useNotificationItems()
  const unreadCount = notifications.filter(
    (item) => !profile.readNotifications.includes(item.id)
  ).length

  return (
    <div
      className="app-page rooms-page buddy-theme-scope"
      {...rootAttributes}
    >
      <SurfaceBackdrop surfaceId="apps-launcher" />

      <div className="app-container">
        <AppHeader
          title="Rooms"
          subtitle="Vyber si svůj prostor"
          onBack={() => navigate('/hub')}
          onOpenNotifications={() => setNotifOpen(true)}
          unreadCount={unreadCount}
        />

        <main className="rooms-content" aria-label="Přehled Rooms">
          {rooms.length > 0 ? (
            <RoomCarousel
              rooms={rooms}
              onEnter={(room) => {
                if (!room.route) return

                setActiveAppId(null)
                markAppOpened(room.id)
                navigate(room.route)
              }}
            />
          ) : (
            <p>Zatím tu nejsou žádné Rooms.</p>
          )}
        </main>

        <AppBottomNav />

        <ProfilNotifications
          open={notifOpen}
          readIds={profile.readNotifications}
          onMarkRead={markNotificationRead}
          onClose={() => setNotifOpen(false)}
        />
      </div>
    </div>
  )
}
