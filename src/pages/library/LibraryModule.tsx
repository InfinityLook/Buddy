import { useNavigate } from 'react-router-dom'
import { AppBottomNav } from '@/components/AppBottomNav'
import { BuddyHeader } from '@/components/buddy-ui/BuddyHeader'
import { themeAssetUrl, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import './LibraryModule.css'

// ==========================================
// Library — základ nového modulu (zatím jen kostra stránky). Vzhled drží
// stejný jako zbytek appky: motiv a pozadí bere z "hub" surface (stejné
// jako Hub, ze kterého se sem vstupuje paprskem "Library"), hlavička je
// sdílená BuddyHeader a dole je AppBottomNav. Obsah modulu se doplní
// později — jediné místo, kam sahat, je <main className="library-main">.
// ==========================================

export default function LibraryModule() {
  const navigate = useNavigate()
  const { rootAttributes, variant } = useSurfaceAppearance('hub')

  return (
    <div className="library-page buddy-theme-scope" {...rootAttributes}>
      <picture className="library-scene" aria-hidden="true">
        <source media="(orientation: landscape)" srcSet={themeAssetUrl(variant.assets.backgroundTablet)} />
        <img
          alt=""
          decoding="async"
          src={themeAssetUrl(variant.assets.backgroundMobile)}
          onError={(event) => { event.currentTarget.hidden = true }}
        />
      </picture>

      <div className="library-shell">
        <BuddyHeader
          className="library-top"
          title="Library"
          icon="book"
          backLabel="Zpět na Hub"
          onBack={() => navigate('/hub')}
        />

        <main className="library-main" aria-label="Library">
          <section className="library-card buddy-ui-card">
            <h2>Knihovna se připravuje</h2>
            <p>Tady brzy přibude obsah.</p>
          </section>
        </main>

        <AppBottomNav />
      </div>
    </div>
  )
}
