import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PrehledPanel } from './components/PrehledPanel'
import { SocialReportPanel } from './components/SocialReportPanel'
import { NotifikacePanel } from './components/NotifikacePanel'
import { AuditLogPanel } from './components/AuditLogPanel'
import { UzivatelePanel } from './components/UzivatelePanel'
import { SystemPanel } from './components/SystemPanel'
import { KonzolePanel } from './components/KonzolePanel'
import { ADMIN_TABS, AdminTab } from './types'
import { useHasPermission } from '@/core/role'
import './AdminModule.css'

// ==========================================
// Admin panel. Vstup do něj hlídá /admin v App.tsx — buď oprávněním
// 'admin.panel' (ADMIN_ROLE), nebo 'moderation.content' (MODERATOR_
// ROLE). Dřív měl moderátor oprávnění v databázi (jsem_moderator()
// pouštěl čtení a vyřizování hlášení), ale nikde v appce žádnou
// obrazovku, která by ho tam pustila — App.tsx kontroloval jen
// admin.panel. Tahle komponenta teď podle stejné dvojice oprávnění
// sama omezí, které záložky se vůbec zobrazí: moderátor bez
// admin.panel vidí jen SocialReport, ne agregáty z Přehledu, Uživatele
// ani Audit log, které jsou admin-only i v databázi (jsem_admin()).
//
// To ale chrání jen vzhled, ne data: každé volání odsud dolů (přehled,
// hlášení) si přístup ověřuje samo v databázi (jsem_admin(),
// jsem_moderator()), protože role v prohlížeči si uživatel může
// přepsat — viz varování v core/role/types.ts.
// ==========================================

export const AdminModule: React.FC = () => {
  const navigate = useNavigate()
  const smiAdmin = useHasPermission('admin.panel')
  const smiModerovat = useHasPermission('moderation.content')

  const viditelneTaby = useMemo(
    () => (smiAdmin ? ADMIN_TABS : ADMIN_TABS.filter((t) => t.id === 'social-report')),
    [smiAdmin]
  )

  const [tab, setTab] = useState<AdminTab>(smiAdmin ? 'prehled' : 'social-report')

  return (
    <div className="admin-page">
      <div className="admin-top-bar">
        <button className="admin-back-btn" onClick={() => navigate('/nastaveni')}>
          ← Zpět do nastavení
        </button>
        <h1 className="admin-title">{smiAdmin ? 'Admin panel' : 'Moderace'}</h1>
      </div>

      <nav className="admin-nav">
        {viditelneTaby.map((t) => (
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
        {tab === 'prehled' && smiAdmin && <PrehledPanel />}
        {tab === 'social-report' && (smiAdmin || smiModerovat) && <SocialReportPanel />}
        {tab === 'notifikace' && smiAdmin && <NotifikacePanel />}
        {tab === 'audit-log' && smiAdmin && <AuditLogPanel />}
        {tab === 'uzivatele' && smiAdmin && <UzivatelePanel />}
        {tab === 'system' && smiAdmin && <SystemPanel />}
        {tab === 'konzole' && smiAdmin && <KonzolePanel />}
      </div>
    </div>
  )
}

export default AdminModule
