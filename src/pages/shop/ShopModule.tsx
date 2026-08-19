import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShopIcon } from './components/ShopIcon'
import { ShopBalance } from './components/ShopBalance'
import { CreditPackCard } from './components/CreditPackCard'
import { VipPlanCard } from './components/VipPlanCard'
import { ShopItemCard } from './components/ShopItemCard'
import { useShop } from './useShop'
import {
  CREDIT_PACKS,
  SHOP_CATEGORIES,
  VIP_BENEFITS,
  VIP_PLANS,
  itemsByCategory,
} from './catalog'
import './ShopModule.css'

// ==========================================
// Obchod.
//
// Zatím je to výkladní skříň: katalog, ceny i stavy jsou skutečné, ale
// platby připojené nejsou a žádný nákup se nedokončí. Všechno vede přes
// useShop().tryPurchase, takže napojení brány je změna v jednom souboru.
//
// Proto tu je nahoře poctivé upozornění — uživatel nesmí klepnout na
// "koupit" a čekat, že se něco stane.
// ==========================================

export const ShopModule: React.FC = () => {
  const navigate = useNavigate()

  const {
    balance,
    role,
    isVip,
    vipDaysLeft,
    vipValidUntil,
    activeCategory,
    setActiveCategory,
    tryPurchase,
    ownsItem,
    toast,
  } = useShop()

  const polozky = itemsByCategory(activeCategory)
  const kategorie = SHOP_CATEGORIES.find((c) => c.id === activeCategory)

  return (
    <div className="shop-page">
      <div className="shop-top-bar">
        <div>
          <button className="shop-back-btn" onClick={() => navigate('/hub')}>
            ← Zpět do Hubu
          </button>
          <h1 className="shop-title">Obchod</h1>
          <p className="shop-subtitle">
            Kredity, VIP a doplňky, kterými si aplikaci uděláš po svém.
          </p>
        </div>
        <span className="shop-hero-icon" aria-hidden="true">🛍️</span>
      </div>

      {/* Nasazená verze zatím neumí přijmout platbu. Říct to rovnou je
          poctivější než nechat uživatele klepat na tlačítka naslepo. */}
      <div className="shop-notice">
        <ShopIcon name="info" size={16} />
        <span>
          Obchod je zatím jen náhled — platby se připojují a žádný nákup se
          teď nedokončí. Ceny i nabídka se ještě můžou změnit.
        </span>
      </div>

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
                onBuy={(vybrany) => tryPurchase({ kind: 'vip', plan: vybrany })}
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
              onBuy={(vybrany) => tryPurchase({ kind: 'credits', pack: vybrany })}
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

        <div className="shop-cat-tabs">
          {SHOP_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
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
              onBuy={(vybrana) => tryPurchase({ kind: 'item', item: vybrana })}
            />
          ))}
        </div>
      </section>

      {toast && <div className="shop-toast">{toast}</div>}
    </div>
  )
}

export default ShopModule
