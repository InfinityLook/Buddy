import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import Login from './pages/login/Login.tsx'
import Hub from './pages/hub/Hub.tsx'
import AppModule from '@/pages/app/AppModule.tsx'
import ProfilModule from '@/pages/profil/ProfilModule.tsx'
import RewardModule from '@/pages/reward/RewardModule.tsx'
import SettingsModule from '@/pages/setting/SettingsModule.tsx'
import ShopModule from '@/pages/shop/ShopModule.tsx'
import AdminModule from '@/pages/admin/AdminModule.tsx'
import SupportModule from '@/pages/support/SupportModule.tsx'
// Herní hub si s sebou nese Three.js, takže se načítá až při vstupu —
// zbytek aplikace tím nezůstane těžší.
const GameModule = lazy(() => import('@/game/GameModule'))
// Social má od verze s ambientní 3D scénou v pozadí stejnou závislost
// na Three.js jako Game hub, a otevírá se mnohem častěji než /hra —
// proto musí jet líně stejně tak, jinak by ho zatížila každá návštěva.
const SocialModule = lazy(() => import('@/social/SocialModule'))
import { BootGate } from '@/components/BootGate'
import { BiometricLock } from '@/components/BiometricLock'
import { NetworkStatusBanner } from '@/components/NetworkStatusBanner'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { setupPWAUpdates } from '@/core/utils/registerSW'
import { setupErrorReporting } from '@/core/utils/errorReporting'
import { startCloudSync } from '@/core/supabase/cloudSync'
import { signOut, startAuthWatch, useAccount } from '@/core/supabase/auth'
import { isSupabaseConfigured } from '@/core/supabase/client'
import { useAuthStore } from '@/core/store/useAuthStore'
import { setupRoleDevTools, startRoleSync, useHasPermission } from '@/core/role'
import { useAppliedTheme } from '@/core/theme'
import { startInbox } from '@/social/inbox'
import { setupStudyPlannerReminders } from '@/miniapps/study-planner/useStudyPlanner'

export default function App() {
  const { isAuthed, login, logout } = useAuthStore()
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

  // Odhlášení musí ukončit i relaci v Supabase. Kdyby se smazal jen
  // místní příznak, relace by v prohlížeči zůstala a uživatel by se
  // po obnovení stránky ocitl zase přihlášený.
  const odhlasit = () => {
    void signOut()
    logout()
  }

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
                <Hub onLogout={odhlasit} />
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

          {/* Route pro herní hub (3D město) */}
          <Route
            path="/hra"
            element={
              dovnitr ? (
                <Suspense fallback={<div className="app-suspense-fallback">Načítám město…</div>}>
                  <GameModule />
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
