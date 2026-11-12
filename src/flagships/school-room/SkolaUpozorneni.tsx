import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificationItems } from '@/pages/profil/components/ProfilNotifications'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { BuddyHeader } from '@/components/buddy-ui/BuddyHeader'
import { AppBottomNav } from '@/components/AppBottomNav'
import { SurfaceThemeScope } from '@/features/appearance/SurfaceAppearance'
import '@/pages/app/AppModule.css'
import './SchoolRoomModule.css'

// ==========================================
// Vlastní celoobrazovková podstránka School Roomu pro upozornění —
// nahrazuje výsuvný panel (ProfilNotifications), na který dřív vedl
// zvonek v hlavičce i dlaždice "Upozornění". Stejná data (useNotificationItems,
// stejný hook, co používá i zvonek v Profilu/Aplikacích), jen jiné
// zobrazení — plná stránka s vlastním tlačítkem zpět, ne dropdown nad
// obsahem. Týká se jen School Roomu (viz CLAUDE.md) — Hub a ostatní
// vlajkové roomy mají svůj zvonek beze změny.
// ==========================================

export const SkolaUpozorneni: React.FC = () => {
  const navigate = useNavigate()
  const { profile, markNotificationRead } = useProfileData()
  const notifications = useNotificationItems()

  return (
    // Buddy v2 (viz CLAUDE.md "Vzhled aplikace") — stejná výjimka jako
    // SkolaStatistiky.tsx: "view" podobrazovka se zděděným themeParent:
    // 'school-room', obalená jen do <SurfaceThemeScope>, žádný
    // <SurfaceBackdrop>.
    <SurfaceThemeScope surfaceId="school-alerts" className="sr-subpage">
    <div className="app-container app-container--shared-header">
      <BuddyHeader title="Upozornění" icon="bell" onBack={() => navigate('/skola')} />

      <div className="sr-upozorneni-seznam">
        {notifications.length === 0 ? (
          <p className="sr-upozorneni-prazdno buddy-ui-card buddy-ui-status">
            Zatím nemáš žádná školní upozornění.
          </p>
        ) : (
          notifications.map((n) => {
            const jePrecteno = profile.readNotifications.includes(n.id)
            return (
              <button
                key={n.id}
                type="button"
                className={`buddy-ui-row sr-upozorneni-polozka ${jePrecteno ? 'je-precteno' : ''}`}
                onClick={() => markNotificationRead(n.id)}
              >
                {!jePrecteno && <span className="sr-upozorneni-tecka" aria-hidden="true" />}
                <span className="sr-upozorneni-text">
                  <span className="sr-upozorneni-nadpis">{n.title}</span>
                  <span className="sr-upozorneni-cas">{n.time}</span>
                </span>
              </button>
            )
          })
        )}
      </div>

      {/* Krok 19: viz stejný komentář v SkolaStatistiky.tsx — tahle
          podstránka taky nejde přes FlagshipShell, lištu si proto
          nese sama. */}
      <AppBottomNav />
    </div>
    </SurfaceThemeScope>
  )
}

export default SkolaUpozorneni
