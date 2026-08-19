import React from 'react'
import { formatPrice, packTotalCredits } from '../catalog'
import type { CreditPack } from '../types'

interface CreditPackCardProps {
  pack: CreditPack
  onBuy: (pack: CreditPack) => void
}

export const CreditPackCard: React.FC<CreditPackCardProps> = ({ pack, onBuy }) => {
  const celkem = packTotalCredits(pack)

  return (
    <button
      className={`shop-pack-card ${pack.highlight ? 'is-highlight' : ''}`}
      onClick={() => onBuy(pack)}
    >
      {pack.tag && <span className="shop-pack-tag">{pack.tag}</span>}

      <span className="shop-pack-icon" aria-hidden="true">{pack.icon}</span>

      <span className="shop-pack-title">{pack.title}</span>

      <span className="shop-pack-credits">
        {celkem}
        <span className="shop-pack-credits-unit">kreditů</span>
      </span>

      {/* Bonus se vypisuje zvlášť, ať je vidět, za co se připlácí */}
      {pack.bonusCredits > 0 && (
        <span className="shop-pack-bonus">{pack.credits} + {pack.bonusCredits} zdarma</span>
      )}

      <span className="shop-pack-price">{formatPrice(pack.priceHaler)}</span>
    </button>
  )
}
