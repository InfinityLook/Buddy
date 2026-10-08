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
// Celá sekce Hry (GamesHubModule a všech pět her pod ní) je dočasně
// schovaná pro v1 vydání na Google Play — appka ji v review vůbec
// neukazuje, aby recenzent neviděl nic nedokončeného/neotestovaného,
// a doplní se až v navazujícím updatu. Stejný "hide, keep documented,
// one-line revert" postup jako dřívější schování Buddyheimu/Souboje
// jednotlivě — jen teď pro celou sekci najednou. Návrat: odkomentovat
// tenhle import + pět importů her níž, vrátit šest routy /hra* zpátky
// na jejich skutečné komponenty, a vrátit kartu "Hry" v Hub.tsx.
// import GamesHubModule from '@/pages/games/GamesHubModule.tsx'
import ProfilModule from '@/pages/profil/ProfilModule.tsx'
import RewardModule from '@/pages/reward/RewardModule.tsx'
import SettingsModule from '@/pages/setting/SettingsModule.tsx'
import NapovedaSekce from '@/pages/setting/components/NapovedaSekce'
import ShopModule from '@/pages/shop/ShopModule.tsx'
import AdminModule from '@/pages/admin/AdminModule.tsx'
import SupportModule from '@/pages/support/SupportModule.tsx'
const SocialModule = lazy(() => import('@/social/SocialModule'))
const FeedModule = lazy(() => import('@/social/FeedModule'))
// Všech pět her (Buddyheim, Souboj, Buddyho Trh, Survival Night, Čtyři
// království) je dočasně schovaných zároveň s GamesHubModule importem
// výš — appka releasuje v1 na Google Play bez celé sekce Hry a doplní
// ji v navazujícím updatu, kdy se appka jen nasadí znovu na živý web
// bez nového review (appka je TWA/PWA, review testuje nativní obal,
// ne živý obsah webu). Žádný z pěti souborů her nebyl smazaný ani
// upravený — jen jejich lazy import zakomentovaný tady a routa pod
// nimi vrácená na /hub. Návrat: odkomentovat všech pět importů +
// vrátit šest routy /hra* na GamesHubModule.tsx (viz import výš).
// const SurvivalModule = lazy(() => import('@/survival/SurvivalModule'))
// const GameModule = lazy(() => import('@/game/GameModule.tsx'))
// const CtyriKralovstvi = lazy(() => import('@/boardgame/CtyriKralovstvi.tsx'))
// const FightingModule = lazy(() => import('@/fighting/FightingModule.tsx'))
// const BoardgameModule = lazy(() => import('@/boardgame/BoardgameModule.tsx'))
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
import { setupStreakWarningReminder } from '@/core/streakWarningReminder'

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
    setupStreakWarningReminder()
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

            {/* Krok 18: "jen zeď" — Hubovo kolo (paprsek "Feed", dřív
                "Social") sem vede přímo, mimo celý SocialModule se
                svojí vlastní spodní navigací. Viz FeedModule.tsx's
                vlastní komentář. */}
            <Route
              path="/feed"
              element={
                dovnitr ? (
                  <Suspense fallback={<div className="app-suspense-fallback">Načítám…</div>}>
                    <FeedModule />
                  </Suspense>
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            {/* Celá sekce Hry (/hra a všech pět her pod ní) je schovaná
                pro v1 releasu na Google Play — viz komentář u GamesHubModule
                importu nahoře. Bare <Navigate>, ne ternary na dovnitr: appka
                nerozlišuje, jestli je uživatel přihlášený, jen ho pošle
                na /hub, odkud appčin vlastní dovnitr-gate případně
                doputuje až na /. Žádná z pěti her tím nezmizela ze
                zdrojáků, jen je dočasně nedosažitelná přes přímé URL. */}
            <Route path="/hra" element={<Navigate to="/hub" replace />} />
            <Route path="/hra/buddyheim" element={<Navigate to="/hub" replace />} />
            <Route path="/hra/trh" element={<Navigate to="/hub" replace />} />
            <Route path="/hra/souboj" element={<Navigate to="/hub" replace />} />
            <Route path="/hra/survival-night" element={<Navigate to="/hub" replace />} />
            <Route path="/hra/deskova-hra" element={<Navigate to="/hub" replace />} />

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
