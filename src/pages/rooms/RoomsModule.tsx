import { useRef, useState, type PointerEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppBottomNav } from '@/components/AppBottomNav'
import { BuddyHeader } from '@/components/buddy-ui/BuddyHeader'
import { useAppStore } from '@/core/store/useAppStore'
import { themeAssetUrl, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import { SURFACES, THEME_FAMILIES, THEME_IDS, isSurfaceId, type BuddyThemeId } from '@/features/appearance/themeCatalog'
import { useAppearanceStore } from '@/features/appearance/useAppearanceStore'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { melByPotvrditTazeni, zacykliIndex } from '@/pages/app/components/roomCarouselMath'
import { ProfilNotifications, useNotificationItems } from '@/pages/profil/components/ProfilNotifications'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import '@/pages/profil/ProfilModule.css'
import './RoomsModule.css'

const roomDetails: Record<string, { label: string; category: string; tools: string; photo?: string }> = {
  'school-room': { label: 'School', category: 'Studium', tools: 'Rozvrh · Kalendář · Plánovač' },
  'fitness-room': { label: 'Fitness', category: 'Pohyb a kondice', tools: 'Posilovna · Běhání · Pitný režim' },
  'economy-room': { label: 'Economy', category: 'Osobní finance', tools: 'Finance · Spoření · Splátky' },
  'growth-room': { label: 'Growth', category: 'Osobní rozvoj', tools: 'Goal Tracker · Soubory' },
  'music-room': { label: 'Music', category: 'Hudební tvorba', tools: 'Music Studio', photo: '/buddy-themes/rooms/music-room.webp' },
  'writer-room': { label: 'Writer’s', category: 'Psaní a příběhy', tools: 'Kniha · Scénář · Komiks', photo: '/buddy-themes/rooms/writer-room.webp' },
}

export default function RoomsModule() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const apps = useAppStore(state => state.apps)
  const { profile, markNotificationRead } = useProfileData()
  const notifications = useNotificationItems()
  const { themeId, scenery, rootAttributes } = useSurfaceAppearance('apps-launcher')
  const globalThemeId = useAppearanceStore(state => state.globalThemeId)
  const setGlobalTheme = useAppearanceStore(state => state.setGlobalTheme)
  const [previewTheme, setPreviewTheme] = useState<BuddyThemeId | null>(null)
  const [selectedId, setSelectedId] = useState<string | undefined>(() =>
    typeof state?.selectedRoom === 'string' ? state.selectedRoom : undefined
  )
  const [notifOpen, setNotifOpen] = useState(false)
  const themeMenu = useRef<HTMLDetailsElement>(null)
  const themeButton = useRef<HTMLElement>(null)
  const drag = useRef<{ id: number; x: number; y: number } | null>(null)

  const activeTheme = previewTheme ?? themeId
  const theme = THEME_FAMILIES[activeTheme]
  const backgrounds = SURFACES['apps-launcher'].variants[activeTheme].assets
  const rooms = apps.filter(app => app.route)
  const index = Math.max(0, rooms.findIndex(room => room.id === selectedId))
  const room = rooms[index]
  const roomSurfaceId = isSurfaceId(room?.id) ? room.id : 'school-room'
  const { themeId: roomThemeId } = useSurfaceAppearance(roomSurfaceId)
  const details = room && roomDetails[room.id]
  const photo = details?.photo ?? room?.nahled
  const unread = notifications.filter(item => !profile.readNotifications.includes(item.id)).length

  function step(direction: number) {
    const next = rooms[zacykliIndex(index + direction, rooms.length)]
    if (next) setSelectedId(next.id)
  }

  function startDrag(event: PointerEvent<HTMLElement>) {
    if (
      rooms.length < 2 || !event.isPrimary || event.button !== 0 ||
      (event.target as Element).closest('button')
    ) return

    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.dataset.dragging = 'true'
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    if (drag.current?.id !== event.pointerId) return
    const offset = Math.max(-28, Math.min(28, (event.clientX - drag.current.x) * 0.25))
    event.currentTarget.style.setProperty('--rooms-drag', `${offset}px`)
  }

  function endDrag(event: PointerEvent<HTMLElement>, cancelled = false) {
    const start = drag.current
    if (!start || start.id !== event.pointerId) return

    drag.current = null
    delete event.currentTarget.dataset.dragging
    event.currentTarget.style.removeProperty('--rooms-drag')
    const delta = event.clientX - start.x
    const vertical = event.clientY - start.y
    if (!cancelled && Math.abs(delta) > Math.abs(vertical) && melByPotvrditTazeni(delta)) {
      step(delta < 0 ? 1 : -1)
    }
  }

  function closeThemeMenu() {
    if (themeMenu.current) themeMenu.current.open = false
    themeButton.current?.focus()
  }

  function enterRoom() {
    if (!room?.route) return
    const { setActiveAppId, markAppOpened } = useAppStore.getState()
    setActiveAppId(null)
    markAppOpened(room.id)
    navigate(room.route)
  }

  return (
    <div className="rooms-page buddy-theme-scope" {...rootAttributes} data-buddy-theme={activeTheme}>
      <picture key={activeTheme} className="rooms-scene" aria-hidden="true">
        <source media="(orientation: landscape)" srcSet={themeAssetUrl(
          scenery ? theme.assets.sceneTablet : backgrounds.backgroundTablet
        )} />
        <img alt="" decoding="async" src={themeAssetUrl(
          scenery ? theme.assets.sceneMobile : backgrounds.backgroundMobile
        )} onError={event => { event.currentTarget.hidden = true }} />
      </picture>

      <div className="rooms-shell">
        <BuddyHeader
          className="rooms-top"
          title="Rooms"
          backLabel="Zpět na Hub"
          onBack={() => navigate('/hub')}
          actions={
            <>
              <details
                ref={themeMenu}
                className="rooms-themes"
                onBlur={event => {
                  if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false
                }}
                onKeyDown={event => {
                  if (event.key === 'Escape' && event.currentTarget.open) {
                    event.preventDefault()
                    closeThemeMenu()
                  }
                }}
              >
                <summary
                  ref={themeButton}
                  className="buddy-ui-button"
                  aria-label={`Motiv Rooms – ${theme.name}${previewTheme ? ' (náhled)' : ''}`}
                >
                  <span className="rooms-swatch" aria-hidden="true" />
                  <span className="rooms-theme-name">{theme.name}</span>
                </summary>
                <div className="rooms-theme-menu">
                  <p className="rooms-theme-status" role="status">
                    {previewTheme ? `Náhled: ${theme.name}` : `Motiv aplikace: ${THEME_FAMILIES[globalThemeId].name}`}
                  </p>
                  <div className="rooms-theme-list" role="group" aria-label="Náhled motivu">
                    {THEME_IDS.map(id => (
                      <button
                        key={id}
                        type="button"
                        className="buddy-ui-button"
                        aria-pressed={activeTheme === id}
                        onClick={() => setPreviewTheme(id)}
                      >
                        {THEME_FAMILIES[id].name}
                      </button>
                    ))}
                  </div>
                  {previewTheme && (
                    <div className="rooms-theme-actions">
                      <button type="button" className="buddy-ui-button buddy-ui-button--primary" onClick={() => {
                        setGlobalTheme(previewTheme)
                        setPreviewTheme(null)
                        closeThemeMenu()
                      }}>
                        Použít v celé aplikaci
                      </button>
                      <button type="button" className="buddy-ui-button" onClick={() => {
                        setPreviewTheme(null)
                        closeThemeMenu()
                      }}>
                        Zrušit náhled
                      </button>
                    </div>
                  )}
                </div>
              </details>
              <button
                type="button"
                className="buddy-ui-button buddy-ui-button--icon"
                aria-label={unread ? `Upozornění, nepřečtených ${unread}` : 'Upozornění'}
                onClick={() => setNotifOpen(true)}
              >
                <AppIcon name="bell" />
                {unread > 0 && <span className="rooms-unread" aria-hidden="true" />}
              </button>
            </>
          }
        />

        <main className="rooms-main" aria-label="Výběr místnosti">
          {room ? (
            <>
              <section className="rooms-hero buddy-theme-scope" data-buddy-theme={previewTheme ?? roomThemeId} aria-label="Náhled místnosti"
                onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={event => endDrag(event)}
                onPointerCancel={event => endDrag(event, true)}
                onLostPointerCapture={event => endDrag(event, true)}>
                {photo && (
                  <div className="rooms-art" aria-hidden="true">
                    <img key={photo} src={themeAssetUrl(photo)} alt="" draggable={false} decoding="async"
                      onError={event => { event.currentTarget.hidden = true }} />
                  </div>
                )}
                {rooms.length > 1 && (
                  <div className="rooms-arrows">
                    <button type="button" className="rooms-icon buddy-ui-button buddy-ui-button--icon" aria-label="Předchozí místnost"
                      onClick={() => step(-1)}><AppIcon name="arrow-left" /></button>
                    <button type="button" className="rooms-icon buddy-ui-button buddy-ui-button--icon" aria-label="Další místnost"
                      onClick={() => step(1)}><AppIcon name="arrow-right" /></button>
                  </div>
                )}
                <div className="rooms-caption" aria-live="polite" aria-atomic="true">
                  <div key={room.id}>
                    <span>{details?.category ?? room.category}</span>
                    <h2>{room.title}</h2>
                    {details && <p>{details.tools}</p>}
                  </div>
                </div>
              </section>

              <button type="button" className="rooms-enter buddy-ui-button buddy-ui-button--primary" onClick={enterRoom}>
                <span>Vstoupit do místnosti</span><AppIcon name="arrow-right" />
              </button>

              <section className="rooms-index" aria-labelledby="rooms-index-title">
                <h2 id="rooms-index-title">Všechny místnosti</h2>
                <div className="rooms-tiles">
                  {rooms.map(item => (
                    <button key={item.id} type="button" className="buddy-ui-button" aria-label={item.title}
                      aria-pressed={item.id === room.id} onClick={() => setSelectedId(item.id)}>
                      <AppIcon name={item.icon} size={19} />
                      <span>{roomDetails[item.id]?.label ?? item.title}</span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : <p>Zatím tu nejsou žádné místnosti.</p>}
        </main>

        <AppBottomNav />
        {notifOpen && (
          <div className="rooms-notifications">
            <ProfilNotifications callerId="apps-launcher" open readIds={profile.readNotifications}
              onMarkRead={markNotificationRead} onClose={() => setNotifOpen(false)} />
          </div>
        )}
      </div>
    </div>
  )
}
