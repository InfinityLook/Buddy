import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBottomNav } from '@/components/AppBottomNav'
import { BuddyHeader } from '@/components/buddy-ui/BuddyHeader'
import { themeAssetUrl, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import { SocialIcon } from '@/social/components/SocialIcon'
import { LibraryShelf } from './components/LibraryShelf'
import { LibraryDetail } from './components/LibraryDetail'
import { UkazkaCtecka } from './components/UkazkaCtecka'
import { useLibraryKatalog } from './useLibraryKatalog'
import { useLibraryShelf } from './useLibraryShelf'
import { filtrovatKatalog, type FiltrKatalogu, type KatalogDilo } from './libraryTypes'
import './LibraryModule.css'

// ==========================================
// Library — katalog knih a komiksů. Vzhled drží stejný jako zbytek appky:
// motiv a pozadí bere z "hub" surface (stejné jako Hub, ze kterého se sem
// vstupuje paprskem "Library"), hlavička je sdílená BuddyHeader a dole je
// AppBottomNav. Uprostřed je posuvná police, detail vybraného díla a
// osobní "Moje police". Čtení celých děl přijde v další fázi; ukázkové
// tituly jdou přelistovat hned.
// ==========================================

const FILTRY: ReadonlyArray<{ id: FiltrKatalogu; label: string }> = [
  { id: 'vse', label: 'Vše' },
  { id: 'kniha', label: 'Knihy' },
  { id: 'komiks', label: 'Komiksy' },
  { id: 'scenar', label: 'Scénáře' },
  { id: 'police', label: 'Moje police' },
]

export default function LibraryModule() {
  const navigate = useNavigate()
  const { rootAttributes, variant } = useSurfaceAppearance('hub')
  const { dila, nacitani, ukazkovyRezim } = useLibraryKatalog()
  const policeIds = useLibraryShelf((s) => s.ids)
  const prepnout = useLibraryShelf((s) => s.prepnout)
  const police = useMemo(() => new Set(policeIds), [policeIds])

  const [filtr, setFiltr] = useState<FiltrKatalogu>('vse')
  const [vybraneId, setVybraneId] = useState<string | null>(null)
  const [cte, setCte] = useState<KatalogDilo | null>(null)
  const [stav, setStav] = useState('')
  const otevritRef = useRef<HTMLButtonElement>(null)
  const prohlizetRef = useRef<HTMLButtonElement>(null)
  const vratitFokus = useRef(false)

  const filtry = useMemo(
    () => FILTRY.filter((f) => f.id !== 'scenar' || dila.some((d) => d.druh === 'scenar')),
    [dila],
  )
  const zobrazena = useMemo(() => filtrovatKatalog(dila, filtr, police), [dila, filtr, police])
  const dilo = zobrazena.find((d) => d.id === vybraneId) ?? zobrazena[0]

  useEffect(() => {
    if (!cte && vratitFokus.current) {
      vratitFokus.current = false
      ;(otevritRef.current ?? prohlizetRef.current)?.focus({ preventScroll: true })
    }
  }, [cte, dilo])

  const zavritCtecku = () => {
    vratitFokus.current = true
    setCte(null)
  }

  const ulozit = (d: KatalogDilo) => {
    const naPolici = prepnout(d.id)
    setStav(naPolici ? 'Uloženo na mou polici.' : 'Odebráno z mé police.')
    if (!naPolici && filtr === 'police' && policeIds.length <= 1) vratitFokus.current = true
  }

  const zmenitFiltr = (dalsi: FiltrKatalogu) => {
    if (dilo) setVybraneId(dilo.id)
    setFiltr(dalsi)
  }

  return (
    <div className="library-page buddy-library buddy-theme-scope" {...rootAttributes}>
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
          backLabel={cte ? 'Zpět na polici' : 'Zpět na Hub'}
          onBack={cte ? zavritCtecku : () => navigate('/hub')}
        />

        <main className="library-main" aria-label="Library" aria-busy={nacitani}>
          {cte ? (
            <UkazkaCtecka key={cte.id} book={cte} onBack={zavritCtecku} />
          ) : nacitani ? (
            <section className="library-empty">
              <h2>Načítám knihovnu…</h2>
            </section>
          ) : (
            <>
              <nav className="library-filters" aria-label="Kategorie knihovny">
                {filtry.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    className="library-filter"
                    data-filter={id}
                    aria-pressed={filtr === id}
                    onClick={() => zmenitFiltr(id)}
                  >
                    {id === 'police' && (
                      <span aria-hidden="true">
                        <SocialIcon name="bookmark" size={14} />
                      </span>
                    )}
                    {label}
                  </button>
                ))}
              </nav>
              {ukazkovyRezim && (
                <p className="library-banner" role="note">
                  Zatím jsou tu jen ukázkové tituly. Knihy a komiksy z katalogu přibudou po schválení.
                </p>
              )}
              {dilo ? (
                <>
                  <LibraryShelf
                    key={filtr}
                    books={zobrazena}
                    selectedId={dilo.id}
                    onSelect={setVybraneId}
                    onOpen={(d) => (d.ukazka ? setCte(d) : setVybraneId(d.id))}
                  />
                  <LibraryDetail
                    dilo={dilo}
                    naPolici={police.has(dilo.id)}
                    onUlozit={() => ulozit(dilo)}
                    onOtevrit={() => setCte(dilo)}
                    otevritRef={otevritRef}
                  />
                </>
              ) : (
                <section className="library-empty">
                  <span aria-hidden="true">
                    <SocialIcon name="bookmark" size={26} />
                  </span>
                  <h2>{filtr === 'police' ? 'Tvoje police je zatím prázdná' : 'V téhle kategorii zatím nic není'}</h2>
                  <p>{filtr === 'police' ? 'Uložená díla najdeš tady.' : 'Zkus jinou kategorii.'}</p>
                  <button
                    type="button"
                    ref={prohlizetRef}
                    className="library-secondary"
                    onClick={() => {
                      setFiltr('vse')
                      vratitFokus.current = true
                    }}
                  >
                    Prohlédnout vše
                  </button>
                </section>
              )}
            </>
          )}
          <span className="library-status" role="status">{stav}</span>
        </main>

        <AppBottomNav />
      </div>
    </div>
  )
}
