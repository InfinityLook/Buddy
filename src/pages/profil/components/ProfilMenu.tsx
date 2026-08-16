import React from 'react'
import { ProfilIcon } from './ProfilIcon'

const menuItems = [
  { icon: 'user', color: 'blue', title: 'Osobní informace', sub: 'Uprav jméno, e-mail a další údaje' },
  { icon: 'shield', color: 'green', title: 'Zabezpečení', sub: 'Heslo, přihlášení a ochrana účtu' },
  { icon: 'bell', color: 'orange', title: 'Upozornění', sub: 'Spravuj notifikace a připomínky' },
  { icon: 'palette', color: 'purple', title: 'Vzhled aplikace', sub: 'Motiv, jazyk a další nastavení' },
  { icon: 'help-circle', color: 'cyan', title: 'Nápověda a podpora', sub: 'Často kladené otázky a kontakt' },
]

export const ProfilMenu: React.FC = () => (
  <section className="profil-menu-panel">
    {menuItems.map((item, index) => (
      <div key={index} className="profil-menu-item">
        <div className={`profil-menu-icon ${item.color}`}><ProfilIcon name={item.icon} size={20} /></div>
        <div className="profil-menu-text">
          <div className="profil-menu-title">{item.title}</div>
          <div className="profil-menu-sub">{item.sub}</div>
        </div>
        <ProfilIcon name="chevron-right" size={18} className="profil-chevron" />
      </div>
    ))}
  </section>
)
