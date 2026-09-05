import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import Login from './pages/login/Login.tsx'
import Hub from './pages/hub/Hub.tsx'
import AppModule from '@/pages/app/AppModule.tsx'
// Vlajkové appky (viz CLAUDE.md, src/flagships/) — eager stejně jako
// AppModule/ProfilModule, nic v nich netáhne Three.js ani jinou těžkou
// závislost, co by ospravedlnila React.lazy.
import SchoolRoomModule from '@/flagships/school-room/SchoolRoomModule.tsx'
import FitnessRoomModule from '@/flagships/fitness-room/FitnessRoomModule.tsx'
import EconomyRoomModule from '@/flagships/economy-room/EconomyRoomModule.tsx'
import GrowthRoomModule from '@/flagships/growth-room/GrowthRoomModule.tsx'
import MusicRoomModule from '@/flagships/music-room/MusicRoomModule.tsx'
import WriterRoomModule from '@/flagships/writer-room/WriterRoomModule.tsx'
import GamesHubModule from '@/pages/games/GamesHubModule.tsx'
import ProfilModule from '@/pages/profil/ProfilModule.tsx'
import RewardModule from '@/pages/reward/RewardModule.tsx'
import SettingsModule from '@/pages/setting/SettingsModule.tsx'
import ShopModule from '@/pages/shop/ShopModule.tsx'
import AdminModule from '@/pages/admin/AdminModule.tsx'
import SupportModule from '@/pages/support/SupportModule.tsx'
// Buddyheim (RPG, src/game/) je dočasně vyřazený z nabídky her na
// žádost — appka nejdřív dodělá a vyladí Souboj (hru pro dva), RPG
// zůstává beze změny v kódu, jen dočasně nedosažitelný (viz route
// /hra/buddyheim níž a GamesHubModule.tsx's HRY). Vrátit ho zpátky
// znamená jen odkomentovat tenhle import a přehodit element routy
// zpátky na <GameModule />, žádný jiný soubor se nemusí měnit.
// const GameModule = lazy(() => import('@/game/GameModule'))
// Social má od verze s ambientní 3D scénou v pozadí stejnou závislost
// na Three.js jako Game hub, a otevírá se mnohem častěji než /hra —
// proto musí jet líně stejně tak, jinak by ho zatížila každá návštěva.
const SocialModule = lazy(() => import('@/social/SocialModule'))
// Souboj (druhá hra, zatím jen síťové párování ve Fázi 0) — poroste
// o herní vykreslování stejně jako Buddyheim, líný import od začátku
// místo přechodu na něj až dodatečně.
const FightingModule = lazy(() => import('@/fighting/FightingModule'))
import { BootGate } from '@/components/BootGate'
import { BiometricLock } from '@/components/BiometricLock'
import { NetworkStatusBanner } from '@/components/NetworkStatusBanner'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { setupPWAUpdates } from '@/core/utils/registerSW'
import { setupErrorReporting } from '@/core/utils/errorReporting'
import { startCloudSync } from '@/core/supabase/cloudSync'
import { startAuthWatch, useAccount } from '@/core/supabase/auth'
import { isSupabaseConfigured } from '@/core/supabase/client'
import { useAuthStore } from '@/core/store/useAuthStore'
import { setupRoleDevTools, startRoleSync, useHasPermission } from '@/core/role'
import { useAppliedTheme } from '@/core/theme'
import { startInbox } from '@/social/inbox'
import { startPresence } from '@/social/presence'
import { startLoginNotify } from '@/core/security/loginNotify'
import { setupStudyPlannerReminders } from '@/miniapps/study-planner/useStudyPlanner'

