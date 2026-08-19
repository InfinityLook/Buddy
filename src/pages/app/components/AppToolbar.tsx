import React, { useEffect, useRef, useState } from 'react'
import { AppIcon } from './AppIcon'
import { SORT_LABELS, SortMode, ViewMode } from '@/core/store/useAppStore'

// Pseudokategorie — nefiltruje podle pole `category`, ale podle příznaku
// oblíbenosti. Drží se tady, ať ji AppModule i toolbar poznají podle
// jednoho jména a nerozejdou se v překlepu.
export const FAVORITES_CATEGORY = 'Oblíbené'
export const ALL_CATEGORIES = 'Všechny'

const SORT_ORDER: SortMode[] = ['favorites', 'name', 'category', 'recent']

interface AppToolbarProps {
  searchQuery: string
  setSearchQuery: (q: string) => void
  activeCategory: string
  setActiveCategory: (cat: string) => void
  // Kategorie odvozené ze skutečných dlaždic — prázdná kategorie
  // se tak v liště vůbec neobjeví.
  categories: string[]
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  sortMode: SortMode
  setSortMode: (mode: SortMode) => void
  hiddenCount: number
  showHidden: boolean
  toggleShowHidden: () => void
  resultCount: number
  totalCount: number
}

export const AppToolbar: React.FC<AppToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  categories,
  viewMode,
  setViewMode,
  sortMode,
  setSortMode,
  hiddenCount,
  showHidden,
  toggleShowHidden,
  resultCount,
  totalCount,
}) => {
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  // Zavření nabídky klepnutím mimo ni — stejný vzorec jako menu
  // v textovém editoru, ať se appka chová všude stejně.
  useEffect(() => {
    if (!sortOpen) return

    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [sortOpen])

  return (
    <div className="app-toolbar-section">
      <div className="app-toolbar-top">
        <div className="app-search-box">
          <AppIcon name="search" size={18} className="app-search-icon" />
          <input
            type="text"
            placeholder="Hledej aplikaci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="app-search-clear"
              aria-label="Vymazat hledání"
              onClick={() => setSearchQuery('')}
            >
              <AppIcon name="x" size={14} />
            </button>
          )}
        </div>

        <div className="app-sort-wrap" ref={sortRef}>
          <button
            className={`app-filter-btn ${sortOpen ? 'is-open' : ''}`}
            onClick={() => setSortOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={sortOpen}
          >
            <AppIcon name="filter" size={16} />
            <span>Třídit</span>
          </button>

          {sortOpen && (
            <div className="app-sort-menu" role="menu">
              <span className="app-sort-menu-head">Seřadit podle</span>
              {SORT_ORDER.map((mode) => (
                <button
                  key={mode}
                  role="menuitemradio"
                  aria-checked={sortMode === mode}
                  className={`app-sort-option ${sortMode === mode ? 'is-active' : ''}`}
                  onClick={() => {
                    setSortMode(mode)
                    setSortOpen(false)
                  }}
                >
                  <span>{SORT_LABELS[mode]}</span>
                  {sortMode === mode && <AppIcon name="check" size={15} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="app-view-toggle">
          <button
            className={`app-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Mřížka"
            aria-pressed={viewMode === 'grid'}
          >
            <AppIcon name="grid" size={18} />
          </button>
          <button
            className={`app-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            aria-label="Seznam"
            aria-pressed={viewMode === 'list'}
          >
            <AppIcon name="list" size={18} />
          </button>
        </div>
      </div>

      <div className="app-categories-row">
        <button
          className={`app-category-pill ${activeCategory === ALL_CATEGORIES ? 'active' : ''}`}
          onClick={() => setActiveCategory(ALL_CATEGORIES)}
        >
          {ALL_CATEGORIES}
        </button>

        <button
          className={`app-category-pill is-favorite ${activeCategory === FAVORITES_CATEGORY ? 'active' : ''}`}
          onClick={() => setActiveCategory(FAVORITES_CATEGORY)}
        >
          <AppIcon name="star-filled" size={13} />
          {FAVORITES_CATEGORY}
        </button>

        {categories.map((cat) => (
          <button
            key={cat}
            className={`app-category-pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="app-toolbar-meta">
        <span className="app-result-count">
          {resultCount === totalCount
            ? `${totalCount} aplikací`
            : `Zobrazeno ${resultCount} z ${totalCount}`}
        </span>

        {hiddenCount > 0 && (
          <button
            className={`app-hidden-chip ${showHidden ? 'is-on' : ''}`}
            onClick={toggleShowHidden}
          >
            <AppIcon name={showHidden ? 'eye-off' : 'eye'} size={14} />
            {showHidden ? 'Schovat skryté' : `Zobrazit skryté (${hiddenCount})`}
          </button>
        )}
      </div>
    </div>
  )
}
