import React from 'react'
import { ShopIcon } from './ShopIcon'
import type { ShopItem } from '../types'

interface ShopItemCardProps {
  item: ShopItem
  owned: boolean
  /** Stačí zůstatek na koupi? Řídí jen vzhled, ne to, co se smí koupit. */
  affordable: boolean
  isVip: boolean
  onBuy: (item: ShopItem) => void
}

export const ShopItemCard: React.FC<ShopItemCardProps> = ({
  item,
  owned,
  affordable,
  isVip,
  onBuy,
}) => {
  const vipZamek = Boolean(item.vipOnly) && !isVip

  return (
    <article
      className={`shop-item-card ${owned ? 'is-owned' : ''} ${vipZamek ? 'is-locked' : ''}`}
    >
      <span className="shop-item-icon" aria-hidden="true">{item.icon}</span>

      <div className="shop-item-text">
        <span className="shop-item-title">
          {item.title}
          {item.vipOnly && (
            <span className="shop-item-vip-tag">
              <ShopIcon name="crown" size={11} />
              VIP
            </span>
          )}
        </span>
        <span className="shop-item-desc">{item.description}</span>

        {/* Spotřební zboží jde koupit opakovaně — ať je to vidět dopředu */}
        {!item.permanent && !item.comingSoon && (
          <span className="shop-item-note">Jednorázové — dá se koupit znovu</span>
        )}
      </div>

      <div className="shop-item-buy">
        <button type="button" className="buddy-ui-button shop-item-detail"
          aria-label={`Detail nabídky ${item.title}`} onClick={() => onBuy(item)}>
          {owned ? 'Máš' : item.comingSoon ? 'Brzy' : <>
            <ShopIcon name={vipZamek ? 'lock' : 'coin'} size={14} />
            {item.price}
          </>}
        </button>
        {!owned && !item.comingSoon && !vipZamek && !affordable && <span className="shop-item-note">Málo kreditů</span>}
      </div>
    </article>
  )
}
