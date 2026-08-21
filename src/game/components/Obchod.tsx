import React from 'react'
import { PREDMETY } from '../obchod/predmety'
import { Postava } from '../types'
import { useWalletStore } from '@/core/store/useWalletStore'
import './Obchod.css'

interface Props {
  postava: Postava
  onOdejit: () => void
}

// ==========================================
// Tržiště — trvalá vylepšení za kredity z arény/dungeonu. Ceny
// zohledňují postavin obchodNasobicCeny (zatím jen Angel, +20 %) —
// pole čekalo na spotřebitele od chvíle, kdy vznikly bonusy postav.
// Koupené položky se ukládají do useWalletStore.ownedItems, stejná
// mechanika jako kosmetika ve Shopu — efekt aplikuje useSouboj.ts.
// ==========================================

export const Obchod: React.FC<Props> = ({ postava, onOdejit }) => {
  const balance = useWalletStore((s) => s.balance)
  const ownedItems = useWalletStore((s) => s.ownedItems)
  const spend = useWalletStore((s) => s.spend)
  const grantItem = useWalletStore((s) => s.grantItem)

  const drazsi = postava.obchodNasobicCeny > 1

  const koupit = (id: string, cena: number) => {
    if (!spend(cena)) return
    grantItem(id)
  }

  return (
    <div className="obchod">
      <div className="ob-top-bar">
        <button className="game-back-btn" onClick={onOdejit}>
          ← Zpět na mapu
        </button>
        <span className="ob-zustatek">💰 {balance}</span>
      </div>

      <div className="ob-hlavicka">
        <h1 className="ob-title">🏪 Tržiště Brodů</h1>
        <p className="ob-hint">Trvalá vylepšení za kredity z boje — platí pro celou tvou partu.</p>
        {drazsi && (
          <p className="ob-drazsi">
            Jako {postava.jmeno} platíš o {Math.round((postava.obchodNasobicCeny - 1) * 100)} % víc.
          </p>
        )}
      </div>

      <div className="ob-mrizka">
        {PREDMETY.map((p) => {
          const cena = Math.round(p.cena * postava.obchodNasobicCeny)
          const vlastni = ownedItems.includes(p.id)
          const nedostatek = !vlastni && balance < cena
          return (
            <div key={p.id} className="ob-karta">
              <span className="ob-karta-ikona" aria-hidden="true">
                {p.ikona}
              </span>
              <div className="ob-karta-obsah">
                <span className="ob-karta-jmeno">{p.nazev}</span>
                <span className="ob-karta-popis">{p.popis}</span>
                <span className="ob-karta-efekt">{p.efekt}</span>
              </div>
              <button
                className={`ob-koupit ${vlastni ? 'ob-koupit--vlastni' : ''}`}
                disabled={vlastni || nedostatek}
                onClick={() => koupit(p.id, cena)}
              >
                {vlastni ? 'Vlastníš' : `${cena} kr.`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
