import { useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { themeAssetUrl } from '@/features/appearance/SurfaceAppearance'
import { druhDilaNazev, type KatalogDilo } from '../libraryTypes'

interface Props {
  books: readonly KatalogDilo[]
  selectedId: string
  onSelect: (id: string) => void
  onOpen: (book: KatalogDilo) => void
}

interface Drag {
  id: number
  x: number
  left: number
  moved: boolean
}

function offsetFor(track: HTMLDivElement, index: number) {
  const card = track.children.item(index) as HTMLElement | null
  return card ? card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2 : track.scrollLeft
}

function nearestIndex(track: HTMLDivElement) {
  let index = 0
  let distance = Infinity
  for (let i = 0; i < track.children.length; i++) {
    const candidate = Math.abs(track.scrollLeft - offsetFor(track, i))
    if (candidate < distance) {
      index = i
      distance = candidate
    }
  }
  return index
}

export function LibraryShelf({ books, selectedId, onSelect, onOpen }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const blockClick = useRef(0)
  const frame = useRef<number | null>(null)
  const selection = useRef(selectedId)
  const selectedIndex = Math.max(0, books.findIndex(book => book.id === selectedId))

  useLayoutEffect(() => {
    selection.current = selectedId
  }, [selectedId])

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return

    const recenter = () => {
      if (!track.clientWidth || drag.current?.moved) return
      track.scrollLeft = offsetFor(track, Math.max(0, books.findIndex(book => book.id === selection.current)))
    }

    recenter()
    const observer = new ResizeObserver(recenter)
    observer.observe(track)
    return () => {
      observer.disconnect()
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
    }
  }, [books])

  const select = (index: number) => {
    const book = books[index]
    if (book && book.id !== selection.current) {
      selection.current = book.id
      onSelect(book.id)
    }
  }

  const moveTo = (index: number) => {
    const track = trackRef.current
    if (!track || !books[index]) return
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    track.scrollTo({ left: offsetFor(track, index), behavior })
    select(index)
  }

  const handleScroll = () => {
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      const track = trackRef.current
      if (track?.clientWidth) select(nearestIndex(track))
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const target = selectedIndex + (event.key === 'ArrowRight' ? 1 : -1)
    moveTo(target)
    const card = trackRef.current?.children.item(target) as HTMLElement | null
    card?.focus({ preventScroll: true })
  }

  const beginDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    drag.current = { id: event.pointerId, x: event.clientX, left: event.currentTarget.scrollLeft, moved: false }
  }

  const updateDrag = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || event.pointerId !== state.id || !event.buttons) return
    const distance = event.clientX - state.x
    if (!state.moved && Math.abs(distance) < 8) return
    if (!state.moved) {
      state.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
      event.currentTarget.classList.add('library-is-dragging')
    }
    event.currentTarget.scrollLeft = state.left - distance
  }

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || event.pointerId !== state.id) return
    drag.current = null
    if (state.moved) {
      const index = nearestIndex(event.currentTarget)
      blockClick.current = Date.now() + 180
      event.currentTarget.classList.remove('library-is-dragging')
      moveTo(index)
    }
  }

  return (
    <>
      <section className="library-shelf" aria-label="Posuvná police s knihami">
        <div className="library-orbit" aria-hidden="true" />
        <div ref={trackRef} className="library-track" onScroll={handleScroll} onKeyDown={handleKeyDown}
          onPointerDown={beginDrag} onPointerMove={updateDrag} onPointerUp={finishDrag}
          onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}>
          {books.map((book, index) => (
            <button type="button" className="library-cover" key={book.id}
              tabIndex={index === selectedIndex ? 0 : -1}
              aria-current={index === selectedIndex ? 'true' : undefined}
              data-side={index < selectedIndex ? 'left' : index > selectedIndex ? 'right' : 'center'}
              style={{ '--cover-foil': book.foil } as CSSProperties}
              onClick={event => {
                if (event.detail && Date.now() < blockClick.current) return
                if (book.id === selection.current) onOpen(book)
                else moveTo(index)
              }}>
              <span className="library-cover-inner">
                {book.coverUrl && <img src={book.coverUrl.startsWith('http') ? book.coverUrl : themeAssetUrl(book.coverUrl)} alt="" draggable={false} loading="lazy" />}
                <span className="library-cover-type">{druhDilaNazev(book.druh)}</span>
                <span className="library-cover-title">{book.title}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
      <nav aria-label="Posun police" className="library-pager">
        <button type="button" className="library-icon-button" aria-disabled={selectedIndex === 0}
          aria-label="Předchozí kniha" onClick={() => moveTo(selectedIndex - 1)}>‹</button>
        <span className="library-position" aria-live="polite">{selectedIndex + 1} / {books.length}</span>
        <button type="button" className="library-icon-button" aria-disabled={selectedIndex === books.length - 1}
          aria-label="Další kniha" onClick={() => moveTo(selectedIndex + 1)}>›</button>
      </nav>
    </>
  )
}
