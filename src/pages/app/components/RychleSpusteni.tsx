import { useRef, useState } from 'react'
import { AppIcon } from './AppIcon'
import { normalizeText } from '@/core/utils/text'
import type { AppItem } from '@/core/store/useAppStore'
import './RychleSpusteni.css'

interface RychleSpusteniProps {
  miniaplikace: AppItem[]
  onOpen: (id: string) => void
}

export function RychleSpusteni({ miniaplikace, onOpen }: RychleSpusteniProps) {
  const [dotaz, setDotaz] = useState('')
  const search = useRef<HTMLInputElement>(null)
  const query = normalizeText(dotaz.trim())
  const skupiny = new Map<string, AppItem[]>()

  for (const app of miniaplikace) {
    if (!normalizeText(app.title).includes(query) && !normalizeText(app.category).includes(query)) continue
    const group = skupiny.get(app.category)
    if (group) group.push(app)
    else skupiny.set(app.category, [app])
  }

  return (
    <section className="rs-section" aria-label="Katalog aplikací">
      <div className="rs-search-box buddy-ui-card">
        <span aria-hidden="true"><AppIcon name="search" size={19} /></span>
        <input
          ref={search}
          className="buddy-ui-input"
          type="search"
          aria-label="Hledat aplikaci"
          placeholder="Hledat aplikaci nebo kategorii…"
          value={dotaz}
          onChange={event => setDotaz(event.target.value)}
        />
        {dotaz && (
          <button
            type="button"
            className="buddy-ui-button buddy-ui-button--icon"
            aria-label="Vymazat hledání"
            onClick={() => { setDotaz(''); search.current?.focus() }}
          >
            <AppIcon name="x" size={17} />
          </button>
        )}
      </div>

      {skupiny.size === 0 && (
        <p className="rs-prazdno buddy-ui-card buddy-ui-status" role="status">
          {query ? `Pro „${dotaz.trim()}“ se nenašla žádná aplikace.` : 'Zatím tu nejsou žádné aplikace.'}
        </p>
      )}

      {Array.from(skupiny, ([kategorie, apps]) => (
        <section key={kategorie} className="rs-skupina">
          <h2>{kategorie}</h2>
          <div className="rs-mrizka">
            {apps.map(app => (
              <button
                key={app.id}
                type="button"
                className="buddy-ui-button rs-dlazdice"
                onClick={() => onOpen(app.id)}
              >
                <span className={`rs-dlazdice-ikona ${app.color}`} aria-hidden="true">
                  <AppIcon name={app.icon} size={20} />
                </span>
                <span>{app.title}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </section>
  )
}
