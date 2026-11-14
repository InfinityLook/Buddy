import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShopIcon } from './components/ShopIcon'
import { ShopBalance } from './components/ShopBalance'
import { CreditPackCard } from './components/CreditPackCard'
import { VipPlanCard } from './components/VipPlanCard'
import { ShopItemCard } from './components/ShopItemCard'
import { BuddyPage } from '@/components/buddy-ui/BuddyPage'
import { BuddyDialog } from '@/components/buddy-ui/BuddyDialog'
import type { PurchaseTarget } from './types'
import { sklonujDen } from '@/core/utils/text'
import { useShop } from './useShop'
import {
  CREDIT_PACKS,
  SHOP_CATEGORIES,
  VIP_BENEFITS,
  VIP_PLANS,
  itemsByCategory,
  formatPrice,
  packTotalCredits,
} from './catalog'
import './ShopModule.css'

export const ShopModule: React.FC = () => {
  const navigate = useNavigate()

  const [selection, setSelection] = useState<PurchaseTarget | null>(null)

  const {
    balance,
    role,
    isVip,
    vipDaysLeft,
    vipValidUntil,
    activeCategory,
    setActiveCategory,
    getAvailability,
    ownsItem,
  } = useShop()

  const polozky = itemsByCategory(activeCategory)
  const kategorie = SHOP_CATEGORIES.find((c) => c.id === activeCategory)
  const offer = selection?.kind === 'item' ? selection.item : selection?.kind === 'credits' ? selection.pack : selection?.plan
  const description = selection?.kind === 'item' ? selection.item.description
    : selection?.kind === 'credits' ? `${packTotalCredits(selection.pack)} kreditů`
    : selection ? `VIP na ${selection.plan.days} ${sklonujDen(selection.plan.days)}` : ''

  return (
    <BuddyPage className="shop-page" surfaceId="shop" title="Obchod"
      backLabel="Zpět do Hubu" onBack={() => navigate('/hub')}>
      <p className="shop-notice">
        <ShopIcon name="info" size={16} /> Platby zatím nejsou dostupné. Nabídka a ceny se mohou změnit.
      </p>

      <ShopBalance
        balance={balance}
        role={role}
        daysLeft={vipDaysLeft}
        validUntil={vipValidUntil}
      />

      {/* VIP */}
      <section className="shop-section">
        <div className="shop-section-head">
          <span>
            <ShopIcon name="crown" size={16} />
            VIP předplatné
          </span>
          {isVip && <span className="shop-section-count">Máš aktivní</span>}
        </div>

        <div className="shop-vip-card">
          <ul className="shop-vip-benefits">
            {VIP_BENEFITS.map((benefit) => (
              <li key={benefit.text}>
                <span aria-hidden="true">{benefit.icon}</span>
                {benefit.text}
              </li>
            ))}
          </ul>

          <div className="shop-vip-plans">
            {VIP_PLANS.map((plan) => (
              <VipPlanCard
                key={plan.id}
                plan={plan}
                isVip={isVip}
                onBuy={(vybrany) => setSelection({ kind: 'vip', plan: vybrany })}
              />
            ))}
          </div>

          <p className="shop-vip-note">
            <ShopIcon name="clock" size={13} />
            Předplatné se neobnovuje samo — po skončení se vrátíš na běžný
            účet a nic ti nestrhneme.
          </p>
        </div>
      </section>

      {/* Kredity za peníze */}
      <section className="shop-section">
        <div className="shop-section-head">
          <span>
            <ShopIcon name="coin" size={16} />
            Dobít kredity
          </span>
        </div>

        <div className="shop-pack-grid">
          {CREDIT_PACKS.map((pack) => (
            <CreditPackCard
              key={pack.id}
              pack={pack}
              onBuy={(vybrany) => setSelection({ kind: 'credits', pack: vybrany })}
            />
          ))}
        </div>
      </section>

      {/* Zboží za kredity */}
      <section className="shop-section">
        <div className="shop-section-head">
          <span>
            <ShopIcon name="sparkle" size={16} />
            Za kredity
          </span>
        </div>

        <div className="shop-cat-tabs buddy-ui-segmented" role="group" aria-label="Kategorie obchodu">
          {SHOP_CATEGORIES.map((cat) => (
            <button
              type="button"
              key={cat.id}
              aria-pressed={activeCategory === cat.id}
              className={`shop-cat-tab ${activeCategory === cat.id ? 'is-active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span aria-hidden="true">{cat.icon}</span>
              {cat.title}
            </button>
          ))}
        </div>

        {kategorie && <p className="shop-cat-desc">{kategorie.description}</p>}

        <div className="shop-item-list">
          {polozky.map((item) => (
            <ShopItemCard
              key={item.id}
              item={item}
              owned={item.permanent && ownsItem(item.id)}
              affordable={balance >= item.price}
              isVip={isVip}
              onBuy={(vybrana) => setSelection({ kind: 'item', item: vybrana })}
            />
          ))}
        </div>
      </section>

      {selection && offer && (
        <BuddyDialog surfaceId="shop" title={offer.title} onClose={() => setSelection(null)}
          footer={<button type="button" className="buddy-ui-button" onClick={() => setSelection(null)}>Hotovo</button>}>
          <p>{description}</p>
          <dl className="shop-offer-meta">
            <div><dt>Cena</dt><dd>{'priceHaler' in offer ? formatPrice(offer.priceHaler) : `${offer.price} kreditů`}</dd></div>
            <div><dt>Zůstatek</dt><dd>{balance} kreditů</dd></div>
          </dl>
          <p className="buddy-ui-status" role="status">{getAvailability(selection).message}</p>
        </BuddyDialog>
      )}
    </BuddyPage>
  )
}

export default ShopModule
