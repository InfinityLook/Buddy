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
        {owned ? (
          <span className="shop-item-owned">
            <ShopIcon name="check" size={14} />
            Máš
          </span>
        ) : item.comingSoon ? (
          <span className="shop-item-soon">Brzy</span>
        ) : (
          <button
            className={`shop-item-btn ${affordable && !vipZamek ? '' : 'is-dim'}`}
            onClick={() => onBuy(item)}
          >
            {vipZamek ? <ShopIcon name="lock" size={13} /> : <ShopIcon name="coin" size={13} />}
            {item.price}
          </button>
        )}
      </div>
    </article>
  )
}