export default function App() {
  const { isAuthed, login } = useAuthStore()
  const stavUctu = useAccount((s) => s.status)
  const { profile, updateSecurity } = useProfileData()

  // Biometrický zámek (viz core/utils/biometrics.ts) se ptá jednou za
  // start appky, ne při každé navigaci. useRef, ne obyčejná proměnná ani
  // useState: potřebujeme hodnotu spočítanou přesně jednou, při úplně
  // prvním renderu, a pak už neměnnou po zbytek relace — kdyby se
  // počítala z živého profile.security.biometrics při každém renderu,
  // zapnutí přepínače v Nastavení by appku zamklo hned uprostřed
  // rozdělané relace (přesně tohle se dřív dělo, dokud tenhle ref
  // nebyl, chycené e2e testem: toast "Biometrie zapnuta ✓" se ani
  // nestihl ukázat, než zámek celou stránku pod ním vyměnil).
  const vyzadovaloZamekPriStartu = useRef(
    !!profile.security.biometrics && !!profile.security.biometricCredentialId
  ).current
  const [odemceno, setOdemceno] = useState(false)
  const potrebujeOdemceni = vyzadovaloZamekPriStartu && !odemceno

  // Reaguje na změnu vzhledu i na vypršení VIP kdykoli — ne jednorázově
  // ze startovního useEffectu níž, protože obojí se může stát, i když
  // uživatel zrovna kouká jinam. Běží bez ohledu na přihlášení, ať je
  // zvolený vzhled vidět i na přihlašovací obrazovce.
  useAppliedTheme()

  // Do aplikace se vejde jen se skutečným účtem. Jedinou výjimkou je
  // build bez nastaveného cloudu: tam nemá jak účet vzniknout a zamčené
  // dveře by neposloužily nikomu — uživatel by se dovnitř nedostal
  // a neměl by jak to spravit. V takovém případě rozhoduje místní
  // příznak jako dřív.
  const dovnitr = isSupabaseConfigured ? stavUctu === 'signed-in' : isAuthed

  // Admin panel je první místo v appce, kde na vstup nestačí jen účet —
  // musí sedět i oprávnění. Chrání to jen vzhled (viz varování
  // v core/role/types.ts), skutečná data si přístup ověřují sama
  // v databázi přes jsem_admin().
  const smiAdmin = useHasPermission('admin.panel')

  // Moderátor měl dřív oprávnění moderation.content, ale žádnou cestu
  // dovnitř — /admin pouštěl jen admin.panel, takže reálný moderátor
  // se přes databázi (jsem_moderator()) dostal k hlášením, ale UI mu
  // je nemělo kde ukázat. AdminModule.tsx podle stejného oprávnění
  // sám omezí, co uvidí (jen SocialReport), takže widen tady neznamená
  // widen dat, jen vstupu do panelu, který si data stejně ověří sám.
  const smiModerovat = useHasPermission('moderation.content')

  // Než Supabase odpoví, jestli relace existuje, nesmí se ukázat login —
  // uživateli s platným účtem by na okamžik probliknul a vypadalo by to
  // jako odhlášení.
  const cekaSeNaOdpoved = isSupabaseConfigured && stavUctu === 'loading'

  // Registrace PWA aktualizací při načtení aplikace
  useEffect(() => {
    setupPWAUpdates()
    // System monitoring — neošetřené chyby z tohohle běhu appky se
    // pošlou do client_errors, odkud je čte Admin panel (záložka
    // Systém). Nic tajného nepotřebuje, jen přihlášenou relaci.
    setupErrorReporting()
    // Sledování přihlášení musí běžet dřív než synchronizace: ta se
    // podle přihlášeného účtu rozhoduje, čí data stáhnout.
    startAuthWatch()
    // Cloud je doplněk: bez nastavených proměnných se tiše přeskočí
    // a aplikace jede dál jen nad localStorage.
    startCloudSync()
    // Role se řídí serverem, ne prohlížečem — od chvíle, kdy se podle ní
    // pouští moderátor k cizím hlášením, si ji nesmí nikdo přepsat sám.
    startRoleSync()
    // Nepřečtené zprávy se hlídají po celou dobu běhu, ne jen v Socialu
    startInbox()
    // Totéž pro "jsem tu" tep pro appka-wide online status mezi
    // přáteli (social/presence.ts) — appka musí vědět, že je uživatel
    // aktivní, i když je zrovna v Hubu, ne jen v Socialu.
    startPresence()
    // "Upozornění na přihlášení" — dřív kosmetický přepínač, teď
    // nahlásí tohle zařízení a naslouchá novým (core/security/).
    startLoginNotify()
    // Přidělení role z konzole. Jen ve vývoji — v produkčním buildu se
    // celý blok vyhodí, viz core/role/devTools.ts.
    setupRoleDevTools()
    // Upozornění na termíny v Planeru — kontroluje se hned a pak při
    // každém návratu do appky, ne jen když je Planer zrovna otevřený.
    setupStudyPlannerReminders()
  }, [])

  return (
    // Než se vykreslí aplikace, doběhne kontrola aktualizací —
    // uživatel tak nezačíná na staré verzi, kterou by mu obnova
    // za chvíli vytrhla pod rukama.
    <BootGate>
      {cekaSeNaOdpoved ? (
        <div className="app-suspense-fallback">Přihlašuji…</div>
      ) : dovnitr && potrebujeOdemceni ? (
        <BiometricLock
          credentialId={profile.security.biometricCredentialId as string}
          onUnlock={() => setOdemceno(true)}
          onVypnoutZamek={() => {
            // Vypnutí zámku bez ověření je záměr, ne díra: kdo se dostal
            // až sem, sedí u tohohle konkrétního odemčeného zařízení se
            // secureStorage v dosahu (jen obfuskace, ne šifrování — viz
            // core/utils/secureStorage.ts) — stejná hranice jako všude
            // jinde v appce, kde je klient jen UI vrstva nad reálnou daty.
            // Hlavně tohle appku nesmí zaseknout, když credential patří
            // jinému zařízení (typicky po obnově zálohy).
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

          {/* Route pro rozcestník miniaplikací (AppModule) */}
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

          {/* Route pro School Room (první vlajková appka, viz
              CLAUDE.md/src/flagships/) — vlastní stránka s vlastní
              hlavičkou a spodní lištou, ne obsah uvnitř AppModule's
              obecného fullscreen wrapperu jako obyčejná miniaplikace. */}
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

          {/* Route pro Fitness Room (druhá vlajková appka) — stejný
              důvod jako School Room výš. */}
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

          {/* Route pro Economy Room (třetí vlajková appka) — stejný
              důvod jako School Room/Fitness Room výš. */}
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

          {/* Route pro Growth Room (čtvrtá vlajková appka) — stejný
              důvod jako School Room/Fitness Room/Economy Room výš. */}
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

          {/* Route pro Music Room (pátá vlajková appka) — stejný
              důvod jako School Room/Fitness Room/Economy Room/Growth
              Room výš. */}
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

          {/* Route pro Writer's Room (šestá vlajková appka) — stejný
              důvod jako School Room/Fitness Room/Economy Room/Growth
              Room/Music Room výš. */}
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

          {/* Route pro profil uživatele */}
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

          {/* Route pro odměny (úroveň, série a odznaky) */}
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

          {/* Route pro Social (přátelé, chaty, blokování) */}
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

          {/* Route pro rozcestník her — Play v Hubu vede sem, ne rovnou
              do konkrétní hry. Buddyheim (RPG) běží beze změny na své
              vlastní podadrese, jen už není to jediné, co "Play"
              nabízí. */}
          <Route
            path="/hra"
            element={dovnitr ? <GamesHubModule /> : <Navigate to="/" replace />}
          />

          {/* Route pro Buddyheim (RPG, 3D průzkum) — dočasně vyřazený
              z nabídky her (viz komentář u lazy importu GameModule
              výš a GamesHubModule.tsx's HRY): appka teď dokončuje
              a lepí Souboj, RPG se vrátí, až se na to dostane. Přímý
              odkaz proto vede zpátky na rozcestník her místo do hry
              samotné, ať appka nenechá rozpracovanou/odloženou funkci
              dosažitelnou jen díky uhodnuté URL. */}
          <Route path="/hra/buddyheim" element={<Navigate to="/hra" replace />} />

          {/* Route pro Souboj (druhá hra, zatím jen Fáze 0 — síťové
              párování telefon-ovladač <-> TV, viz src/fighting/). Ještě
              se nenabízí z rozcestníku her jako skutečná karta, jde na
              ni jen přímý odkaz. */}
          <Route
            path="/hra/souboj"
            element={
              dovnitr ? (
                <Suspense fallback={<div className="app-suspense-fallback">Načítám…</div>}>
                  <FightingModule />
                </Suspense>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Route pro obchod (kredity, VIP a doplňky) */}
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

          {/* Route pro nastavení aplikace */}
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

          {/* Route pro podporu — jako /social a /hra stačí přihlášení,
              žádné zvláštní oprávnění. Admin vidí stejnou obrazovku,
              jen mu RLS pustí i cizí tikety (viz SupportModule.tsx). */}
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

          {/* Route pro admin panel — admin.panel vidí celý panel,
              moderation.content jen omezenou verzi (AdminModule.tsx
              si podle stejného oprávnění samo rozhodne, které záložky
              ukázat). */}
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

        {/* Globální indikátor offline připojení */}
        <NetworkStatusBanner />
      </BrowserRouter>
      )}
    </BootGate>
  )
}
