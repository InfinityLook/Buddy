import React, { useState } from 'react'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { useHasPermission } from '@/core/role'
import { useThemeStore, VSECHNY_VZHLEDY } from '@/core/theme'
import { AVATAR_FRAMES } from '@/social/avatarFrames'

interface Props {
  onToast: (zprava: string) => void
}

// ==========================================
// Nastavení — Vzhled a rámečky. Obě dřívější samostatné karty (Vzhled
// aplikace, Rámeček avatáru) žijí teď jako dva rozbalovací akordeony
// uvnitř JEDNOHO modulu — appka je slučuje, protože obě řeší přesně
// tu samou otázku ("jak vypadá můj profil/appka"), jen jinou jeho
// část. Logika/mřížky samotné jsou beze změny, jen přesunuté sem.
// ==========================================

export const VzhledARamecekSekce: React.FC<Props> = ({ onToast }) => {
  const { profile, updateProfile } = useProfileData()
  const smiPremium = useHasPermission('cosmetics.premium')
  const themeId = useThemeStore((s) => s.themeId)
  const setThemeId = useThemeStore((s) => s.setThemeId)
  const [otevrenoVzhled, setOtevrenoVzhled] = useState(false)
  const [otevrenoRamecek, setOtevrenoRamecek] = useState(false)

  const vybratVzhled = (id: (typeof VSECHNY_VZHLEDY)[number]['id'], vip: boolean, nazev: string) => {
    if (vip && !smiPremium) {
      onToast('Tenhle vzhled je jen pro VIP.')
      return
    }
    setThemeId(id)
    onToast(`Vzhled „${nazev}“ nastaven ✓`)
  }

  const vybratRamecek = (id: string | null, vip: boolean, nazev: string) => {
    if (vip && !smiPremium) {
      onToast('Tenhle rámeček je jen pro VIP.')
      return
    }
    updateProfile({ frameId: id })
    onToast(id ? `Rámeček „${nazev}“ nastaven ✓` : 'Rámeček zrušen ✓')
  }

  return (
    <>
      {/* Vzhled aplikace — 5 barevných palet, 3 volné a 2 pro VIP (viz
          core/theme/themes.ts). Karta jen vykresluje VSECHNY_VZHLEDY —
          přidat šestý vzhled znamená dopsat ho tam, ne sem. */}
      <section className="settings-card">
        <button
          type="button"
          className="settings-accordion-hlava"
          onClick={() => setOtevrenoVzhled((v) => !v)}
          aria-expanded={otevrenoVzhled}
        >
          <span
            className="settings-card-icon"
            style={{ background: 'linear-gradient(135deg, #a855f7, #f5c451)' }}
            aria-hidden="true"
          >
            🎨
          </span>
          <div>
            <h2 className="settings-card-title">Vzhled aplikace</h2>
            <p className="settings-card-sub">5 barevných vzhledů — 3 volně, 2 jen pro VIP</p>
          </div>
          <span className={`settings-accordion-sipka ${otevrenoVzhled ? 'je-otevreno' : ''}`} aria-hidden="true">
            ›
          </span>
        </button>

        {otevrenoVzhled && (
          <div className="settings-theme-grid">
            {VSECHNY_VZHLEDY.map((tema) => {
              const zamceno = tema.vip && !smiPremium
              const aktivni = tema.id === themeId

              return (
                <button
                  key={tema.id}
                  className={`settings-theme-card ${aktivni ? 'is-aktivni' : ''} ${zamceno ? 'je-zamceno' : ''}`}
                  onClick={() => vybratVzhled(tema.id, tema.vip, tema.nazev)}
                >
                  <div
                    className="settings-theme-swatch"
                    style={{
                      background: `linear-gradient(135deg, ${tema.bgPanel}, ${tema.bgPanelRaised})`,
                      borderColor: tema.borderStrong,
                    }}
                  >
                    <span className="settings-theme-dot" style={{ background: tema.accentCyan }} />
                    <span className="settings-theme-dot" style={{ background: tema.accentViolet }} />
                    <span className="settings-theme-dot" style={{ background: tema.accentMagenta }} />

                    {tema.vip && (
                      <span className="settings-theme-vip">{zamceno ? '🔒' : '👑'} VIP</span>
                    )}
                    {aktivni && <span className="settings-theme-check">✓</span>}
                  </div>

                  <span className="settings-theme-nazev">
                    {tema.ikona} {tema.nazev}
                  </span>
                  <span className="settings-theme-popis">{tema.popis}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Rámeček avataru — pevná paleta místo barvy podle id, viz
          social/avatarFrames.ts. Stejná mřížka jako Vzhled aplikace výš,
          jen náhled je kruh (jak rámeček doopravdy vypadá), ne obdélník. */}
      <section className="settings-card">
        <button
          type="button"
          className="settings-accordion-hlava"
          onClick={() => setOtevrenoRamecek((v) => !v)}
          aria-expanded={otevrenoRamecek}
        >
          <span
            className="settings-card-icon"
            style={{ background: 'linear-gradient(135deg, #7dd3fc, #fbbf24)' }}
            aria-hidden="true"
          >
            🖼️
          </span>
          <div>
            <h2 className="settings-card-title">Rámeček avataru</h2>
            <p className="settings-card-sub">Pevná barva prstenu místo té podle jména — 2 volně, 2 jen pro VIP</p>
          </div>
          <span className={`settings-accordion-sipka ${otevrenoRamecek ? 'je-otevreno' : ''}`} aria-hidden="true">
            ›
          </span>
        </button>

        {otevrenoRamecek && (
          <div className="settings-theme-grid">
            <button
              className={`settings-theme-card ${profile.frameId === null ? 'is-aktivni' : ''}`}
              onClick={() => vybratRamecek(null, false, 'Výchozí')}
            >
              <div className="settings-ramecek-nahled" style={{ background: 'var(--bg-panel-raised)' }}>
                {profile.frameId === null && <span className="settings-theme-check">✓</span>}
              </div>
              <span className="settings-theme-nazev">Výchozí</span>
              <span className="settings-theme-popis">Barva prstenu podle jména</span>
            </button>

            {AVATAR_FRAMES.map((ramecek) => {
              const zamceno = ramecek.vip && !smiPremium
              const aktivni = ramecek.id === profile.frameId

              return (
                <button
                  key={ramecek.id}
                  className={`settings-theme-card ${aktivni ? 'is-aktivni' : ''} ${zamceno ? 'je-zamceno' : ''}`}
                  onClick={() => vybratRamecek(ramecek.id, ramecek.vip, ramecek.nazev)}
                >
                  <div
                    className="settings-ramecek-nahled"
                    style={{ background: `conic-gradient(from 0deg, ${ramecek.a}, ${ramecek.b}, ${ramecek.a})` }}
                  >
                    {ramecek.vip && <span className="settings-theme-vip">{zamceno ? '🔒' : '👑'} VIP</span>}
                    {aktivni && <span className="settings-theme-check">✓</span>}
                  </div>
                  <span className="settings-theme-nazev">{ramecek.nazev}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

export default VzhledARamecekSekce
