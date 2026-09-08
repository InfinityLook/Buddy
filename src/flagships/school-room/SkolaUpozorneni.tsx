import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { useNotificationItems } from '@/pages/profil/components/ProfilNotifications'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
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
    <div className="app-container">
      <header className="app-header">
        <button className="app-back-btn" aria-label="Zpět" onClick={() => navigate('/skola')}>
          <AppIcon name="arrow-left" size={18} />
        </button>

        <div className="app-header-center">
          <div className="app-header-title-wrap">
            <AppIcon name="bell" size={22} className="app-header-icon" />
            <h1>Upozornění</h1>
          </div>
          <p>Co je nového</p>
        </div>

        <div className="app-header-actions" />
      </header>

      <div className="sr-upozorneni-seznam">
        {notifications.length === 0 ? (
          <p className="sr-upozorneni-prazdno">
            Zatím tu nic není. Jakmile se do něčeho pustíš, dáme ti vědět. 🔔
          </p>
        ) : (
          notifications.map((n) => {
            const jePrecteno = profile.readNotifications.includes(n.id)
            return (
              <button
                key={n.id}
                className={`sr-upozorneni-polozka ${jePrecteno ? 'je-precteno' : ''}`}
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
    </div>
  )
}

export default SkolaUpozorneni
