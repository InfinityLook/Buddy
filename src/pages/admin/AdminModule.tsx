import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PrehledPanel } from './components/PrehledPanel'
import { SocialReportPanel } from './components/SocialReportPanel'
import { NotifikacePanel } from './components/NotifikacePanel'
import { AuditLogPanel } from './components/AuditLogPanel'
import { UzivatelePanel } from './components/UzivatelePanel'
import { SystemPanel } from './components/SystemPanel'
import { KonzolePanel } from './components/KonzolePanel'
import { ADMIN_TABS, AdminTab, AdminTabDef } from './types'
import { MODERATOR_ROLE, ADMIN_ROLE, useHasPermission } from '@/core/role'
import './AdminModule.css'

// ==========================================
// Admin panel. Vstup do něj hlídá /admin v App.tsx — buď oprávněním
// 'admin.panel' (ADMIN_ROLE), nebo 'moderation.content' (MODERATOR_
// ROLE). Dřív měl moderátor oprávnění v databázi (jsem_moderator()
// pouštěl čtení a vyřizování hlášení), ale nikde v appce žádnou
// obrazovku, která by ho tam pustila — App.tsx kontroloval jen
// admin.panel. Tahle komponenta teď podle stejné dvojice oprávnění
// sama omezí, které sekce se vůbec zobrazí: moderátor bez admin.panel
// vidí jen SocialReport, ne agregáty z Přehledu, Uživatele ani Audit
// log, které jsou admin-only i v databázi (jsem_admin()).
//
// To ale chrání jen vzhled, ne data: každé volání odsud dolů (přehled,
// hlášení) si přístup ověřuje samo v databázi (jsem_admin(),
// jsem_moderator()), protože role v prohlížeči si uživatel může
// přepsat — viz varování v core/role/types.ts.
//
// Vstupní obrazovka je teď menu, ne rovnou první panel — sekce mají
// jinou váhu (Přehled je občasný pohled, Uživatelé je akce, co se
// nemá udělat omylem) a plochá lišta se sedmi záložkami tohle
// nerozlišovala. Menu navíc řadí sekce do dvou skupin podle toho, jaké
// oprávnění je otevře (ADMIN_TABS.permission), a u každé položky
// zobrazí štítek nejnižší role, co ji smí otevřít — moderátor bez
// admin.panel proto rovnou vidí, že zbytek menu na něj nečeká
// schovaný, prostě tam není.
// ==========================================

const PANEL_PODLE_TABU: Record<AdminTab, React.ComponentType> = {
  prehled: PrehledPanel,
  'social-report': SocialReportPanel,
  notifikace: NotifikacePanel,
  'audit-log': AuditLogPanel,
  uzivatele: UzivatelePanel,
  system: SystemPanel,
  konzole: KonzolePanel,
}

/** Role, co se u položky menu zobrazí jako "potřebuješ aspoň tohle" —
 *  odvozená z ADMIN_TABS.permission, žádný druhý seznam k údržbě. */
const rolePodleOpravneni = (permission: AdminTabDef['permission']) =>
  permission === 'admin.panel' ? ADMIN_ROLE : MODERATOR_ROLE

export const AdminModule: React.FC = () => {
  const navigate = useNavigate()
  const smiAdmin = useHasPermission('admin.panel')
  const smiModerovat = useHasPermission('moderation.content')

  const viditelneTaby = useMemo(
    () => ADMIN_TABS.filter((t) => (t.permission === 'admin.panel' ? smiAdmin : smiAdmin || smiModerovat)),
    [smiAdmin, smiModerovat]
  )

  // Skupiny podle role — 'moderation.content' první (nižší práh),
  // 'admin.panel' pod tím. Skupina se vůbec nevykreslí, když v ní pro
  // tohohle uživatele nic není (moderátor bez admin.panel tak uvidí
  // jen skupinu Moderace).
  const skupinaModerace = viditelneTaby.filter((t) => t.permission === 'moderation.content')
  const skupinaAdministrace = viditelneTaby.filter((t) => t.permission === 'admin.panel')

  const [sekce, setSekce] = useState<AdminTab | null>(null)
  const aktivniTab = sekce ? ADMIN_TABS.find((t) => t.id === sekce) : null
  const AktivniPanel = sekce ? PANEL_PODLE_TABU[sekce] : null

  // Na sekci uvnitř menu se hlídá i tady, ne jen filtrováním menu výš
  // — přímý zápis stavu (např. z browser dev toolů) by jinak vykreslil
  // panel, na který uživatel nemá oprávnění ani zobrazit v menu.
  const smiOtevrenouSekci =
    aktivniTab && (aktivniTab.permission === 'admin.panel' ? smiAdmin : smiAdmin || smiModerovat)

  return (
    <div className="admin-page">
      <div className="admin-top-bar">
        <button
          className="admin-back-btn"
          onClick={() => (sekce ? setSekce(null) : navigate('/nastaveni'))}
        >
          ← {sekce ? 'Zpět do menu' : 'Zpět do nastavení'}
        </button>
        <h1 className="admin-title">
          {sekce && aktivniTab ? aktivniTab.label : smiAdmin ? 'Admin panel' : 'Moderace'}
        </h1>
      </div>

      {!sekce && (
        <div className="admin-menu">
          {skupinaModerace.length > 0 && (
            <div className="admin-menu-skupina">
              <span className="admin-menu-skupina-title">Moderace</span>
              {skupinaModerace.map((t) => (
                <PolozkaMenu key={t.id} tab={t} onOtevrit={() => setSekce(t.id)} />
              ))}
            </div>
          )}
          {skupinaAdministrace.length > 0 && (
            <div className="admin-menu-skupina">
              <span className="admin-menu-skupina-title">Administrace</span>
              {skupinaAdministrace.map((t) => (
                <PolozkaMenu key={t.id} tab={t} onOtevrit={() => setSekce(t.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {sekce && AktivniPanel && (
        <div className="admin-content">{smiOtevrenouSekci ? <AktivniPanel /> : null}</div>
      )}
    </div>
  )
}

const PolozkaMenu: React.FC<{ tab: AdminTabDef; onOtevrit: () => void }> = ({ tab, onOtevrit }) => {
  const role = rolePodleOpravneni(tab.permission)
  return (
    <button className="admin-menu-polozka" onClick={onOtevrit}>
      <span className="admin-menu-ikona" aria-hidden="true">
        {tab.icon}
      </span>
      <span className="admin-menu-text">
        <span className="admin-menu-nazev">{tab.label}</span>
        <span className="admin-menu-popis">{tab.popis}</span>
        <span className={`admin-menu-role admin-menu-role--${role.tone}`}>
          {role.icon} {role.title}
        </span>
      </span>
      <span className="admin-menu-sipka" aria-hidden="true">
        ›
      </span>
    </button>
  )
}

export default AdminModule
