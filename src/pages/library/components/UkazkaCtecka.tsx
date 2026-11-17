import { useEffect, useRef, useState } from 'react'
import { themeAssetUrl } from '@/features/appearance/SurfaceAppearance'
import type { KatalogDilo } from '../libraryTypes'

interface Props {
  book: KatalogDilo
  onBack: () => void
}

export function UkazkaCtecka({ book, onBack }: Props) {
  const [page, setPage] = useState(0)
  const paper = useRef<HTMLElement>(null)
  const back = useRef<HTMLButtonElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const stranky = book.ukazka ?? ['']
  const comic = book.druh === 'komiks'

  useEffect(() => { back.current?.focus({ preventScroll: true }) }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const turn = paper.current?.animate(
      [
        { transform: 'perspective(850px) rotateY(-32deg)', opacity: .6 },
        { transform: 'perspective(850px) rotateY(0deg)', opacity: 1 },
      ],
      { duration: 290, easing: 'cubic-bezier(.22,.68,.35,1)' },
    )
    return () => turn?.cancel()
  }, [page])

  const step = (direction: number) => {
    setPage(current => Math.max(0, Math.min(current + direction, stranky.length - 1)))
  }

  return (
    <section className="library-reader" aria-label="Ukázka knihy" onKeyDown={event => {
      if (event.key === 'Escape') onBack()
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        step(event.key === 'ArrowRight' ? 1 : -1)
      }
    }}>
      <button type="button" ref={back} className="library-secondary" onClick={onBack}>← Zpět na polici</button>
      <article ref={paper} className="library-paper" data-comic={comic} data-page={page}
        onPointerDown={event => {
          if (event.isPrimary && event.pointerType === 'touch') touchStart.current = { x: event.clientX, y: event.clientY }
        }}
        onPointerCancel={() => { touchStart.current = null }}
        onPointerUp={event => {
          const start = touchStart.current
          touchStart.current = null
          if (!start || !event.isPrimary || event.pointerType !== 'touch') return
          const dx = event.clientX - start.x
          if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(event.clientY - start.y) * 1.5) step(dx < 0 ? 1 : -1)
        }}>
        <span className="library-reader-type">{comic ? 'Komiksová ukázka' : 'Ukázka'}</span>
        <h2>{book.title}</h2>
        {comic && book.coverUrl
          ? <img className="library-comic-panel" src={themeAssetUrl(book.coverUrl ?? '')} alt="" />
          : <div className="library-rule" aria-hidden="true" />}
        <p>{stranky[page]}</p>
      </article>
      <nav className="library-pager" aria-label="Listování ukázkou">
        <button type="button" className="library-icon-button" aria-disabled={page === 0}
          onClick={() => step(-1)} aria-label="Předchozí strana">‹</button>
        <span className="library-position" aria-live="polite">{page + 1} / {stranky.length}</span>
        <button type="button" className="library-icon-button" aria-disabled={page === stranky.length - 1}
          onClick={() => step(1)} aria-label="Další strana">›</button>
      </nav>
    </section>
  )
}
