import React from 'react'
import { formatPrice } from '../catalog'
import { sklonujDen } from '@/core/utils/text'
import type { VipPlan } from '../types'

interface VipPlanCardProps {
  plan: VipPlan
  /** Uživatel už VIP má — nabídka pak mluví o prodloužení, ne o koupi */
  isVip: boolean
  onBuy: (plan: VipPlan) => void
}

export const VipPlanCard: React.FC<VipPlanCardProps> = ({ plan, isVip, onBuy }) => (
  <button
    className={`shop-vip-plan ${plan.highlight ? 'is-highlight' : ''}`}
    onClick={() => onBuy(plan)}
  >
    {plan.tag && <span className="shop-vip-plan-tag">{plan.tag}</span>}

    <div className="shop-vip-plan-head">
      <span className="shop-vip-plan-title">{plan.title}</span>
      <span className="shop-vip-plan-days">{plan.days} {sklonujDen(plan.days)}</span>
    </div>

    <span className="shop-vip-plan-price">{formatPrice(plan.priceHaler)}</span>

    <span className="shop-vip-plan-monthly">
      {formatPrice(plan.monthlyHaler)} / měsíc
      {plan.savingPercent > 0 && (
        <span className="shop-vip-plan-saving">ušetříš {plan.savingPercent} %</span>
      )}
    </span>

    <span className="shop-vip-plan-cta">{isVip ? 'Prodloužit' : 'Vybrat'}</span>
  </button>
)
