import React from 'react'
import { AppIcon } from './AppIcon'

interface AppToolbarProps {
  searchQuery: string
  setSearchQuery: (q: string) => void
  activeCategory: string
  setActiveCategory: (cat: string) => void
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
}

const categories = ['Všechny', 'Produktivita', 'Vzdělávání', 'Nástroje', 'Zábava', 'Ostatní']

export const AppToolbar: React.FC<AppToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  viewMode,
  setViewMode,
}) => (
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
      </div>

      <button className="app-filter-btn">
        <AppIcon name="filter" size={16} />
        <span>Třídit</span>
      </button>

      <div className="app-view-toggle">
        <button
          className={`app-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => setViewMode('grid')}
          aria-label="Mřížka"
        >
          <AppIcon name="grid" size={18} />
        </button>
        <button
          className={`app-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
          aria-label="Seznam"
        >
          <AppIcon name="list" size={18} />
        </button>
      </div>
    </div>

    <div className="app-categories-row">
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
  </div>
)
