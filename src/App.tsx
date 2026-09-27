import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import Login from './pages/login/Login.tsx'
import Hub from './pages/hub/Hub.tsx'
import AppModule from '@/pages/app/AppModule.tsx'
import SchoolRoomModule from '@/flagships/school-room/SchoolRoomModule.tsx'
import SkolaStatistiky from '@/flagships/school-room/SkolaStatistiky.tsx'
import SkolaUpozorneni from '@/flagships/school-room/SkolaUpozorneni.tsx'
import FitnessRoomModule from '@/flagships/fitness-room/FitnessRoomModule.tsx'
import EconomyRoomModule from '@/flagships/economy-room/EconomyRoomModule.tsx'
import GrowthRoomModule from '@/flagships/growth-room/GrowthRoomModule.tsx'
import MusicRoomModule from '@/flagships/music-room/MusicRoomModule.tsx'
import WriterRoomModule from '@/flagships/writer-room/WriterRoomModule.tsx'
import GamesHubModule from '@/pages/games/GamesHubModule.tsx'
import ProfilModule from '@/pages/profil/ProfilModule.tsx'
import RewardModule from '@/pages/reward/RewardModule.tsx'
import SettingsModule from '@/pages/setting/SettingsModule.tsx'
import NapovedaSekce from '@/pages/setting/components/NapovedaSekce'
import ShopModule from '@/pages/shop/ShopModule.tsx'
import AdminModule from '@/pages/admin/AdminModule.tsx'
import SupportModule from '@/pages/support/SupportModule.tsx'
const SocialModule = lazy(() => import('@/social/SocialModule'))
const SurvivalModule = lazy(() => import('@/survival/SurvivalModule'))
import { BootGate } from '@/components/BootGate'
import { BiometricLock } from '@/components/BiometricLock'
import { NetworkStatusBanner } from '@/components/NetworkStatusBanner'
import { FullscreenToggle } from '@/components/FullscreenToggle'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { setupPWAUpdates } from '@/core/utils/registerSW'
import { setupErrorReporting } from '@/core/utils/errorReporting'
import { startCloudSync } from '@/core/supabase/cloudSync'
import { startAuthWatch, useAccount } from '@/core/supabase/auth'
import { isSupabaseConfigured } from '@/core/supabase/client'
import { useAuthStore } from '@/core/store/useAuthStore'
import { setupRoleDevTools, startRoleSync, useHasPermission } from '@/core/role'
import { useAppliedTheme } from '@/core/theme'
import { useAutoFullscreen } from '@/core/hooks/useAutoFullscreen'
import { startInbox } from '@/social/inbox'
import { startPresence } from '@/social/presence'
import { startLoginNotify } from '@/core/security/loginNotify'
import { setupStudyPlannerReminders } from '@/miniapps/study-planner/useStudyPlanner'
import { setupFinanceRecurringCheck } from '@/miniapps/finance/useFinance'
import { setupGoalTrackerReminders } from '@/miniapps/goal-tracker/useGoalTracker'
import { startFinanceSync } from '@/miniapps/finance/financeSync'
import { startWriterSync } from '@/flagships/writer-room/writerSync'
import { startGoalTrackerSync } from '@/miniapps/goal-tracker/goalTrackerSync'
import { startSkolaSync } from '@/flagships/school-room/skolaSync'
import { setupFitnessReminders } from '@/flagships/fitness-room/fitnessReminders'
import { setupPitnyRezimReminders } from '@/flagships/fitness-room/pitnyRezimReminders'
import { setupRozvrhReminders } from '@/miniapps/rozvrh/rozvrhReminders'

