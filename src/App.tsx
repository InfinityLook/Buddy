import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import Login from './pages/login/Login.tsx'
import Hub from './pages/hub/Hub.tsx'
import AppModule from '@/pages/app/AppModule.tsx'
import ProfilModule from '@/pages/profil/ProfilModule.tsx'
import RewardModule from '@/pages/reward/RewardModule.tsx'
import SettingsModule from '@/pages/setting/SettingsModule.tsx'
import ShopModule from '@/pages/shop/ShopModule.tsx'
import AdminModule from '@/pages/admin/AdminModule.tsx'
// Herní hub si s sebou nese Three.js, takže se načítá až při vstupu —
// zbytek aplikace tím nezůstane těžší.
const GameModule = lazy(() => import('@/game/GameModule'))
import SocialModule from '@/social/SocialModule'
import { BootGate } from '@/components/BootGate'
import { NetworkStatusBanner } from '@/components/NetworkStatusBanner'
import { setupPWAUpdates } from '@/core/utils/registerSW'
import { startCloudSync } from '@/core/supabase/cloudSync'
import { signOut, startAuthWatch, useAccount } from '@/core/supabase/auth'
import { isSupabaseConfigured } from '@/core/supabase/client'
import { useAuthStore } from '@/core/store/useAuthStore'
import { setupRoleDevTools, startRoleSync, useHasPermission } from '@/core/role'
import { startInbox } from '@/social/inbox'

export default function App() {
  const { isAuthed, login, logout } = useAuthStore()
  const stavUctu = useAccount((s) => s.status)

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
  }, [])

  return (
    // Než se vykreslí aplikace, doběhne kontrola aktualizací —
    // uživatel tak nezačíná na staré verzi, kterou by mu obnova
    // za chvíli vytrhla pod rukama.
    <BootGate>
      {cekaSeNaOdpoved ? (
        <div className="app-suspense-fallback">Přihlašuji…</div>
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
                <SocialModule />
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

          {/* Route pro admin panel — vidí ho jen role s oprávněním admin.panel */}
          <Route
            path="/admin"
            element={
              dovnitr && smiAdmin ? (
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
