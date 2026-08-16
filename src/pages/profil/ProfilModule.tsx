import React, { useEffect, useRef, useState } from 'react'
import { ProfilHeader } from './components/ProfilHeader'
import { ProfilUserCard } from './components/ProfilUserCard'
import { ProfilQuickStats } from './components/ProfilQuickStats'
import { ProfilAchievements } from './components/ProfilAchievements'
import { ProfilGoals } from './components/ProfilGoals'
import { ProfilSettingsSheet } from './components/ProfilSettingsSheet'
import { ProfilNotifications } from './components/ProfilNotifications'
import { ProfilToast } from './components/ProfilToast'
import { useProfileData } from './hooks/useProfileData'
import './ProfilModule.css'

interface ProfilModuleProps {
  onBack?: () => void
}

export const ProfilModule: React.FC<ProfilModuleProps> = ({ onBack }) => {
  const { profile, updateProfile, updateSecurity, markNotificationRead, resetProfile } = useProfileData()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const hasUnread = ['n1', 'n2', 'n3'].some((id) => !profile.readNotifications.includes(id))

  return (
    <div className="profil-container">
      <ProfilHeader
        onBack={onBack}
        onToggleNotifications={() => {
          setNotificationsOpen((v) => !v)
          setSettingsOpen(false)
        }}
        onToggleSettings={() => {
          setSettingsOpen((v) => !v)
          setNotificationsOpen(false)
        }}
        notificationsOpen={notificationsOpen}
        settingsOpen={settingsOpen}
        hasUnread={hasUnread}
      />

      <ProfilUserCard
        profile={profile}
        onAvatarChange={(dataUrl) => updateProfile({ avatar: dataUrl })}
        onToast={showToast}
      />

      <ProfilQuickStats stats={profile.stats} />

      <div className="profil-grid-2">
        <ProfilAchievements onShowAll={() => showToast('Zatím máš zobrazeny všechny úspěchy 🏆')} />
        <ProfilGoals onShowAll={() => showToast('Zatím máš zobrazeny všechny cíle 🎯')} />
      </div>

      <ProfilNotifications
        open={notificationsOpen}
        readIds={profile.readNotifications}
        onMarkRead={markNotificationRead}
        onClose={() => setNotificationsOpen(false)}
      />

      <ProfilSettingsSheet
        open={settingsOpen}
        profile={profile}
        onClose={() => setSettingsOpen(false)}
        onSaveProfile={updateProfile}
        onUpdateSecurity={updateSecurity}
        onResetData={resetProfile}
        onToast={showToast}
      />

      <ProfilToast message={toast} />
    </div>
  )
}

export default ProfilModule