export default function App() {
  const { isAuthed, login } = useAuthStore()
  const stavUctu = useAccount((s) => s.status)
  const { profile, updateSecurity } = useProfileData()

  const vyzadovaloZamekPriStartu = useRef(
    !!profile.security.biometrics && !!profile.security.biometricCredentialId
  ).current
  const [odemceno, setOdemceno] = useState(false)
  const potrebujeOdemceni = vyzadovaloZamekPriStartu && !odemceno

  useAppliedTheme()
  useAutoFullscreen()

  const dovnitr = isSupabaseConfigured ? stavUctu === 'signed-in' : isAuthed
  const smiAdmin = useHasPermission('admin.panel')
  const smiModerovat = useHasPermission('moderation.content')
  const cekaSeNaOdpoved = isSupabaseConfigured && stavUctu === 'loading'

  useEffect(() => {
    setupPWAUpdates()
    setupErrorReporting()
    startAuthWatch()
    startCloudSync()
    startRoleSync()
    startInbox()
    startPresence()
    startLoginNotify()
    setupRoleDevTools()
    setupStudyPlannerReminders()
    setupFinanceRecurringCheck()
    setupGoalTrackerReminders()
    startFinanceSync()
    startWriterSync()
    startGoalTrackerSync()
    startSkolaSync()
    setupFitnessReminders()
    setupPitnyRezimReminders()
    setupRozvrhReminders()
  }, [])

  return (
    <BootGate>
      {cekaSeNaOdpoved ? (
        <div className="app-suspense-fallback">Přihlašuji…</div>
      ) : dovnitr && potrebujeOdemceni ? (
        <BiometricLock
          credentialId={profile.security.biometricCredentialId as string}
          onUnlock={() => setOdemceno(true)}
          onVypnoutZamek={() => {
            updateSecurity({ biometrics: false, biometricCredentialId: undefined })
            setOdemceno(true)
          }}
        />
      ) : (
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                dovnitr ? (
                  <Navigate to="/hub" replace />
                ) : (
                  <Login onLogin={login} />
                )
              }
            />

            <Route
              path="/hub"
              element={
                dovnitr ? (
                  <Hub />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/apps"
              element={
                dovnitr ? (
                  <AppModule />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/skola"
              element={
                dovnitr ? (
                  <SchoolRoomModule />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/skola/statistiky"
              element={dovnitr ? <SkolaStatistiky /> : <Navigate to="/" replace />}
            />
            <Route
              path="/skola/upozorneni"
              element={dovnitr ? <SkolaUpozorneni /> : <Navigate to="/" replace />}
            />

            <Route
              path="/fitness"
              element={
                dovnitr ? (
                  <FitnessRoomModule />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/economy"
              element={
                dovnitr ? (
                  <EconomyRoomModule />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/growth"
              element={
                dovnitr ? (
                  <GrowthRoomModule />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/music"
              element={
                dovnitr ? (
                  <MusicRoomModule />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/spisovatel"
              element={
                dovnitr ? (
                  <WriterRoomModule />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/profil"
              element={
                dovnitr ? (
                  <ProfilModule />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/odmeny"
              element={
                dovnitr ? (
                  <RewardModule />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/social"
              element={
                dovnitr ? (
                  <Suspense fallback={<div className="app-suspense-fallback">Načítám…</div>}>
                    <SocialModule />
                  </Suspense>
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/hra"
              element={dovnitr ? <GamesHubModule /> : <Navigate to="/" replace />}
            />

            <Route path="/hra/buddyheim" element={<Navigate to="/hra" replace />} />
            <Route path="/hra/souboj" element={<Navigate to="/hra" replace />} />
            <Route path="/hra/trh" element={<Navigate to="/hra" replace />} />

            <Route
              path="/hra/survival-night"
              element={
                dovnitr ? (
                  <Suspense fallback={<div className="app-suspense-fallback">Načítám…</div>}>
                    <SurvivalModule />
                  </Suspense>
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/obchod"
              element={
                dovnitr ? (
                  <ShopModule />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/nastaveni"
              element={
                dovnitr ? (
                  <SettingsModule />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/navod"
              element={
                dovnitr ? (
                  <NapovedaSekce />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/podpora"
              element={
                dovnitr ? (
                  <SupportModule />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/admin"
              element={
                dovnitr && (smiAdmin || smiModerovat) ? (
                  <AdminModule />
                ) : (
                  <Navigate to={dovnitr ? '/nastaveni' : '/'} replace />
                )
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <NetworkStatusBanner />
          <FullscreenToggle />
        </BrowserRouter>
      )}
    </BootGate>
  )
}
