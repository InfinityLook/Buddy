import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PrehledPanel } from './components/PrehledPanel'
import { SocialReportPanel } from './components/SocialReportPanel'
import { NotifikacePanel } from './components/NotifikacePanel'
import { KonzolePanel } from './components/KonzolePanel'
import { ADMIN_TABS, AdminTab } from './types'
import './AdminModule.css'

// ==========================================
// Admin panel. Vstup do něj hlídá /admin v App.tsx (oprávnění
// 'admin.panel', ke kterému má definici jen ADMIN_ROLE) — tahle
// komponenta se proto nemusí ptát znovu, stejný princip jako Social
// nemá vlastní bránu a spoléhá na bránu v App.tsx.
//
// To ale chrání jen vzhled, ne data: každé volání odsud dolů (přehled,
// hlášení) si přístup ověřuje samo v databázi (jsem_admin(),
// jsem_moderator()), protože role v prohlížeči si uživatel může
// přepsat — viz varování v core/role/types.ts.
// ==========================================

export const AdminModule: React.FC = () => {
  const navigate = useNavigate()
  const [tab, setTab] = useState<AdminTab>('prehled')

  return (
    <div className="admin-page">
      <div className="admin-top-bar">
        <button className="admin-back-btn" onClick={() => navigate('/nastaveni')}>
          ← Zpět do nastavení
        </button>
        <h1 className="admin-title">Admin panel</h1>
      </div>

      <nav className="admin-nav">
        {ADMIN_TABS.map((t) => (
          <button
            key={t.id}
            className={`admin-nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="admin-content">
        {tab === 'prehled' && <PrehledPanel />}
        {tab === 'social-report' && <SocialReportPanel />}
        {tab === 'notifikace' && <NotifikacePanel />}
        {tab === 'konzole' && <KonzolePanel />}
      </div>
    </div>
  )
}

export default AdminModule
