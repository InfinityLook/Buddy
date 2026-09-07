import React, { lazy, Suspense, useEffect, useState } from 'react'
import * as api from '@/social/api'

// Lazy — stejný důvod jako SettingsModule.tsx's dřívější přímé volání:
// appka (Nastavení není za React.lazy) nechce natáhnout celé Social API
// do svého hlavního balíčku jen kvůli řádkům Blokovaní/Hlášení, co
// drtivá většina návštěv týhle stránky vůbec nerozklikne.
const SocialniNastaveniSekce = lazy(() => import('./SocialniNastaveniSekce'))

interface Props {
  onToast: (zprava: string) => void
}

type Akordeon = 'soukromi' | 'social' | null

// ==========================================
// Nastavení — Soukromí a Social. Sloučilo dvě dřívější samostatné
// karty (Soukromí, Sociální nastavení) do jednoho modulu se dvěma
// rozbalovacími akordeony — obě řeší "co o mně/mém obsahu ostatní
// vidí", jen jinou vrstvu (kdo mě smí sledovat vs. koho jsem
// zablokoval/co bylo nahlášeno).
// ==========================================

export const SoukromiSocialSekce: React.FC<Props> = ({ onToast }) => {
  const [otevreno, setOtevreno] = useState<Akordeon>(null)
  const [soukromy, setSoukromy] = useState(false)
  const [meniSoukromi, setMeniSoukromi] = useState(false)
  const [skrytOnline, setSkrytOnline] = useState(false)
  const [meniSkrytOnline, setMeniSkrytOnline] = useState(false)

  // Soukromí i skrytí online stavu žijí na profiles v cloudu, ne
  // v lokálním useProfileData — appka je proto natáhne zvlášť, stejným
  // způsobem jako VerejnyProfilDialog.tsx čte cizí profil.
  useEffect(() => {
    void api.nactiSoukromy().then(setSoukromy)
    void api.nactiSkrytOnline().then(setSkrytOnline)
  }, [])

  const prepnout = (id: Akordeon) => setOtevreno((s) => (s === id ? null : id))

  return (
    <>
      {/* Soukromí — přepínač veřejný/soukromý účet + skrýt online stav.
          Plain sloupce profiles.soukromy/skryt_online (social/api.ts),
          žádná zvláštní databázová funkce — stejné právo jako na
          jméno/motto. */}
      <section className="settings-card">
        <button
          type="button"
          className="settings-accordion-hlava"
          onClick={() => prepnout('soukromi')}
          aria-expanded={otevreno === 'soukromi'}
        >
          <span className="settings-card-icon purple" aria-hidden="true">🔒</span>
          <div>
            <h2 className="settings-card-title">Soukromí</h2>
            <p className="settings-card-sub">Kdo tě může sledovat a vidět tvoje příspěvky</p>
          </div>
          <span className={`settings-accordion-sipka ${otevreno === 'soukromi' ? 'je-otevreno' : ''}`} aria-hidden="true">
            ›
          </span>
        </button>

        {otevreno === 'soukromi' && (
          <>
            <div className="settings-toggle-row">
              <div className="settings-toggle-text">
                <span className="settings-toggle-title">Soukromý účet</span>
                <span className="settings-toggle-sub">
                  Nové sledování musí schválit — příspěvky uvidí jen schválení sledující
                </span>
              </div>
              <button
                className={`settings-switch ${soukromy ? 'on' : ''}`}
                role="switch"
                aria-checked={soukromy}
                aria-label="Soukromý účet"
                disabled={meniSoukromi}
                onClick={async () => {
                  setMeniSoukromi(true)
                  const nove = !soukromy
                  const vysledek = await api.nastavSoukromy(nove)
                  if (vysledek.ok) {
                    setSoukromy(nove)
                    onToast(nove ? 'Účet je teď soukromý' : 'Účet je teď veřejný')
                  } else {
                    onToast(vysledek.chyba ?? 'Nepovedlo se to.')
                  }
                  setMeniSoukromi(false)
                }}
              >
                <span className="settings-switch-knob" />
              </button>
            </div>

            <div className="settings-toggle-row">
              <div className="settings-toggle-text">
                <span className="settings-toggle-title">Skrýt online stav</span>
                <span className="settings-toggle-sub">
                  Přátelé neuvidí zelenou tečku, že máš appku zrovna otevřenou
                </span>
              </div>
              <button
                className={`settings-switch ${skrytOnline ? 'on' : ''}`}
                role="switch"
                aria-checked={skrytOnline}
                aria-label="Skrýt online stav"
                disabled={meniSkrytOnline}
                onClick={async () => {
                  setMeniSkrytOnline(true)
                  const nove = !skrytOnline
                  const vysledek = await api.nastavSkrytOnline(nove)
                  if (vysledek.ok) {
                    setSkrytOnline(nove)
                    onToast(nove ? 'Online stav je teď skrytý' : 'Online stav je teď vidět přátelům')
                  } else {
                    onToast(vysledek.chyba ?? 'Nepovedlo se to.')
                  }
                  setMeniSkrytOnline(false)
                }}
              >
                <span className="settings-switch-knob" />
              </button>
            </div>
          </>
        )}
      </section>

      {/* Sociální nastavení — Blokovaní a Hlášení. */}
      <section className="settings-card">
        <button
          type="button"
          className="settings-accordion-hlava"
          onClick={() => prepnout('social')}
          aria-expanded={otevreno === 'social'}
        >
          <span className="settings-card-icon purple" aria-hidden="true">🚫</span>
          <div>
            <h2 className="settings-card-title">Social settings</h2>
            <p className="settings-card-sub">Blokovaní lidé a nahlášený obsah</p>
          </div>
          <span className={`settings-accordion-sipka ${otevreno === 'social' ? 'je-otevreno' : ''}`} aria-hidden="true">
            ›
          </span>
        </button>

        {otevreno === 'social' && (
          <Suspense fallback={<p className="settings-lazy-fallback">Načítám…</p>}>
            <SocialniNastaveniSekce />
          </Suspense>
        )}
      </section>
    </>
  )
}

export default SoukromiSocialSekce
