import React from 'react'
import { ShopIcon } from './ShopIcon'
import { sklonujDen } from '@/core/utils/text'
import type { RoleDefinition } from '@/core/role'

interface ShopBalanceProps {
  balance: number
  role: RoleDefinition
  /** Zbývající dny platnosti; null = role bez omezení */
  daysLeft: number | null
  validUntil: string
}

// Hlavička obchodu: kolik má uživatel kreditů a jakou má roli. Role se
// bere z aktivního přiřazení, takže po vypršení VIP tu poctivě svítí
// zase Student — ne poslední koupená role.
export const ShopBalance: React.FC<ShopBalanceProps> = ({
  balance,
  role,
  daysLeft,
  validUntil,
}) => (
  <section className="shop-balance-card">
    <div className="shop-balance-main">
      <span className="shop-balance-label">TVŮJ ZŮSTATEK</span>
      <span className="shop-balance-value">
        <ShopIcon name="coin" size={22} />
        {balance}
        <span className="shop-balance-unit">kreditů</span>
      </span>
      {balance === 0 && (
        <span className="shop-balance-hint">
          Kredity se zatím nedají získat — nákupy se teprve připojují.
        </span>
      )}
    </div>

    <div className={`shop-role-chip is-${role.tone}`}>
      <span className="shop-role-icon" aria-hidden="true">{role.icon}</span>
      <span className="shop-role-text">
        <span className="shop-role-title">{role.title}</span>
        <span className="shop-role-sub">
          {daysLeft === null
            ? role.description
            : daysLeft > 0
              ? `Platí ještě ${daysLeft} ${sklonujDen(daysLeft)} — do ${validUntil}`
              : 'Platnost vypršela'}
        </span>
      </span>
    </div>
  </section>
)
