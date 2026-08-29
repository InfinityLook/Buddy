import React, { useEffect, useState } from 'react'
import { SocialAvatar } from './SocialAvatar'
import * as api from '../api'
import type { SocialProfil } from '../types'

interface Props {
  pocatecniTab: 'sledujici' | 'sledovani'
  onOtevritProfil: (userId: string) => void
  onZavrit: () => void
}

// ==========================================
// Vlastní seznam sledujících/sledovaných — appka na rozdíl od
// veřejných počtů (VztahSledovani.sledujiciCelkem/sledovaniCelkem)
// nikdy neukazuje cizí seznam, jen svůj vlastní (viz api.ts,
// moji_sledujici()/moje_sledovani()). Odebrání sledujícího (item ze
// seznamu "Sledující") a přestat sledovat (ze seznamu "Sledovaní")
// jsou obě akce, které RLS už dřív dovolovala, jen pro ně dřív
// nebylo žádné UI.
//
// Ne portál do document.body — na rozdíl od PrispevekProhlizec.tsx/
// StoryProhlizec.tsx tohle je běžný dialog stejného tvaru jako
// NahlasitDialog.tsx (.social-overlay + .social-dialog jako sourozenci,
// ne celoobrazovkový přes portál).
// ==========================================
export const SledujiciDialog: React.FC<Props> = ({ pocatecniTab, onOtevritProfil, onZavrit }) => {
  const [tab, setTab] = useState(pocatecniTab)
  const [sledujici, setSledujici] = useState<SocialProfil[] | null>(null)
  const [sledovani, setSledovani] = useState<SocialProfil[] | null>(null)
  const [zpracovava, setZpracovava] = useState<string | null>(null)

  useEffect(() => {
    let platne = true
    void api.nactiMojeSledujici().then((s) => platne && setSledujici(s))
    void api.nactiMojeSledovane().then((s) => platne && setSledovani(s))
    return () => {
      platne = false
    }
  }, [])

  const odebratSledujiciho = async (id: string) => {
    setZpracovava(id)
    const v = await api.odebratSledujiciho(id)
    if (v.ok) setSledujici((s) => s?.filter((p) => p.id !== id) ?? s)
    setZpracovava(null)
  }

  const prestatSledovat = async (id: string) => {
    setZpracovava(id)
    const v = await api.prestatSledovatUcet(id)
    if (v.ok) setSledovani((s) => s?.filter((p) => p.id !== id) ?? s)
    setZpracovava(null)
  }

  const seznam = tab === 'sledujici' ? sledujici : sledovani

  return (
    <>
      <div className="social-overlay" onClick={onZavrit} />
      <div className="social-dialog social-dialog--sledujici">
        <div className="social-sledujici-taby">
          <button
            className={`social-prispevky-tab ${tab === 'sledujici' ? 'is-aktivni' : ''}`}
            onClick={() => setTab('sledujici')}
          >
            Sledující
          </button>
          <button
            className={`social-prispevky-tab ${tab === 'sledovani' ? 'is-aktivni' : ''}`}
            onClick={() => setTab('sledovani')}
          >
            Sledovaní
          </button>
        </div>

        <div className="social-sledujici-seznam">
          {seznam === null ? (
            <p className="social-empty-note">Načítám…</p>
          ) : seznam.length === 0 ? (
            <p className="social-empty-note social-empty-note--stred">
              {tab === 'sledujici' ? 'Zatím tě nikdo nesleduje.' : 'Zatím nikoho nesleduješ.'}
            </p>
          ) : (
            seznam.map((p) => (
              <div key={p.id} className="social-row">
                <button className="social-row-otevrit" onClick={() => onOtevritProfil(p.id)}>
                  <SocialAvatar id={p.id} jmeno={p.displayName} avatarUrl={p.avatarUrl} />
                  <span className="social-row-name">{p.displayName}</span>
                </button>

                {tab === 'sledujici' ? (
                  <button
                    className="social-btn social-btn--small social-btn--tlumene"
                    disabled={zpracovava === p.id}
                    onClick={() => odebratSledujiciho(p.id)}
                  >
                    Odebrat
                  </button>
                ) : (
                  <button
                    className="social-btn social-btn--small social-btn--tlumene"
                    disabled={zpracovava === p.id}
                    onClick={() => prestatSledovat(p.id)}
                  >
                    Přestat sledovat
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <button className="social-btn social-btn--full" onClick={onZavrit}>
          Zavřít
        </button>
      </div>
    </>
  )
}
