import React from 'react';
import { User, Shield, Bell, Palette, HelpCircle, ChevronRight } from 'lucide-react';

const menuItems = [
  { icon: User, color: 'blue', title: 'Osobní informace', sub: 'Uprav jméno, e-mail a další údaje' },
  { icon: Shield, color: 'green', title: 'Zabezpečení', sub: 'Heslo, přihlášení a ochrana účtu' },
  { icon: Bell, color: 'orange', title: 'Upozornění', sub: 'Spravuj notifikace a připomínky' },
  { icon: Palette, color: 'purple', title: 'Vzhled aplikace', sub: 'Motiv, jazyk a další nastavení' },
  { icon: HelpCircle, color: 'cyan', title: 'Nápověda a podpora', sub: 'Často kladené otázky a kontakt' },
];

export const ProfilMenu: React.FC = () => (
  <section className="profil-menu-panel">
    {menuItems.map((item, index) => {
      const Icon = item.icon;
      return (
        <div key={index} className="profil-menu-item">
          <div className={`profil-menu-icon ${item.color}`}><Icon size={20} /></div>
          <div className="profil-menu-text">
            <div className="profil-menu-title">{item.title}</div>
            <div className="profil-menu-sub">{item.sub}</div>
          </div>
          <ChevronRight size={18} className="profil-chevron" />
        </div>
      );
    })}
  </section>
);
